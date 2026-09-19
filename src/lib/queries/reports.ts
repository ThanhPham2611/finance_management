import type { RealJar } from "@/lib/queries/jars";
import { vnNow } from "@/lib/format";
import { parseYMD, toYMD, weekdayShort, type RealTransactionWithJar } from "@/lib/queries/transactions";

export type RangeId = "week" | "month" | "half";

export type RangeData = {
  id: RangeId;
  label: string;
  note: string;
  total: number;
  prev: number;
  chartTitle: string;
  labels: string[];
  values: number[];
  activeIdx: number;
};

function ymdMonthsAgo(n: number): string {
  const now = vnNow();
  const d = new Date(now.getFullYear(), now.getMonth() - n, 1);
  return toYMD(d);
}

/** Ngay bat dau cua khoang du lieu can lay de tinh du ca 3 range (ke ca ky truoc de so sanh). */
export function reportsFetchSince(): string {
  return ymdMonthsAgo(11); // 12 thang tinh ca thang hien tai
}

function sumInRange(transactions: { transactionDate: string; amount: number }[], from: string, toExclusive: string): number {
  return transactions.filter((t) => t.transactionDate >= from && t.transactionDate < toExclusive).reduce((s, t) => s + t.amount, 0);
}

export function buildRanges(transactions: RealTransactionWithJar[]): RangeData[] {
  const today = vnNow();
  today.setHours(0, 0, 0, 0);

  // — Tuần: 7 ngay gan nhat theo ngay —
  const weekDates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    weekDates.push(toYMD(d));
  }
  const weekValues = weekDates.map((ymd) => sumInRange(transactions, ymd, toYMD(addDays(parseYMD(ymd), 1))));
  const weekPrevFrom = toYMD(addDays(parseYMD(weekDates[0]), -7));
  const weekPrevTo = weekDates[0];
  const weekPrevTotal = sumInRange(transactions, weekPrevFrom, weekPrevTo);

  const week: RangeData = {
    id: "week",
    label: "Tuần này",
    note: "tuần này",
    total: weekValues.reduce((a, b) => a + b, 0),
    prev: weekPrevTotal,
    chartTitle: "Chi 7 ngày",
    labels: weekDates.map(weekdayShort),
    values: weekValues,
    activeIdx: weekValues.length - 1,
  };

  // — Thang: thang hien tai, chia theo tuan (T1..T5) —
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const weekBucketCount = Math.ceil(daysInMonth / 7);
  const monthValues = Array.from({ length: weekBucketCount }, (_, wIdx) => {
    const fromDay = wIdx * 7 + 1;
    const toDay = Math.min(fromDay + 7, daysInMonth + 1);
    const from = `${monthStart.slice(0, 8)}${String(fromDay).padStart(2, "0")}`;
    const to = toDay > daysInMonth ? toYMD(new Date(today.getFullYear(), today.getMonth() + 1, 1)) : `${monthStart.slice(0, 8)}${String(toDay).padStart(2, "0")}`;
    return sumInRange(transactions, from, to);
  });
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStart = toYMD(prevMonthDate);
  const monthPrevTotal = sumInRange(transactions, prevMonthStart, monthStart);

  const month: RangeData = {
    id: "month",
    label: `Tháng ${today.getMonth() + 1}`,
    note: "tháng này",
    total: monthValues.reduce((a, b) => a + b, 0),
    prev: monthPrevTotal,
    chartTitle: "Chi theo tuần",
    labels: monthValues.map((_, i) => `T${i + 1}`),
    values: monthValues,
    activeIdx: Math.min(monthValues.length - 1, Math.floor((today.getDate() - 1) / 7)),
  };

  // — 6 thang: tong theo thang —
  const halfMonths: { start: string; end: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const start = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - i + 1, 1);
    halfMonths.push({ start: toYMD(start), end: toYMD(end), label: `T${start.getMonth() + 1}` });
  }
  const halfValues = halfMonths.map((m) => sumInRange(transactions, m.start, m.end));
  const halfPrevFrom = toYMD(new Date(today.getFullYear(), today.getMonth() - 11, 1));
  const halfPrevTo = halfMonths[0].start;
  const halfPrevTotal = sumInRange(transactions, halfPrevFrom, halfPrevTo);

  const half: RangeData = {
    id: "half",
    label: "6 tháng",
    note: "6 tháng",
    total: halfValues.reduce((a, b) => a + b, 0),
    prev: halfPrevTotal,
    chartTitle: "Chi theo tháng",
    labels: halfMonths.map((m) => m.label),
    values: halfValues,
    activeIdx: halfValues.length - 1,
  };

  return [week, month, half];
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export type JarSpendRow = {
  jar: RealJar;
  spent: number;
  prevSpent: number;
  count: number;
};

/** So lieu "Theo hu": chi thang nay + thang truoc + so luot giao dich, tu cung 1 danh sach giao dich 12 thang. */
export function buildJarSpendRows(jars: RealJar[], transactions: RealTransactionWithJar[]): JarSpendRow[] {
  const today = vnNow();
  const monthStart = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;
  const prevMonthDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthStart = toYMD(prevMonthDate);

  return jars.map((jar) => {
    const own = transactions.filter((t) => t.jarId === jar.id);
    const spent = sumInRange(own, monthStart, toYMD(new Date(today.getFullYear(), today.getMonth() + 1, 1)));
    const prevSpent = sumInRange(own, prevMonthStart, monthStart);
    const count = own.filter((t) => t.transactionDate >= monthStart).length;
    return { jar, spent, prevSpent, count };
  });
}
