// [OCR] TAM TAT o version nay — file khong con duoc import tu dau (xem
// src/components/transaction-entry.tsx, cac khoi danh dau [OCR]). Giu lai
// nguyen ven de bat lai sau; Next khong bundle file server action khong
// duoc import nen no khong tao endpoint nao.
"use server";

import { createClient } from "@/lib/supabase/server";
import { listJarsWithSpent } from "@/lib/queries/jars";
import { callClaude, MissingAiKeyError, type ClaudeImageMediaType } from "@/lib/ai/client";

export type ExtractReceiptResult = {
  error?: string;
  amount?: number;
  note?: string;
  suggestedJarName?: string;
};

const SUPPORTED_MEDIA_TYPES: ClaudeImageMediaType[] = ["image/jpeg", "image/png", "image/webp", "image/gif"];

const SYSTEM_PROMPT =
  "Bạn đọc ảnh hoá đơn/biên lai mua sắm cho 1 app quản lý chi tiêu cá nhân. " +
  "Đọc TỔNG SỐ TIỀN cuối cùng trên hoá đơn (không phải giá từng món), tên cửa hàng/mặt hàng chính để làm ghi chú ngắn, " +
  "và nếu đoán được hũ ngân sách phù hợp nhất trong danh sách hũ hợp lệ được cung cấp thì gợi ý luôn (không chắc thì để trống). " +
  'Trả lời BẰNG CÁCH GỌI TOOL "propose_receipt" — không trả lời văn bản tự do ngoài tool này. ' +
  "Nếu ảnh không phải hoá đơn hoặc không đọc được số tiền, vẫn phải gọi tool với amount = 0 và note giải thích ngắn gọn.";

/**
 * OCR hoa don qua Claude vision — KHONG dung dich vu OCR rieng, tan dung
 * luon ha tang AI da co (client.ts) vi model da ho tro doc anh san. Anh
 * CHI gui qua API de trich xuat, KHONG luu lai (khong upload vao Storage,
 * khong ghi vao DB) — ket qua tra ve chi de PRE-FILL form, nguoi dung van
 * phai bam "Luu" nhu binh thuong qua createTransaction (transactions/new/actions.ts).
 */
export async function extractReceiptData(imageBase64: string, mediaType: string): Promise<ExtractReceiptResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  if (!SUPPORTED_MEDIA_TYPES.includes(mediaType as ClaudeImageMediaType)) {
    return { error: "Định dạng ảnh không hỗ trợ (chỉ nhận JPEG/PNG/WEBP/GIF)." };
  }
  if (!imageBase64) return { error: "Không đọc được ảnh." };

  const jars = await listJarsWithSpent(supabase);
  const personalJars = jars.filter((j) => !j.isShared);

  try {
    const response = await callClaude({
      system: [{ text: SYSTEM_PROMPT, cache: true }],
      messages: [
        {
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: mediaType as ClaudeImageMediaType, data: imageBase64 } },
            {
              type: "text",
              text: `Danh sách hũ cá nhân hợp lệ cho suggestedJarName (dùng đúng tên này, hoặc để trống nếu không chắc): ${
                personalJars.map((j) => j.name).join(", ") || "(chưa có hũ nào)"
              }`,
            },
          ],
        },
      ],
      // Anh chiem nhieu token hon text thuong (~1000-1600 token/anh tuy do
      // phan giai) — van dung Haiku (re) vi day la tac vu doc/trich xuat
      // don gian, khong can suy luan sau.
      maxTokens: 400,
      toolChoice: { type: "tool", name: "propose_receipt" },
      tools: [
        {
          name: "propose_receipt",
          description: "Trích xuất số tiền + ghi chú + gợi ý hũ từ ảnh hoá đơn.",
          input_schema: {
            type: "object",
            properties: {
              amount: { type: "number", description: "Tổng số tiền trên hoá đơn, VND, số nguyên dương. 0 nếu không đọc được." },
              note: { type: "string", description: "Ghi chú ngắn: tên cửa hàng hoặc mặt hàng chính." },
              suggestedJarName: { type: "string", description: "Tên 1 hũ trong danh sách hũ hợp lệ, hoặc chuỗi rỗng nếu không chắc." },
            },
            required: ["amount", "note"],
          },
        },
      ],
    });

    const toolUse = response.content.find((b): b is Extract<typeof b, { type: "tool_use" }> => b.type === "tool_use" && b.name === "propose_receipt");
    if (!toolUse) return { error: "AI không đọc được hoá đơn, thử lại hoặc nhập tay." };

    const input = toolUse.input as { amount: number; note: string; suggestedJarName?: string };
    if (!(input.amount > 0)) {
      return { error: "AI không đọc được số tiền hợp lệ trên ảnh này, thử ảnh rõ hơn hoặc nhập tay." };
    }

    return {
      amount: Math.round(input.amount),
      note: input.note?.trim() || undefined,
      suggestedJarName: input.suggestedJarName?.trim() || undefined,
    };
  } catch (err) {
    if (err instanceof MissingAiKeyError) return { error: err.message };
    return { error: err instanceof Error ? err.message : "Lỗi không xác định khi đọc hoá đơn." };
  }
}
