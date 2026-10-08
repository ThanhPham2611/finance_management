import Link from "next/link";
import type { DebtWithPayments } from "@hu/data";
import { describeReminder, rankDebts, type DebtReminder } from "@hu/domain";
import { Icon } from "@/components/icon";
import { ProgressBar } from "@/components/ui";
import { formatVND } from "@/lib/format";

export const REMINDER_INK: Record<DebtReminder["state"], string> = {
  overdue: "var(--color-destructive)",
  due: "var(--color-amber-ink)",
  soon: "var(--color-amber-ink)",
  later: "var(--color-neutral-700)",
};

const MAX_ROWS = 3;

/** Tổng quan khoản nợ: còn nợ bao nhiêu, mỗi tháng cần trả bao nhiêu, và nhắc hạn của các khoản gấp nhất. Không có nợ thì không hiện gì. */
export function DebtsOverviewCard({ debts, today }: { debts: DebtWithPayments[]; today: string }) {
  const ranked = rankDebts(debts.map((debt) => ({ debt, payments: debt.payments })), today);
  if (ranked.length === 0) return null;

  const remaining = ranked.reduce((sum, item) => sum + item.progress.remaining, 0);
  const monthlyNeeded = ranked.reduce((sum, item) => sum + item.progress.monthlyNeeded, 0);
  const worst = ranked.find((item) => item.progress.reminder && item.progress.reminder.state !== "later")?.progress.reminder?.state;
  const tone = worst === "overdue" ? { bg: "#FDECEA", border: "var(--color-destructive)" } : worst ? { bg: "oklch(0.70 0.15 68 / 0.16)", border: "var(--color-amber-ink)" } : { bg: "var(--color-surface)", border: "var(--color-divider)" };

  return (
    <section data-testid="debts-overview" data-urgency={worst ?? "none"} aria-label="Khoản nợ" className="rounded-card border p-4 shadow-sm" style={{ background: tone.bg, borderColor: tone.border }}>
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.12em] text-neutral-700 uppercase">Khoản nợ đang trả</div>
          <div className="mt-1 font-heading text-2xl font-extrabold tabular-nums">Còn nợ {formatVND(remaining)}đ</div>
          <div className="mt-0.5 text-xs text-neutral-700">
            {ranked.length} khoản · cần trả khoảng {formatVND(monthlyNeeded)}đ mỗi tháng
          </div>
        </div>
        <Link href="/debts" className="shrink-0 text-xs text-accent">
          Chi tiết
        </Link>
      </div>
      <ul className="mt-3 flex flex-col divide-y divide-divider">
        {ranked.slice(0, MAX_ROWS).map(({ debt, progress }) => (
          <li key={debt.id} className="py-2.5 first:pt-0 last:pb-0">
            <div className="flex items-baseline gap-2 text-[13px]">
              <span className="min-w-0 flex-1 truncate font-semibold">{debt.name}</span>
              <span className="shrink-0 tabular-nums text-neutral-700">còn {formatVND(progress.remaining)}đ</span>
            </div>
            <ProgressBar pct={progress.pct} color={progress.reminder?.state === "overdue" ? "var(--color-accent)" : "var(--color-primary)"} className="mt-1.5" />
            {progress.reminder && (
              <p data-state={progress.reminder.state} className="mt-1.5 flex items-center gap-1.5 text-xs font-semibold" style={{ color: REMINDER_INK[progress.reminder.state] }}>
                <Icon name={progress.reminder.state === "later" ? "calendar-clock" : "bell-ring"} className="h-3.5 w-3.5 shrink-0" />
                {describeReminder(progress.reminder, (value) => `${formatVND(value)}đ`)}
              </p>
            )}
          </li>
        ))}
      </ul>
      {ranked.length > MAX_ROWS && <div className="mt-2 text-xs text-neutral-700">+ {ranked.length - MAX_ROWS} khoản khác</div>}
    </section>
  );
}
