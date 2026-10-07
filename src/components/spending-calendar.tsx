"use client";

import { buildMonthGrid, formatCompactMoney } from "@hu/domain";
import { formatVND } from "@/lib/format";

const WEEKDAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];

export type DaySpend = { total: number; count: number };

/** Lịch chi tiêu của 1 tháng: số tiền đã chi in ngay dưới số ngày, ô chi càng nhiều nền hổ phách càng đậm. */
export function SpendingCalendar({
  ym,
  spendByDay,
  selected,
  today,
  onSelect,
}: {
  ym: string;
  spendByDay: Map<string, DaySpend>;
  selected: string | null;
  today: string | null;
  onSelect: (date: string) => void;
}) {
  const cells = buildMonthGrid(ym);
  const max = Math.max(0, ...Array.from(spendByDay.values(), (d) => d.total));

  return (
    <div className="rounded-card border border-divider bg-surface p-2 sm:p-4">
      <div className="mb-1 grid grid-cols-7 gap-1 text-center text-xs font-semibold text-neutral-700 sm:gap-1.5">
        {WEEKDAYS.map((d, i) => (
          <div key={d} className={`py-1 ${i === 6 ? "text-accent" : ""}`}>
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
        {cells.map((cell, i) => {
          if (!cell) return <div key={`pad-${i}`} aria-hidden="true" />;
          const spend = spendByDay.get(cell.date);
          const isSelected = cell.date === selected;
          const isToday = cell.date === today;
          const heat = spend && max > 0 ? 10 + Math.round((spend.total / max) * 34) : 0;
          return (
            <button
              key={cell.date}
              type="button"
              data-date={cell.date}
              onClick={() => onSelect(cell.date)}
              aria-pressed={isSelected}
              aria-current={isToday ? "date" : undefined}
              aria-label={`Ngày ${cell.day}${spend ? `, đã chi ${formatVND(spend.total)} ₫` : ", chưa có chi tiêu"}`}
              className="flex min-h-[58px] flex-col items-center justify-between rounded-control px-0.5 py-1.5 transition-colors sm:min-h-[64px] sm:py-2"
              style={{
                background: isSelected ? "var(--color-primary)" : heat ? `color-mix(in srgb, var(--color-accent) ${heat}%, var(--color-surface))` : "transparent",
                color: isSelected ? "var(--color-on-primary)" : undefined,
                boxShadow: isToday && !isSelected ? "inset 0 0 0 2px var(--color-primary)" : undefined,
              }}
            >
              <span className={`text-[15px] font-bold tabular-nums ${spend || isSelected ? "" : "text-neutral-600"}`}>{cell.day}</span>
              <span className={`text-[10px] font-semibold tabular-nums sm:text-xs ${isSelected ? "" : "text-accent-700"}`}>{spend ? formatCompactMoney(spend.total) : ""}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-2 px-1 text-xs text-neutral-700">
        <span>Chi ít</span>
        <span
          aria-hidden="true"
          className="h-2 flex-1 max-w-28 rounded-full"
          style={{ background: "linear-gradient(to right, color-mix(in srgb, var(--color-accent) 10%, var(--color-surface)), color-mix(in srgb, var(--color-accent) 44%, var(--color-surface)))" }}
        />
        <span>Chi nhiều</span>
      </div>
    </div>
  );
}
