import type { TransactionWithJar } from "@hu/data";
import { calculateJarStats, formatMoney, parseYMD, toYMD, type Jar } from "@hu/domain";

const vnd = (value: number) => `${formatMoney(value)} ₫`;
const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** Dòng cảnh báo gộp trên Tổng quan: hũ đã vượt · hũ gần hết · hũ có thể vượt nếu chi tiếp với tốc độ này. Hũ tiết kiệm không tính. */
export function overviewAlert(jars: Jar[], now: Date): string | null {
  const spendable = jars.filter((jar) => !jar.isSavings);
  const stats = (jar: Jar) => calculateJarStats(jar, now);
  const over = spendable.find((jar) => stats(jar).over);
  const near = spendable.find((jar) => stats(jar).near);
  // Dự báo chỉ nêu hũ chưa nằm trong cảnh báo "gần hết" để không lặp.
  const predicted = spendable.find((jar) => jar.id !== near?.id && stats(jar).willExceed);
  const parts = [
    over && `${over.name} vượt ${vnd(Math.abs(stats(over).left))}`,
    near && `${near.name} đã dùng ${stats(near).pct}%`,
    predicted && `${predicted.name} có thể vượt ~${vnd(stats(predicted).projectedOverAmount)} nếu chi tiếp với tốc độ này`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

const addDays = (date: Date, days: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

/** Ngày đầu của cửa sổ 7 ngày kết thúc hôm nay (YYYY-MM-DD). */
export function weekStart(now: Date): string {
  return toYMD(addDays(now, -6));
}

export type WeekDay = { date: string; label: string; value: number };

/** Chi 7 ngày gần nhất, gộp theo ngày; khoản nạp không phải "đã chi" nên bị loại. Luôn trả đủ 7 ngày, cũ → mới. */
export function weekSpend(transactions: Pick<TransactionWithJar, "transactionDate" | "amount" | "type">[], now: Date): WeekDay[] {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "deposit") totals.set(t.transactionDate, (totals.get(t.transactionDate) ?? 0) + t.amount);
  }
  return Array.from({ length: 7 }, (_, index) => {
    const date = toYMD(addDays(now, index - 6));
    return { date, label: WEEKDAYS_SHORT[parseYMD(date).getDay()], value: totals.get(date) ?? 0 };
  });
}
