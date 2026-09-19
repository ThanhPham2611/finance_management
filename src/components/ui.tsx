import { Icon } from "@/components/icon";
import { formatVND } from "@/lib/format";

export function ProgressBar({
  pct,
  color,
  height = 5,
  className = "",
}: {
  pct: number;
  color: string;
  height?: number;
  className?: string;
}) {
  return (
    <div className={`flex bg-neutral-300 ${className}`} style={{ height }}>
      <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, background: color }} />
    </div>
  );
}

export function ShareBar({
  segments,
  height = 12,
  className = "",
}: {
  segments: { hue: string; share: number }[];
  height?: number;
  className?: string;
}) {
  return (
    <div className={`flex gap-px ${className}`} style={{ height }}>
      {segments.map((s, i) => (
        <div key={i} style={{ width: `${s.share}%`, background: s.hue }} />
      ))}
    </div>
  );
}

/** Text input that shows a live "1.600.000"-style thousand separator while typing,
 * instead of a native number input's plain digit string. */
export function MoneyInput({
  value,
  onChange,
  className = "",
  ...props
}: {
  value: number;
  onChange: (amount: number) => void;
  className?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type">) {
  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={value ? formatVND(value) : ""}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "");
        onChange(digits ? Number(digits) : 0);
      }}
      className={className}
      {...props}
    />
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 border-b border-divider py-3.5 text-left last:border-b-0"
    >
      <div className="flex-1">
        <div className="text-[13px] font-semibold">{label}</div>
        <div className="text-[11px] text-neutral-700">{hint}</div>
      </div>
      <div
        className="flex h-6 w-[42px] items-center p-[3px]"
        style={{
          background: checked ? "var(--color-accent)" : "var(--color-bg)",
          border: checked ? "none" : "1px solid var(--color-divider)",
          justifyContent: checked ? "flex-end" : "flex-start",
        }}
      >
        <div className="h-[18px] w-[18px]" style={{ background: checked ? "var(--color-bg)" : "var(--color-neutral-400)" }} />
      </div>
    </button>
  );
}

type BannerTone = "accent" | "amber" | "green";

const BANNER_TONE: Record<BannerTone, { bg: string; ink: string }> = {
  accent: { bg: "var(--color-accent)", ink: "var(--color-bg)" },
  amber: { bg: "oklch(0.70 0.15 68 / 0.16)", ink: "var(--color-amber-ink)" },
  green: { bg: "oklch(0.52 0.10 155 / 0.16)", ink: "var(--color-green-ink)" },
};

export function Banner({
  icon,
  tone,
  children,
}: {
  icon: string;
  tone: BannerTone;
  children: React.ReactNode;
}) {
  const t = BANNER_TONE[tone];
  return (
    <div className="flex items-center gap-2.5 px-4 py-3 text-[13px]" style={{ background: t.bg, color: t.ink }}>
      <Icon name={icon} className="h-[17px] w-[17px] shrink-0" />
      <div className="flex-1">{children}</div>
    </div>
  );
}

