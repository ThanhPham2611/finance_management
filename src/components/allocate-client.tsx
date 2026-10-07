"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Icon } from "@/components/icon";
import Link from "next/link";
import { Banner, MoneyInput } from "@/components/ui";
import { formatVND, vnNow } from "@/lib/format";
import type { RealJar } from "@/lib/queries/jars";
import { applyAllocation } from "@/app/(app)/allocate/actions";
import { suggestAiAllocation } from "@/app/(app)/allocate/ai-actions";

function equalSplit(count: number): number[] {
  if (count === 0) return [];
  const base = Math.floor((100 / count) * 10) / 10;
  const pcts = Array(count).fill(base);
  const used = pcts.reduce((a: number, b: number) => a + b, 0);
  pcts[pcts.length - 1] = Math.max(0, Math.round((100 - used + base) * 10) / 10);
  return pcts;
}

export function AllocateClient({
  jars,
  familyContribution,
  familyJarCount,
}: {
  jars: RealJar[];
  familyContribution: number;
  familyJarCount: number;
}) {
  const router = useRouter();
  const monthLabel = `Tháng ${vnNow().getMonth() + 1}, ${vnNow().getFullYear()}`;
  const currentTotal = jars.reduce((s, j) => s + j.monthlyBudget, 0);

  // Thu nhap sau khi tru phan da cam ket cho hu gia dinh (quan ly o trang
  // Gia dinh) — chi con phan nay moi duoc chia % cho cac hu ca nhan ben duoi.
  const [income, setIncome] = useState((currentTotal || 0) + familyContribution);
  const incomeForPersonal = Math.max(0, income - familyContribution);
  // Luong nhap vao khong du de tru phan da cam ket gop hu gia dinh thang nay —
  // chan lai thay vi am tham cho incomeForPersonal ve 0.
  const incomeShortfall = familyContribution > 0 && income < familyContribution;
  // Full precision on purpose: rounding this to e.g. 0.1% before storing would, on a large
  // income, throw away tens of thousands of VND every time the page remounts (jars tab, back),
  // making an already-applied split look "off" again. Only the displayed % label rounds.
  const [pcts, setPcts] = useState<number[]>(
    jars.map((j) => (currentTotal ? (j.monthlyBudget / currentTotal) * 100 : 0))
  );

  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // De xuat phan bo bang AI — khung suon Giai doan 2, can ANTHROPIC_API_KEY
  // trong .env.local moi goi duoc that (xem src/lib/ai/client.ts).
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<{ jarName: string; pct: number }[] | null>(null);

  if (jars.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 px-4 py-16 text-center">
        <Icon name="wallet" className="h-8 w-8 text-neutral-500" />
        <h1 className="text-lg">Chưa có hũ cá nhân nào để chia lương</h1>
        <p className="max-w-sm text-sm text-neutral-700">
          Tạo ít nhất một hũ ngân sách cá nhân trước, sau đó quay lại đây để chia lương vào từng hũ.
          {familyJarCount > 0 && (
            <>
              {" "}
              Phần đóng góp cho hũ gia đình quản lý riêng ở trang{" "}
              <Link href="/household" className="text-accent hover:underline">
                Gia đình
              </Link>
              .
            </>
          )}
        </p>
      </div>
    );
  }

  function setPct(index: number, value: number) {
    setPcts((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
    setApplied(false);
  }

  function resetEqual() {
    setPcts(equalSplit(jars.length));
    setApplied(false);
  }

  function setAmount(index: number, newAmount: number) {
    if (!incomeForPersonal) return;
    const newPct = (Math.max(0, newAmount) / incomeForPersonal) * 100;
    setPcts((prev) => {
      const otherIdx = prev.map((_, i) => i).filter((i) => i !== index);
      const otherOldSum = otherIdx.reduce((s, i) => s + prev[i], 0);
      const targetSum = Math.max(0, 100 - newPct);
      const next = [...prev];
      next[index] = newPct;
      if (otherIdx.length > 0) {
        if (otherOldSum === 0) {
          const share = targetSum / otherIdx.length;
          otherIdx.forEach((i) => (next[i] = share));
        } else {
          otherIdx.forEach((i) => (next[i] = (prev[i] / otherOldSum) * targetSum));
        }
      }
      return next;
    });
    setApplied(false);
  }

  function autoFill() {
    const used = pcts.reduce((a, b) => a + b, 0);
    const rest = 100 - used;
    if (Math.abs(rest) < 0.01) return;
    setPcts((prev) => {
      const next = [...prev];
      const lastIdx = next.length - 1;
      next[lastIdx] = Math.max(0, Math.min(100, next[lastIdx] + rest));
      return next;
    });
    setApplied(false);
  }

  async function handleApply() {
    setApplying(true);
    setError(null);
    const allocations = jars.map((jar, i) => ({
      jarId: jar.id,
      monthlyBudget: Math.round((incomeForPersonal * pcts[i]) / 100),
      pct: pcts[i],
    }));
    const result = await applyAllocation({ income, allocations });
    setApplying(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    router.refresh();
    setApplied(true);
  }

  async function handleAiSuggest() {
    setAiLoading(true);
    setAiError(null);
    setAiSummary(null);
    setAiSuggestions(null);
    const result = await suggestAiAllocation();
    setAiLoading(false);
    if (result.error) {
      setAiError(result.error);
      return;
    }
    setAiSummary(result.summary ?? null);
    setAiSuggestions(result.suggestions ?? null);
  }

  function applyAiSuggestion() {
    if (!aiSuggestions) return;
    setPcts((prev) =>
      jars.map((jar, i) => {
        const match = aiSuggestions.find((s) => s.jarName.trim().toLowerCase() === jar.name.trim().toLowerCase());
        return match ? match.pct : prev[i];
      })
    );
    setApplied(false);
    setAiSuggestions(null);
    setAiSummary(null);
  }

  const used = pcts.reduce((a, b) => a + b, 0);
  const leftPct = 100 - used;
  const leftAmount = (incomeForPersonal * leftPct) / 100;
  const over = leftPct < -0.01;
  const exact = Math.abs(leftPct) < 0.01;

  return (
    <div className="page-stack">
      <div className="page-header flex-wrap">
        <div className="mr-auto"><p className="eyebrow">PHÂN BỔ CÓ CHỦ ĐÍCH</p><h1>Chia lương</h1><p>{monthLabel}</p></div>
        <button type="button" onClick={resetEqual} className="btn btn-secondary">
          Chia đều
        </button>
        <button type="button" disabled={aiLoading} onClick={handleAiSuggest} className="btn btn-secondary">
          {aiLoading ? "AI đang tính…" : "Đề xuất bằng AI"}
        </button>
        <button type="button" disabled={applying || incomeShortfall} onClick={handleApply} className="btn btn-primary">
          {applying ? "Đang áp dụng…" : `Áp dụng cho tháng ${vnNow().getMonth() + 1}`}
        </button>
      </div>

      {error && (
        <Banner icon="triangle-alert" tone="accent">
          {error}
        </Banner>
      )}
      {incomeShortfall && (
        <Banner icon="triangle-alert" tone="accent">
          Lương bạn nhập ({formatVND(income)}) nhỏ hơn phần đã cam kết góp hũ gia đình (
          {formatVND(familyContribution)}). Kiểm tra lại số lương, hoặc{" "}
          <Link href="/household" className="underline">
            chỉnh mức góp ở trang Gia đình
          </Link>
          .
        </Banner>
      )}
      {aiError && (
        <Banner icon="triangle-alert" tone="accent">
          {aiError}
        </Banner>
      )}
      {aiSuggestions && (
        <Banner icon="info" tone="amber">
          <div className="flex flex-col gap-2">
            {aiSummary && <div>{aiSummary}</div>}
            <div className="flex gap-2">
              <button type="button" onClick={applyAiSuggestion} className="btn btn-primary">
                Áp dụng đề xuất
              </button>
              <button
                type="button"
                onClick={() => {
                  setAiSuggestions(null);
                  setAiSummary(null);
                }}
                className="btn btn-secondary"
              >
                Bỏ qua
              </button>
            </div>
          </div>
        </Banner>
      )}
      {applied && (
        <Banner icon="check" tone="green">
          Đã cập nhật ngân sách tháng {vnNow().getMonth() + 1} cho các hũ.
        </Banner>
      )}

      <div className="grid gap-6 md:grid-cols-[330px_1fr]">
        <div className="flex flex-col gap-5">
          <div>
            <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Tổng thu nhập tháng này</div>
            <div className="mt-2 flex items-baseline gap-2 border-b-2 border-text pb-2.5">
              <MoneyInput
                value={income}
                onChange={(amount) => {
                  setIncome(amount);
                  setApplied(false);
                }}
                className="input w-full border-0 bg-transparent p-0 font-heading text-3xl font-extrabold tabular-nums"
                aria-label="Nhập tổng thu nhập"
              />
              <div className="text-[13px] text-neutral-700">VND</div>
            </div>
            {familyContribution > 0 && (
              <p className="mt-1.5 text-[11px] text-neutral-700">
                Đã trừ {formatVND(familyContribution)} đóng góp hũ gia đình (
                <Link href="/household" className="text-accent hover:underline">
                  chỉnh ở trang Gia đình
                </Link>
                ) — còn {formatVND(incomeForPersonal)} để chia cho hũ cá nhân.
              </p>
            )}
          </div>

          <div>
            <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Chưa phân bổ</div>
            <div className="mt-1.5 font-heading text-[30px] font-extrabold tabular-nums" style={{ color: over ? "var(--color-accent-700)" : exact ? "var(--color-green-ink)" : "var(--color-text)" }}>
              {over ? `−${formatVND(-leftAmount)}` : formatVND(leftAmount)}
            </div>
            <button type="button" onClick={autoFill} className="btn btn-secondary mt-3.5">
              Chia hết phần dư vào hũ cuối
            </button>
          </div>
        </div>

        <div className="flex flex-col">
          <Banner icon={over ? "triangle-alert" : exact ? "check" : "info"} tone={over ? "accent" : exact ? "green" : "amber"}>
            {over
              ? `Vượt thu nhập ${formatVND(-leftAmount)} VND. Giảm một hũ nào đó.`
              : exact
                ? "Đã chia hết thu nhập."
                : `Còn ${formatVND(leftAmount)} VND chưa vào hũ nào.`}
          </Banner>

          <div className="mt-3 flex h-3.5 gap-px bg-neutral-300">
            {pcts.map((v, i) => (
              <div key={jars[i].id} style={{ width: `${Math.max(0, v)}%`, background: jars[i].color }} />
            ))}
          </div>

          <div className="mt-2 flex-1 overflow-y-auto">
            {jars.map((jar, i) => (
              <div key={jar.id} className="flex flex-col gap-2 border-b border-divider py-3 sm:flex-row sm:items-center sm:gap-4">
                <div className="flex items-center gap-2.5 sm:w-40 sm:shrink-0">
                  <Icon name={jar.icon} className="h-4 w-4" style={{ color: jar.color }} />
                  <span className="text-[13px] font-semibold">{jar.name}</span>
                </div>
                <input
                  type="range"
                  className="hu-slider sm:flex-1"
                  min={0}
                  max={100}
                  step={0.5}
                  value={pcts[i]}
                  onChange={(e) => setPct(i, Number(e.target.value))}
                />
                <div className="flex items-center justify-between gap-3 sm:w-44 sm:justify-end">
                  <span className="text-xs tabular-nums text-neutral-700">{pcts[i].toFixed(1).replace(/\.0$/, "")}%</span>
                  <MoneyInput
                    value={Math.round((incomeForPersonal * pcts[i]) / 100)}
                    onChange={(amount) => setAmount(i, amount)}
                    className="input w-32 border-0 bg-transparent p-0 text-right font-heading text-[15px] font-extrabold tabular-nums"
                    aria-label={`Sửa số tiền cho ${jar.name}`}
                    title="Bấm để sửa số tiền, các hũ khác tự chia lại phần thiếu/dư"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
