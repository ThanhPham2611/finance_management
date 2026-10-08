import { Icon } from "@/components/icon";

type Option<T extends string> = { id: T; label: string; icon?: string };

/** Nhóm nút chọn 1 trong N dạng thanh phân đoạn (cao 44px, cùng chiều cao với `.input`). `iconOnly` ẩn chữ nhưng vẫn giữ tên truy cập. */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
  iconOnly = false,
  className = "",
}: {
  label: string;
  options: readonly Option<T>[];
  value: T;
  onChange: (id: T) => void;
  iconOnly?: boolean;
  className?: string;
}) {
  return (
    <div role="group" aria-label={label} className={`flex gap-0.5 rounded-control bg-surface-subtle p-[3px] ${className}`}>
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={active}
            aria-label={iconOnly ? o.label : undefined}
            title={iconOnly ? o.label : undefined}
            onClick={() => onChange(o.id)}
            className={`flex h-[38px] flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[8px] px-3 text-sm font-semibold transition-colors ${active ? "bg-primary text-on-primary shadow-sm" : "text-neutral-700 hover:text-text"}`}
          >
            {o.icon && <Icon name={o.icon} className="h-4 w-4" aria-hidden />}
            {!iconOnly && o.label}
          </button>
        );
      })}
    </div>
  );
}
