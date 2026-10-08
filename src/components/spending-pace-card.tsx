import { paceMessage, type SpendingPace } from "@hu/domain";
import { Icon } from "@/components/icon";
import { formatVND } from "@/lib/format";

const TONE = {
  neutral: { bg: "var(--color-surface)", ink: "var(--color-text)", icon: "gauge" },
  good: { bg: "oklch(0.52 0.10 155 / 0.16)", ink: "var(--color-green-ink)", icon: "circle-check" },
  warn: { bg: "oklch(0.70 0.15 68 / 0.16)", ink: "var(--color-amber-ink)", icon: "triangle-alert" },
  danger: { bg: "#FDECEA", ink: "var(--color-destructive)", icon: "triangle-alert" },
} as const;

/** Chia hết ngân sách các hũ ra từng ngày, so với tốc độ chi thực tế. */
export function SpendingPaceCard({ pace }: { pace: SpendingPace }) {
  const message = paceMessage(pace, (value) => `${formatVND(value)}đ`);
  if (!message) return null;
  const tone = TONE[message.tone];
  const showNumbers = pace.status !== "early";

  return (
    <section data-testid="spending-pace" data-status={pace.status} aria-label="Tốc độ chi tiêu mỗi ngày" className="rounded-card border border-divider p-4 shadow-sm" style={{ background: tone.bg, color: tone.ink }}>
      <div className="flex items-start gap-2.5">
        <Icon name={tone.icon} className="mt-0.5 h-[18px] w-[18px] shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="text-[10px] tracking-[0.12em] uppercase opacity-80">Chi tiêu mỗi ngày</div>
          <div className="mt-0.5 text-[15px] font-semibold">{message.title}</div>
          <p className="mt-1 text-[13px] leading-5">{message.detail}</p>
        </div>
      </div>
      {showNumbers && (
        <dl className="mt-3 grid grid-cols-2 gap-3 border-t border-current/20 pt-3 text-xs">
          <div>
            <dt className="opacity-80">Các hũ cho phép</dt>
            <dd className="mt-0.5 font-heading text-lg font-extrabold tabular-nums">{formatVND(pace.dailyBudget)}đ/ngày</dd>
          </div>
          <div>
            <dt className="opacity-80">Bạn đang chi TB</dt>
            <dd className="mt-0.5 font-heading text-lg font-extrabold tabular-nums">{formatVND(pace.dailyAverage)}đ/ngày</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
