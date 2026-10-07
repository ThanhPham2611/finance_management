import { parseYMD, toYMD } from "./dates";

export type CalendarCell = { date: string; day: number } | null;

/** Lưới tháng `ym` (YYYY-MM), tuần bắt đầu từ Thứ Hai; `null` là ô đệm đầu/cuối tháng. */
export function buildMonthGrid(ym: string): CalendarCell[] {
  const first = parseYMD(`${ym}-01`);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const lead = (first.getDay() + 6) % 7;
  const cells: CalendarCell[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= daysInMonth; day++) {
    cells.push({ date: toYMD(new Date(first.getFullYear(), first.getMonth(), day)), day });
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/** Số tiền gọn cho ô lịch hẹp: 950 · 45k · 1,2tr. */
export function formatCompactMoney(amount: number): string {
  const value = Math.round(amount);
  const trim = (n: number) => String(Math.round(n * 10) / 10).replace(".", ",");
  if (value >= 1_000_000) return `${trim(value / 1_000_000)}tr`;
  if (value >= 1_000) return `${trim(value / 1_000)}k`;
  return String(value);
}
