/**
 * Goi thang Anthropic Messages API bang fetch (khong them dependency
 * @anthropic-ai/sdk de tranh phai chay npm install tu phien khong chac
 * co mang). Can ANTHROPIC_API_KEY trong .env.local (server-only, KHONG
 * duoc dat prefix NEXT_PUBLIC_ vi se lo ra client).
 *
 * MODEL MAC DINH: Claude Haiku — model re nhat hien co, du dung cho viec
 * phan loai 1 khoan chi tieu vao dung hu hoac de xuat % phan bo don gian,
 * khong can suy luan sau nhu Sonnet/Opus. Neu sau nay thay AI tra loi
 * chua du tot, doi qua bien moi truong ANTHROPIC_MODEL (vd sang model
 * Sonnet) thay vi sua code — nhung se ton hon nhieu lan cho moi cau hoi.
 *
 * LUU Y: ten model cu the ben duoi co the da cu vao thoi diem ban doc file
 * nay (Anthropic ra model moi khoang vai thang/lan) — kiem tra lai tai
 * https://platform.claude.com/docs/en/about-claude/models/overview truoc
 * khi dung that, hoac ghi de bang ANTHROPIC_MODEL.
 */

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const ANTHROPIC_VERSION = "2023-06-01";
const DEFAULT_MODEL = "claude-haiku-4-5-20251001";
/** Tran mac dinh cho do dai cau tra loi — chan chi phi/khong khi model
 * lo noi dai dong dai. Cac cho goi rieng le van tu chinh lai neu can. */
const DEFAULT_MAX_TOKENS = 512;

export class MissingAiKeyError extends Error {
  constructor() {
    super("Chưa cấu hình ANTHROPIC_API_KEY trong .env.local — tính năng AI chưa dùng được.");
    this.name = "MissingAiKeyError";
  }
}

/** Anh gui kem trong 1 tin nhan user — dung cho tinh nang OCR hoa don
 * (doc anh qua Claude vision). Chi ho tro base64 inline (khong dung URL
 * anh tu xa) de khong phu thuoc vao viec anh co public khong. */
export type ClaudeImageMediaType = "image/jpeg" | "image/png" | "image/webp" | "image/gif";
export type ClaudeImageBlock = { type: "image"; source: { type: "base64"; media_type: ClaudeImageMediaType; data: string } };
export type ClaudeMessageTextBlock = { type: "text"; text: string };
export type ClaudeToolDef = {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
};

/** Ket qua 1 tool sau khi minh tu chay xong, gui lai cho model trong 1 tin
 * nhan "user" tiep theo (tool_use_id phai khop voi id cua ClaudeToolUseBlock
 * model vua tra ve, xem ClaudeResponse ben duoi) de model doc va tong hop
 * thanh cau tra loi van ban cuoi cung — dung khi can 1 vong tool-use 2 buoc
 * (model goi tool -> minh tu tinh ket qua CHINH XAC bang code -> gui lai qua
 * tool_result -> hoi model tong hop cau tra loi, thay vi tin model tu tinh
 * toan hoc phuc tap qua van ban tu do). */
export type ClaudeToolResultBlock = { type: "tool_result"; tool_use_id: string; content: string };

// ClaudeToolUseBlock (echo lai tool_use model vua goi trong tin nhan
// "assistant" tiep theo) duoc khai bao ben duoi cung ClaudeResponse — TypeScript
// khong yeu cau thu tu khai bao type alias trong cung 1 file.
export type ClaudeMessageContentBlock = ClaudeMessageTextBlock | ClaudeImageBlock | ClaudeToolUseBlock | ClaudeToolResultBlock;

export type ClaudeMessage = { role: "user" | "assistant"; content: string | ClaudeMessageContentBlock[] };

/** Ep model PHAI goi 1 tool cu the (vd form phan bo luong) thay vi de no
 * tu chon tra loi van ban tu do — mac dinh cua Anthropic la "auto", nghia
 * la model duoc quyen bo qua tool ngay ca khi system prompt yeu cau dung
 * tool, dac biet voi model nho nhu Haiku. Dung { type: "tool", name } khi
 * ban CAN ket qua co cau truc; de trong (mac dinh "auto") khi muon model
 * tu quyet dinh giua tra loi van ban va goi tool (vd chatbot tu do). */
export type ClaudeToolChoice = { type: "tool"; name: string } | { type: "any" } | { type: "auto" };

/** 1 khoi trong system prompt — dat cache=true cho phan KHONG doi giua
 * cac lan goi (vd huong dan/instructions co dinh) de Anthropic cache lai,
 * doc lan sau chi tinh phi ~10% gia input thay vi 100%. Phan hay doi (vd
 * du lieu tai chinh song) thi de cache=false. */
export type ClaudeSystemBlock = { text: string; cache?: boolean };

export type ClaudeTextBlock = { type: "text"; text: string };
export type ClaudeToolUseBlock = { type: "tool_use"; id: string; name: string; input: Record<string, unknown> };
export type ClaudeContentBlock = ClaudeTextBlock | ClaudeToolUseBlock;

export type ClaudeResponse = {
  content: ClaudeContentBlock[];
  stop_reason: string;
  usage?: { input_tokens: number; output_tokens: number; cache_creation_input_tokens?: number; cache_read_input_tokens?: number };
};

function buildSystemPayload(system: string | ClaudeSystemBlock[]) {
  if (typeof system === "string") return system;
  return system.map((block) => ({
    type: "text" as const,
    text: block.text,
    ...(block.cache ? { cache_control: { type: "ephemeral" as const } } : {}),
  }));
}

export async function callClaude(params: {
  system: string | ClaudeSystemBlock[];
  messages: ClaudeMessage[];
  tools?: ClaudeToolDef[];
  toolChoice?: ClaudeToolChoice;
  maxTokens?: number;
}): Promise<ClaudeResponse> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new MissingAiKeyError();

  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;

  const res = await fetch(ANTHROPIC_API_URL, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": ANTHROPIC_VERSION,
    },
    body: JSON.stringify({
      model,
      max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
      system: buildSystemPayload(params.system),
      messages: params.messages,
      ...(params.tools ? { tools: params.tools } : {}),
      ...(params.toolChoice ? { tool_choice: params.toolChoice } : {}),
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Anthropic API lỗi ${res.status}: ${text.slice(0, 300)}`);
  }

  return (await res.json()) as ClaudeResponse;
}
