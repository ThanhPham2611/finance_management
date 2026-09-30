"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vnToday } from "@/lib/format";
import { getExtendedAiContext, formatExtendedAiContext } from "@/lib/ai/context";
import { callClaude, MissingAiKeyError, type ClaudeMessage, type ClaudeToolDef } from "@/lib/ai/client";
import { listJarsWithSpent } from "@/lib/queries/jars";
import { computeLoanAmortization } from "@/lib/loan";

export type ChatTurn = { role: "user" | "assistant"; text: string };

export type SendChatMessageResult = {
  error?: string;
  reply?: string;
  loggedTransaction?: { jarName: string; amount: number };
};

// Gioi han pham vi chu de — chan chatbot bi dung nhu 1 tro ly chung chung
// (hoi kien thuc, nho viet code, tam su...) vua sai muc dich app, vua ton
// token/chi phi khong can thiet. "Lien quan tai chinh" hieu RONG (vay von,
// lai suat, mua sam lon...) de van tra loi duoc cau hoi kieu "mua o to tra
// gop co on khong", khong chi bo trong pham vi cac hu trong app.
const SYSTEM_PROMPT =
  'Ban la tro ly tai chinh trong 1 app quan ly chi tieu ca nhan kieu "hu ngan sach". Nhiem vu: ' +
  '(1) Neu nguoi dung mo ta 1 khoan tien bang ngon ngu tu nhien (vd "an trua 50k", "mua ao 300k", "duoc tra 200k"), ' +
  'goi tool "log_transaction" de ghi lai. Khoan chi de direction="chi" (tru tien khoi hu). Khoan thu — luong, duoc cho, ban do — de direction="thu" (cong tien vao hu). ' +
  "Tu chon hu phu hop nhat trong danh sach hu hop le duoc cung cap " +
  "— neu khong chac hu nao phu hop, chon hu co ten gan nghia nhat va noi ro ly do trong note. " +
  '(2) Neu nguoi dung hoi ve 1 quyet dinh vay/mua sam lon co tra gop (vd "vay mua xe/nha co on khong", ' +
  '"tra gop X trieu lai Y%/nam trong Z nam thi sao"), LUON goi tool "evaluate_loan" de tinh CHINH XAC khoan ' +
  "tra hang thang truoc, KHONG tu tinh nham qua van ban — sau do danh gia dua tren du lieu thu nhap/tiet kiem " +
  "trung binh nhieu thang va cac khoan no hien tai duoc cung cap. Neu nguoi dung noi lai suat/ky han ma khong " +
  "ro don vi (theo nam hay theo thang), HOI LAI de xac nhan truoc khi tinh, vi ket qua khac nhau rat nhieu. " +
  "(3) Neu nguoi dung hoi ve tinh hinh tai chinh / xin loi khuyen chung, tra loi ngan gon bang van ban dua tren " +
  "du lieu duoc cung cap, KHONG bia so lieu. " +
  "(4) CHI tra loi cac cau hoi lien quan toi: cach dung app nay, tai chinh ca nhan cua nguoi dung (chi tieu, " +
  "ngan sach, thu nhap, tiet kiem, no, cac quyet dinh tai chinh nhu vay/mua sam), hoac cac phep tinh lien quan " +
  "(lai suat, tra gop, phan bo tien...). Neu nguoi dung hoi NGOAI pham vi nay (kien thuc chung, code, tam su, " +
  "tin tuc...), TU CHOI LICH SU va nhac day la tro ly tai chinh cua app, khong tra loi cau hoi do — khong co " +
  "gang tra loi mot phan nao ca. Luon tra loi bang tieng Viet, ngan gon, than thien.";

// Chi gui toi da N luot gan nhat cho AI — chan chi phi/token khong tang
// vo han khi 1 phien chat keo dai. Cac luot cu hon bi cat, khong luu lai.
const MAX_HISTORY_TURNS = 8;

const LOG_TRANSACTION_TOOL: ClaudeToolDef = {
  name: "log_transaction",
  description: "Ghi 1 giao dịch vào 1 hũ cá nhân. Chi trừ tiền khỏi hũ, thu cộng tiền vào hũ.",
  input_schema: {
    type: "object",
    properties: {
      jarName: { type: "string", description: "Tên hũ, phải khớp 1 trong danh sách hũ hợp lệ." },
      amount: { type: "number", description: "Số tiền VND, luôn dương." },
      note: { type: "string", description: "Ghi chú ngắn, ví dụ món gì." },
      direction: { type: "string", enum: ["chi", "thu"], description: "chi trừ tiền khỏi hũ (mặc định). thu cộng tiền vào hũ." },
    },
    required: ["jarName", "amount"],
  },
};

const EVALUATE_LOAN_TOOL: ClaudeToolDef = {
  name: "evaluate_loan",
  description:
    "Tính CHÍNH XÁC khoản trả góp hàng tháng cho 1 khoản vay MỚI (mua xe, mua nhà trả góp...). Luôn gọi tool này trước khi đánh giá 1 quyết định vay/mua sắm lớn, không tự tính nhẩm qua văn bản.",
  input_schema: {
    type: "object",
    properties: {
      itemDescription: { type: "string", description: "Mô tả ngắn thứ muốn mua, ví dụ 'ô tô 600 triệu'." },
      principal: { type: "number", description: "Số tiền vay, VND." },
      annualRatePct: {
        type: "number",
        description: "Lãi suất theo NĂM, đơn vị %. Nếu người dùng nói lãi theo tháng thì quy đổi sang năm (nhân 12) trước khi điền vào đây.",
      },
      termMonths: { type: "number", description: "Kỳ hạn vay, số THÁNG. Nếu người dùng nói theo năm thì quy đổi sang tháng (nhân 12)." },
    },
    required: ["principal", "annualRatePct", "termMonths"],
  },
};

/** Chatbot AI. Khong luu lich su hoi thoai vao DB (client tu giu state),
 * moi lan goi gui lai toi da MAX_HISTORY_TURNS luot gan nhat. Can
 * ANTHROPIC_API_KEY trong .env.local moi goi that duoc. */
export async function sendChatMessage(message: string, history: ChatTurn[]): Promise<SendChatMessageResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const text = message.trim();
  if (!text) return { error: "Chưa nhập gì cả." };

  const [ctx, jars] = await Promise.all([getExtendedAiContext(supabase), listJarsWithSpent(supabase)]);
  const personalJars = jars.filter((j) => !j.isShared);

  const recentHistory = history.slice(-MAX_HISTORY_TURNS);
  const messages: ClaudeMessage[] = [...recentHistory.map((h) => ({ role: h.role, content: h.text })), { role: "user", content: text }];

  // Tach lam 2 khoi: SYSTEM_PROMPT khong doi -> danh dau cache (lan sau doc
  // lai chi ~10% gia input); phan du lieu tai chinh/danh sach hu de rieng vi
  // thay doi theo tung nguoi/tung thang, khong cache duoc lau.
  const systemBlocks = [
    { text: SYSTEM_PROMPT, cache: true },
    {
      text:
        `Dữ liệu tài chính hiện tại:\n${formatExtendedAiContext(ctx)}\n\n` +
        `Danh sách hũ cá nhân hợp lệ cho log_transaction (dùng đúng tên này): ${personalJars.map((j) => j.name).join(", ") || "(chưa có hũ nào)"}`,
    },
  ];
  const tools = [LOG_TRANSACTION_TOOL, EVALUATE_LOAN_TOOL];

  try {
    const response = await callClaude({ system: systemBlocks, messages, tools });

    const toolUse = response.content.find((b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use");

    if (toolUse?.name === "log_transaction") {
      const input = toolUse.input as { jarName: string; amount: number; note?: string; direction?: string };
      const jar = personalJars.find((j) => j.name.trim().toLowerCase() === input.jarName.trim().toLowerCase());

      if (!jar) {
        return { reply: `AI muốn ghi vào hũ "${input.jarName}" nhưng không tìm thấy hũ này. Bạn thử nói rõ tên hũ có sẵn nhé.` };
      }
      if (!(input.amount > 0)) {
        return { reply: "AI đọc số tiền không hợp lệ, bạn thử nhập lại rõ số tiền nhé." };
      }

      const { error: insertError } = await supabase.from("transactions").insert({
        user_id: user.id,
        jar_id: jar.id,
        amount: input.amount,
        note: input.note?.trim() || null,
        type: input.direction === "thu" ? "deposit" : "expense",
        // Nhu createTransaction: ngay theo gio VN, khong de DB tu dien UTC.
        transaction_date: vnToday(),
      });
      if (insertError) return { error: insertError.message };

      revalidatePath("/");
      revalidatePath("/jars");
      revalidatePath(`/jars/${jar.id}`);
      revalidatePath("/transactions");
      revalidatePath("/reports");

      return {
        reply: `Đã ${input.direction === "thu" ? "thu" : "ghi"} ${input.amount.toLocaleString("vi-VN")}đ vào hũ "${jar.name}"${input.note ? ` (${input.note})` : ""}.`,
        loggedTransaction: { jarName: jar.name, amount: input.amount },
      };
    }

    if (toolUse?.name === "evaluate_loan") {
      const input = toolUse.input as { itemDescription?: string; principal: number; annualRatePct: number; termMonths: number };
      const result = computeLoanAmortization(input);

      // Vong tool-use 2 buoc: gui lai chinh xac cau tra loi cua model (echo
      // nguyen content, gom ca tool_use) + ket qua tinh toan qua tool_result,
      // roi hoi tiep 1 lan nua de model tong hop thanh cau tra loi van ban —
      // thay vi tin model tu tinh lai suat kep qua nhieu ky bang loi (de sai).
      const toolResultPayload = JSON.stringify({
        itemDescription: input.itemDescription ?? null,
        principal: input.principal,
        annualRatePct: input.annualRatePct,
        termMonths: input.termMonths,
        monthlyPayment: result.monthlyPayment,
        totalPaid: result.totalPaid,
        totalInterest: result.totalInterest,
      });

      const followUpMessages: ClaudeMessage[] = [
        ...messages,
        { role: "assistant", content: response.content },
        { role: "user", content: [{ type: "tool_result", tool_use_id: toolUse.id, content: toolResultPayload }] },
      ];

      try {
        const followUp = await callClaude({ system: systemBlocks, messages: followUpMessages, maxTokens: 700 });
        const textBlock = followUp.content.find((b): b is Extract<typeof b, { type: "text" }> => b.type === "text");
        return {
          reply:
            textBlock?.text ??
            `Khoản trả hàng tháng ước tính: ${result.monthlyPayment.toLocaleString("vi-VN")}đ/tháng (tổng lãi ${result.totalInterest.toLocaleString("vi-VN")}đ).`,
        };
      } catch {
        // Buoc tong hop loi khong nen lam mat luon ket qua da tinh duoc —
        // tra ve so tho thay vi bao loi trang.
        return {
          reply: `Khoản trả hàng tháng ước tính: ${result.monthlyPayment.toLocaleString("vi-VN")}đ/tháng, tổng lãi phải trả ~${result.totalInterest.toLocaleString("vi-VN")}đ trong ${input.termMonths} tháng.`,
        };
      }
    }

    const textBlock = response.content.find((b): b is Extract<typeof b, { type: "text" }> => b.type === "text");
    return { reply: textBlock?.text ?? "AI không trả lời được, thử lại sau." };
  } catch (err) {
    if (err instanceof MissingAiKeyError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Lỗi không xác định khi gọi AI." };
  }
}
