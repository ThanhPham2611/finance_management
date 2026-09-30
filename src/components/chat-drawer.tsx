"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { sendChatMessage, type ChatTurn } from "@/app/(app)/chat-actions";

// Khoang cach toi thieu giua 2 lan gui — chan nguoi dung (hoac vo tinh bam
// lien tuc) spam nhieu cau hoi lien tiep, moi cau deu ton 1 lan goi AI that.
const COOLDOWN_MS = 10_000;

// Luu lich su chat o localStorage thay vi DB: khong ton bang/row nao, khong
// ton query moi lan mo app, va lich su chat von chi co y nghia voi chinh
// thiet bi dang dung. Danh doi: doi may/xoa cache la mat — chap nhan duoc.
// ponytail: localStorage, chuyen sang bang `chat_messages` neu can dong bo
// nhieu thiet bi hoac xem lai lich su tu may khac.
const STORAGE_KEY = "hu.chat.v1";
// Chi giu N luot gan nhat trong localStorage (~vai chuc KB) — lich su cu
// khong ai doc lai, va server cung chi gui 8 luot gan nhat cho AI.
const MAX_STORED_TURNS = 40;

// Event handlers may read the wall clock. Keeping that read outside the
// component makes the render itself deterministic for the React compiler.
function readWallClock() {
  return Date.now();
}

const SUGGESTIONS = ["Ăn trưa 50k", "Tháng này tôi tiêu thế nào?", "Vay 600 triệu mua xe lãi 8%/năm 10 năm có ổn không?"];

function loadTurns(): ChatTurn[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    return Array.isArray(parsed) ? (parsed as ChatTurn[]) : [];
  } catch {
    return [];
  }
}

/** Chatbot AI noi — ghi giao dich bang ngon ngu tu nhien qua tool
 * "log_transaction", danh gia vay/mua sam lon qua tool "evaluate_loan",
 * hoac tra loi van ban dua tren du lieu tai chinh hien tai (pham vi cau
 * hoi da gioi han trong system prompt o chat-actions.ts). Lich su hoi
 * thoai luu o localStorage (xem STORAGE_KEY), khong dung DB. Can
 * ANTHROPIC_API_KEY trong .env.local moi dung that. */
export function ChatDrawer() {
  const [open, setOpen] = useState(false);
  // Doc lich su ngay trong initializer: khung chat chi render khi `open`
  // = true (mac dinh false ca tren server lan client) nen khong co nguy co
  // lech hydration, doi lai khong can 1 effect setState chi de nap lai.
  const [turns, setTurns] = useState<ChatTurn[]>(loadTurns);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [cooldownUntil, setCooldownUntil] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(turns.slice(-MAX_STORED_TURNS)));
    } catch {
      // Het quota / Safari private mode — mat lich su thi thoi, khong chan chat.
    }
  }, [turns]);

  // Chi chay dong ho dem nguoc khi thuc su dang trong thoi gian cooldown —
  // tranh setInterval chay vo ich khi khong can.
  useEffect(() => {
    if (cooldownUntil <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [cooldownUntil]);

  const cooldownRemainingSec = Math.max(0, Math.ceil((cooldownUntil - now) / 1000));
  const onCooldown = cooldownRemainingSec > 0;

  // Tu phinh chieu cao textarea theo noi dung, toi da ~5 dong roi cuon.
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, [input]);

  // Luon cuon xuong tin nhan moi nhat khi co luot moi / dang cho tra loi.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, sending]);

  useEffect(() => {
    if (open) textareaRef.current?.focus();
  }, [open]);

  // Esc de dong khung chat — thoi quen mac dinh cua moi dialog.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function handleSend(message?: string) {
    const text = (message ?? input).trim();
    if (!text || sending || onCooldown) return;
    const history = turns;
    setInput("");
    setError(null);
    setTurns((prev) => [...prev, { role: "user", text }]);
    setSending(true);
    // Bat dau cooldown ngay khi gui, khong doi ket qua tra ve — chan spam
    // ca khi cau truoc bi loi (vd het credit AI) thay vi chi khi thanh cong.
    setCooldownUntil(readWallClock() + COOLDOWN_MS);
    const result = await sendChatMessage(text, history);
    setSending(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    setTurns((prev) => [...prev, { role: "assistant", text: result.reply ?? "" }]);
  }

  function clearHistory() {
    setTurns([]);
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Đóng trợ lý AI" : "Mở trợ lý AI"}
        aria-expanded={open}
        className="fixed bottom-[92px] right-4 z-30 grid h-12 w-12 place-items-center rounded-full bg-accent text-bg shadow-lg transition-transform hover:scale-105 active:scale-95 md:bottom-6"
      >
        <Icon name={open ? "x" : "sparkles"} className="h-5 w-5" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Trợ lý AI"
          className="fixed inset-x-4 bottom-[152px] z-30 flex max-h-[70vh] flex-col border border-divider bg-bg shadow-lg md:inset-x-auto md:right-6 md:bottom-24 md:h-[560px] md:max-h-[calc(100vh-8rem)] md:w-[400px]"
        >
          <header className="flex items-center gap-2 border-b border-divider bg-surface px-3.5 py-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center bg-accent text-bg">
              <Icon name="sparkles" className="h-4 w-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-extrabold leading-tight">Trợ lý AI</p>
              <p className="truncate text-[11px] leading-tight text-neutral-600">Ghi chi tiêu &amp; hỏi về tài chính của bạn</p>
            </div>
            {turns.length > 0 && (
              <button type="button" onClick={clearHistory} aria-label="Xoá lịch sử trò chuyện" title="Xoá lịch sử" className="btn btn-ghost text-neutral-700">
                <Icon name="trash-2" className="h-4 w-4" />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng" className="btn btn-ghost text-neutral-700">
              <Icon name="x" className="h-4 w-4" />
            </button>
          </header>

          <div ref={scrollRef} className="flex-1 space-y-3 overflow-auto px-3.5 py-3">
            {turns.length === 0 && (
              <div className="space-y-3">
                <p className="text-[12px] leading-relaxed text-neutral-700">
                  Ghi chi tiêu bằng câu nói tự nhiên, hỏi nhanh tình hình chi tiêu, hoặc hỏi về 1 quyết định vay/mua sắm lớn. Chỉ trả lời các câu hỏi liên quan
                  tài chính/app này thôi nhé.
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => handleSend(s)}
                      disabled={sending || onCooldown}
                      className="border border-divider px-2.5 py-1.5 text-left text-[12px] hover:bg-neutral-200 disabled:opacity-45"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {turns.map((t, i) => (
              <div key={i} className={`flex flex-col gap-1 ${t.role === "user" ? "items-end" : "items-start"}`}>
                <span className="px-0.5 text-[10px] font-bold uppercase tracking-wider text-neutral-500">{t.role === "user" ? "Bạn" : "Trợ lý"}</span>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap px-3 py-2 text-[13px] leading-relaxed ${
                    t.role === "user" ? "bg-accent text-bg" : "border border-divider bg-surface"
                  }`}
                >
                  {t.text}
                </div>
              </div>
            ))}

            {sending && (
              <div className="flex items-center gap-1.5 border border-divider bg-surface px-3 py-2.5" aria-live="polite">
                {[0, 150, 300].map((delay) => (
                  <span key={delay} className="h-1.5 w-1.5 animate-bounce bg-neutral-500" style={{ animationDelay: `${delay}ms` }} />
                ))}
                <span className="sr-only">Đang trả lời…</span>
              </div>
            )}

            {error && (
              <p className="flex items-start gap-1.5 border border-accent bg-accent-100 px-2.5 py-2 text-[12px] text-accent-700">
                <Icon name="triangle-alert" className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                {error}
              </p>
            )}
          </div>

          <div className="border-t border-divider bg-surface p-2.5">
            <div className="flex items-end gap-2 border border-divider bg-bg p-1.5 focus-within:border-accent">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Nhập tin nhắn…"
                rows={1}
                aria-label="Tin nhắn"
                className="min-h-0 flex-1 resize-none border-0 bg-transparent px-1.5 py-1.5 text-[14px] outline-none placeholder:text-neutral-500"
              />
              <button
                type="button"
                disabled={sending || onCooldown || !input.trim()}
                onClick={() => handleSend()}
                aria-label="Gửi"
                className="grid h-9 w-9 shrink-0 place-items-center bg-accent text-bg hover:bg-accent-600 disabled:opacity-45"
              >
                {onCooldown && !sending ? (
                  <span className="text-[12px] font-bold tabular-nums">{cooldownRemainingSec}</span>
                ) : (
                  <Icon name={sending ? "loader-circle" : "arrow-up"} className={`h-4 w-4 ${sending ? "animate-spin" : ""}`} />
                )}
              </button>
            </div>
            <p className="mt-1.5 px-0.5 text-[11px] text-neutral-600">
              {onCooldown && !sending ? `Đợi ${cooldownRemainingSec}s giữa mỗi câu hỏi để tránh hỏi dồn dập nhé.` : "Enter để gửi · Shift+Enter xuống dòng"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
