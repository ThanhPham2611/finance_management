"use server";

import { createClient } from "@/lib/supabase/server";
import { getAiContext, formatAiContext } from "@/lib/ai/context";
import { callClaude, MissingAiKeyError } from "@/lib/ai/client";

export type AiAllocationSuggestion = { jarName: string; pct: number };

export type SuggestAllocationResult = {
  error?: string;
  summary?: string;
  suggestions?: AiAllocationSuggestion[];
};

const SYSTEM_PROMPT =
  'Ban la tro ly tai chinh ca nhan cho 1 app quan ly chi tieu kieu "hu ngan sach". ' +
  "Dua tren ngan sach hien tai va lich su chi tieu thuc te (trung binh 3 thang gan nhat) cua nguoi dung, " +
  "de xuat lai % phan bo thu nhap vao TUNG hu ca nhan duoc liet ke (tong cac % PHAI dung 100). " +
  "Uu tien giu on dinh hu dang chi dung/gan dung ngan sach hien tai, va de xuat tang % cho hu nao " +
  "thuong xuyen chi vuot ngan sach hien tai so voi trung binh 3 thang. " +
  'Tra loi BANG CACH GOI TOOL "propose_allocation" — khong tra loi van ban tu do ngoai tool nay.';

export async function suggestAiAllocation(): Promise<SuggestAllocationResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const ctx = await getAiContext(supabase);
  if (ctx.jars.length === 0) return { error: "Chưa có hũ cá nhân nào để đề xuất." };

  try {
    const response = await callClaude({
      // SYSTEM_PROMPT khong doi giua cac lan goi -> danh dau cache de lan
      // sau doc lai chi tinh ~10% gia input thay vi 100% (xem client.ts).
      system: [{ text: SYSTEM_PROMPT, cache: true }],
      messages: [{ role: "user", content: formatAiContext(ctx) }],
      maxTokens: 700,
      // Ep model PHAI goi tool nay thay vi duoc quyen tra loi van ban tu do
      // (mac dinh cua Anthropic la tool_choice "auto") — day la nguyen nhan
      // gay loi "AI khong tra ve de xuat hop le": voi tool_choice auto, model
      // (dac biet Haiku) doi khi chon tra loi text thay vi goi tool du system
      // prompt da yeu cau. Chi ep tool_choice o cho CAN ket qua co cau truc
      // nhu the nay; KHONG ap dung cho chatbot tu do (chat-actions.ts) vi cho
      // do model can duoc tu chon giua tra loi van ban va goi tool.
      toolChoice: { type: "tool", name: "propose_allocation" },
      tools: [
        {
          name: "propose_allocation",
          description: "Đề xuất % phân bổ thu nhập cho từng hũ cá nhân, kèm lý do ngắn gọn.",
          input_schema: {
            type: "object",
            properties: {
              summary: { type: "string", description: "Giải thích ngắn gọn (1-3 câu) lý do đề xuất." },
              allocations: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    jarName: { type: "string" },
                    pct: { type: "number" },
                  },
                  required: ["jarName", "pct"],
                },
              },
            },
            required: ["summary", "allocations"],
          },
        },
      ],
    });

    const toolUse = response.content.find((b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use" && b.name === "propose_allocation");
    if (!toolUse) return { error: "AI không trả về đề xuất hợp lệ, thử lại sau." };

    const input = toolUse.input as { summary: string; allocations: AiAllocationSuggestion[] };
    return { summary: input.summary, suggestions: input.allocations };
  } catch (err) {
    if (err instanceof MissingAiKeyError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Lỗi không xác định khi gọi AI." };
  }
}
