"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react"; // [OCR] doi lai: import { useRef, useState }
import { Icon } from "@/components/icon";
import { formatVND } from "@/lib/format";
import { jarLabel, jarStats, type RealJar } from "@/lib/queries/jars";
import { createTransaction } from "@/app/(app)/transactions/new/actions";
// [OCR] import { extractReceiptData } from "@/app/(app)/transactions/new/ocr-actions";
import { Banner, MoneyInput } from "@/components/ui";

// OCR tam tat o version nay — bo comment cac khoi danh dau [OCR] de bat lai.
// [OCR]
// /** File anh -> base64 (khong kem tien to "data:image/...;base64,") + media
//  * type, de gui thang cho Anthropic vision API qua server action. Xu ly o
//  * client de KHONG upload anh len Storage — anh chi di qua server action
//  * 1 lan roi bi bo, khong luu lai o dau ca. */
// function fileToBase64(file: File): Promise<{ data: string; mediaType: string }> {
//   return new Promise((resolve, reject) => {
//     const reader = new FileReader();
//     reader.onload = () => {
//       const result = reader.result as string;
//       const match = result.match(/^data:(.+);base64,(.*)$/);
//       if (!match) {
//         reject(new Error("Không đọc được ảnh."));
//         return;
//       }
//       resolve({ mediaType: match[1], data: match[2] });
//     };
//     reader.onerror = () => reject(new Error("Không đọc được ảnh."));
//     reader.readAsDataURL(file);
//   });
// }

export function TransactionEntry({ jars }: { jars: RealJar[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const jarsForEntry = jars;
  const preselected = jarsForEntry.findIndex((j) => j.id === searchParams.get("jar"));
  const [mode, setMode] = useState<"expense" | "deposit">(searchParams.get("type") === "deposit" ? "deposit" : "expense");
  const [bucketIndex, setBucketIndex] = useState(preselected >= 0 ? preselected : 0);
  const [amount, setAmount] = useState(0);
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Canh bao truoc khi rut tu hu tiet kiem — chi ap dung mode="expense".
  // Click "Luu" lan dau chi bat co nay (chua luu), click lan 2 moi that
  // su goi action. Reset ve false khi doi hu/so tien de tranh ap nham.
  const [confirmSavings, setConfirmSavings] = useState(false);

  /* [OCR] OCR hoa don qua AI vision — can ANTHROPIC_API_KEY.
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  */

  if (jarsForEntry.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Icon name="wallet" className="h-8 w-8 text-neutral-500" />
        <h1 className="text-lg">Chưa có hũ nào để ghi giao dịch</h1>
        <p className="max-w-sm text-sm text-neutral-700">Tạo ít nhất một hũ ngân sách trước, sau đó quay lại đây để nhập khoản thu hoặc chi.</p>
        <Link href="/jars/new" className="btn btn-primary">
          Tạo hũ mới
        </Link>
      </div>
    );
  }

  const jar = jarsForEntry[bucketIndex];
  const left = jar.monthlyBudget - jar.spent;
  const after = mode === "deposit" ? left + amount : left - amount;

  async function handleSave() {
    if (mode === "expense" && jar.isSavings && !confirmSavings) {
      setConfirmSavings(true);
      return;
    }
    setSaving(true);
    setSaveError(null);
    const result = await createTransaction({ jarId: jar.id, amount, note, type: mode });
    setSaving(false);
    if (result.error) {
      setSaveError(result.error);
      return;
    }
    router.refresh();
    setSaved(true);
  }

  /* [OCR]
  async function handleScanReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // cho phep chon lai cung 1 file lan nua neu can
    if (!file) return;

    setOcrLoading(true);
    setOcrError(null);
    try {
      const { data, mediaType } = await fileToBase64(file);
      const result = await extractReceiptData(data, mediaType);
      if (result.error) {
        setOcrError(result.error);
        return;
      }
      if (result.amount) setAmount(result.amount);
      if (result.note) setNote(result.note);
      if (result.suggestedJarName) {
        const idx = jars.findIndex((j) => j.name.trim().toLowerCase() === result.suggestedJarName!.trim().toLowerCase());
        if (idx >= 0) setBucketIndex(idx);
      }
      setSaved(false);
    } catch {
      setOcrError("Không đọc được ảnh, thử lại hoặc nhập tay.");
    } finally {
      setOcrLoading(false);
    }
  }
  */

  if (saved) {
    const updatedJar: RealJar = { ...jar, spent: mode === "deposit" ? jar.spent - amount : jar.spent + amount };
    const stats = jarStats(updatedJar, formatVND);
    return (
      <div className="flex flex-col gap-4 px-4 py-4 md:px-7 md:py-4.5">
        <div className="flex items-center gap-2.5 border-b-2 border-divider py-3" style={{ background: "oklch(0.52 0.10 155 / 0.16)", color: "var(--color-green-ink)" }}>
          <Icon name="check" className="ml-4 h-[18px] w-[18px]" />
          <div className="flex-1 text-[13px]">
            {mode === "deposit" ? "Đã thu" : "Đã lưu"} {formatVND(amount)} vào {jar.name}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Icon name={jar.icon} className="h-[18px] w-[18px]" style={{ color: jar.color }} />
          <div className="flex-1">
            <div className="text-sm font-semibold">{jar.name} sau khoản này</div>
            <div className="text-xs text-neutral-700 tabular-nums">
              {jar.isSavings
                ? `Đã tiết kiệm được ${formatVND(Math.max(0, after))}`
                : mode === "deposit"
                  ? `Còn ${formatVND(Math.max(0, after))} / ${formatVND(jar.monthlyBudget)}`
                  : `Đã chi ${formatVND(updatedJar.spent)} / ${formatVND(jar.monthlyBudget)}`}
            </div>
          </div>
          <div className="font-heading text-lg font-extrabold tabular-nums">{formatVND(Math.max(0, after))}</div>
        </div>
        <div className="flex gap-2.5">
          <button
            type="button"
            className="btn btn-secondary flex-1 justify-center"
            onClick={() => {
              setAmount(0);
              setNote("");
              setSaved(false);
              setConfirmSavings(false);
            }}
          >
            Nhập tiếp
          </button>
          <Link href={`/jars/${jar.id}`} className="btn btn-primary flex-1 justify-center">
            Xem hũ {jar.name}
          </Link>
        </div>
        {!jar.isSavings && (stats.over || stats.near || stats.willExceed) && (
          <p className="text-xs" style={{ color: stats.over ? "var(--color-accent-700)" : "var(--color-amber-ink)" }}>
            {stats.over
              ? `Hũ này đã vượt ngân sách ${stats.leftAmount}.`
              : stats.near
                ? `Hũ này đã dùng ${stats.pctLabel} ngân sách.`
                : `Với tốc độ này, hũ có thể vượt ngân sách ~${formatVND(stats.projectedOverAmount)} vào cuối tháng.`}
          </p>
        )}
      </div>
    );
  }

  const hint =
    mode === "deposit"
      ? !amount
        ? "Bấm số để nhập"
        : `Sau khoản này ${jar.name} có ${formatVND(after)}`
      : !amount
        ? "Bấm số để nhập"
        : after < 0
          ? `Khoản này làm ${jar.name} vượt ${formatVND(-after)}`
          : `Sau khoản này ${jar.name} còn ${formatVND(after)}`;
  const hintTone =
    mode === "deposit"
      ? "var(--color-neutral-700)"
      : amount && after < 0
        ? "var(--color-accent-700)"
        : amount && jar.monthlyBudget && after < jar.monthlyBudget * 0.15
          ? "var(--color-amber-ink)"
          : "var(--color-neutral-700)";

  return (
    <div className="flex flex-col gap-3 px-4 py-4 md:px-7 md:py-4.5">
      <div className="flex items-center gap-3 border-b-2 border-divider pb-3">
        <Link href="/transactions" aria-label="Đóng">
          <Icon name="x" className="h-5 w-5" />
        </Link>
        <h1 className="mr-auto text-lg">Giao dịch mới</h1>
      </div>

      <div className="flex h-11 gap-px border border-divider bg-divider">
        {(
          [
            ["expense", "Chi"],
            ["deposit", "Thu"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={mode === id}
            onClick={() => {
              setMode(id);
              setConfirmSavings(false);
            }}
            className="flex flex-1 items-center justify-center text-sm"
            style={{ background: mode === id ? "var(--color-accent)" : "var(--color-bg)", color: mode === id ? "var(--color-bg)" : "var(--color-text)" }}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="border-b-2 border-text pb-2.5">
        <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Số tiền</div>
        <div className="mt-1.5 flex items-baseline gap-2">
          <MoneyInput
            value={amount}
            onChange={(v) => {
              setAmount(v);
              setConfirmSavings(false);
            }}
            autoFocus
            placeholder="0"
            className="input w-full border-0 bg-transparent p-0 font-heading text-[40px] leading-none font-extrabold tabular-nums"
            aria-label="Nhập số tiền"
          />
          <div className="text-sm text-neutral-700">VND</div>
        </div>
      </div>
      <div className="text-xs" style={{ color: hintTone }}>
        {hint}
      </div>

      {/* [OCR]
      <div>
        <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleScanReceipt} />
        <button type="button" disabled={ocrLoading} onClick={() => fileInputRef.current?.click()} className="btn btn-secondary">
          <Icon name="scan-line" className="h-4 w-4" />
          {ocrLoading ? "Đang đọc hoá đơn…" : "Quét hoá đơn (AI)"}
        </button>
      </div>
      {ocrError && (
        <Banner icon="triangle-alert" tone="accent">
          {ocrError}
        </Banner>
      )}
      */}

      <div>
        <div className="mb-2 text-[10px] tracking-[0.12em] text-neutral-700 uppercase">{mode === "deposit" ? "Thu vào hũ nào" : "Chi từ hũ nào"}</div>
        <div className="grid grid-cols-2 gap-px border border-divider bg-divider sm:grid-cols-3">
          {jarsForEntry.map((b, i) => {
            const selected = i === bucketIndex;
            const stats = jarStats(b, formatVND);
            const isLastOdd = i === jarsForEntry.length - 1 && jarsForEntry.length % 2 === 1;
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  setBucketIndex(i);
                  setConfirmSavings(false);
                }}
                className={`flex min-h-12 items-center gap-2.5 px-3.5 py-3 text-left ${isLastOdd ? "col-span-2 sm:col-span-1" : ""}`}
                style={{ background: selected ? "var(--color-accent)" : "var(--color-bg)", color: selected ? "var(--color-bg)" : "var(--color-text)" }}
              >
                <Icon name={b.icon} className="h-[17px] w-[17px]" style={{ color: selected ? "var(--color-bg)" : b.color }} />
                <div className="min-w-0">
                  <div className="truncate text-[13px] font-semibold">{jarLabel(b)}</div>
                  <div className="text-[11px] tabular-nums" style={{ color: selected ? "var(--color-accent-100)" : "var(--color-neutral-700)" }}>
                    {b.isSavings ? `đã tiết kiệm ${stats.leftAmount}` : `${stats.leftWord} ${stats.leftAmount}`}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div className="field">
        <label htmlFor="tx-note">Ghi chú (không bắt buộc)</label>
        <input
          id="tx-note"
          className="input"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder={mode === "deposit" ? "Lương, được cho, bán đồ…" : "Chợ sáng, cà phê…"}
        />
      </div>

      {mode === "expense" && jar.isSavings && confirmSavings && (
        <Banner icon="triangle-alert" tone="amber">
          Bạn sắp rút tiền từ hũ tiết kiệm &ldquo;{jar.name}&rdquo;. Bấm nút bên dưới lần nữa để xác nhận, hoặc đổi hũ/số tiền để huỷ.
        </Banner>
      )}

      {saveError && (
        <p className="text-xs" style={{ color: "var(--color-accent-700)" }}>
          {saveError}
        </p>
      )}

      <div className="flex gap-2.5 pt-1">
        <button type="button" onClick={() => setAmount(0)} className="btn btn-secondary">
          Xoá
        </button>
        <button type="button" disabled={!amount || saving} onClick={handleSave} className="btn btn-primary flex-1 justify-start">
          {saving
            ? "Đang lưu…"
            : mode === "expense" && jar.isSavings && confirmSavings
              ? `Xác nhận rút ${formatVND(amount)} từ hũ tiết kiệm`
              : amount
                ? `${mode === "deposit" ? "Thu" : "Lưu"} ${formatVND(amount)} vào ${jar.name}`
                : "Lưu"}
        </button>
      </div>
    </div>
  );
}
