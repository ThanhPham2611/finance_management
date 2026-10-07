import { parseYMD, vietnamNow } from "./dates";
import type { TransactionType } from "./types";

const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];

export function formatDayLabel(dateValue: string, now = vietnamNow()): string {
  const date = parseYMD(dateValue);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const difference = Math.round((today.getTime() - date.getTime()) / 86_400_000);
  const dayMonth = `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;

  if (difference === 0) return `Hôm nay · ${dayMonth}`;
  if (difference === 1) return `Hôm qua · ${dayMonth}`;
  return `${WEEKDAYS[date.getDay()]} · ${dayMonth}`;
}

export function groupTransactionsByDay<T extends { transactionDate: string; amount: number; type?: TransactionType }>(
  transactions: T[],
  now = vietnamNow(),
) {
  const groups = new Map<string, T[]>();
  for (const transaction of transactions) {
    const items = groups.get(transaction.transactionDate) ?? [];
    items.push(transaction);
    groups.set(transaction.transactionDate, items);
  }

  return Array.from(groups.entries())
    .sort(([left], [right]) => (left < right ? 1 : -1))
    .map(([date, items]) => ({
      date,
      dayLabel: formatDayLabel(date, now),
      items,
      total: items.reduce((sum, transaction) => sum + (transaction.type === "deposit" ? 0 : transaction.amount), 0),
    }));
}
