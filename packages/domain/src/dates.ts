import type { MonthWindow } from "./types";

export const VN_TIME_ZONE = "Asia/Ho_Chi_Minh";

export function vietnamNow(source = new Date()): Date {
  return new Date(source.toLocaleString("sv-SE", { timeZone: VN_TIME_ZONE }));
}

export function vietnamToday(source = new Date()): string {
  return source.toLocaleDateString("en-CA", { timeZone: VN_TIME_ZONE });
}

export function parseYMD(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

export function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const YEAR_MONTH = /^(\d{4})-(0[1-9]|1[0-2])$/;

function shiftYearMonth(value: string, delta: number): string {
  const [year, month] = value.split("-").map(Number);
  const shifted = new Date(year, month - 1 + delta, 1);
  return `${shifted.getFullYear()}-${String(shifted.getMonth() + 1).padStart(2, "0")}`;
}

export function createMonthWindow(requestedMonth: string | undefined, now = vietnamNow()): MonthWindow {
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const ym = requestedMonth && YEAR_MONTH.test(requestedMonth) && requestedMonth <= current ? requestedMonth : current;
  const month = Number(ym.slice(5));
  const isCurrent = ym === current;

  return {
    ym,
    from: `${ym}-01`,
    to: `${shiftYearMonth(ym, 1)}-01`,
    label: `Giao dịch tháng ${month}`,
    month,
    isCurrent,
    prev: shiftYearMonth(ym, -1),
    next: isCurrent ? null : shiftYearMonth(ym, 1),
  };
}
