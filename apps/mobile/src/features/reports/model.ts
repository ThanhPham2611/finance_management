import type { TransactionWithJar } from "@hu/data";
import { parseYMD, toYMD, vietnamNow } from "@hu/domain";

export type ReportRangeId = "week" | "month" | "half";

export type ReportBucket = { key: string; label: string; from: string; toExclusive: string; value: number };

export type ReportJarRow = {
  jarId: string;
  name: string;
  color: string;
  total: number;
  /** Chi của hũ này ở kỳ trước, để hiện chênh lệch từng hũ. */
  previousTotal: number;
  percentage: number;
  count: number;
  isActive: boolean;
};

export type ReportData = {
  rangeId: ReportRangeId;
  label: string;
  note: string;
  currentFrom: string;
  currentToExclusive: string;
  previousFrom: string;
  previousToExclusive: string;
  total: number;
  previousTotal: number;
  delta: number;
  buckets: ReportBucket[];
  initialBucketIndex: number;
  jars: ReportJarRow[];
};

const COPY: Record<ReportRangeId, { label: string; note: string }> = {
  week: { label: "Tuần này", note: "tuần này" },
  month: { label: "Tháng này", note: "tháng này" },
  half: { label: "6 tháng", note: "6 tháng" },
};

const monthStart = (year: number, month: number) => toYMD(new Date(year, month, 1));
const addDays = (ymd: string, days: number) => {
  const d = parseYMD(ymd);
  return toYMD(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
};

/** Earliest date any report needs: start of the previous six-month window. */
export function reportsFetchSince(source: Date = new Date()): string {
  const now = vietnamNow(source);
  return monthStart(now.getFullYear(), now.getMonth() - 11);
}

function buildRange(rangeId: ReportRangeId, source: Date) {
  const now = vietnamNow(source);
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = toYMD(now);

  if (rangeId === "week") {
    const currentToExclusive = addDays(today, 1);
    const currentFrom = addDays(currentToExclusive, -7);
    const buckets = Array.from({ length: 7 }, (_, i) => {
      const from = addDays(currentFrom, i);
      const [, m, d] = from.split("-");
      return { key: from, label: `${Number(d)}/${Number(m)}`, from, toExclusive: addDays(from, 1), value: 0 };
    });
    return { currentFrom, currentToExclusive, previousFrom: addDays(currentFrom, -7), buckets, initialBucketIndex: 6 };
  }

  if (rangeId === "month") {
    const currentFrom = monthStart(year, month);
    const currentToExclusive = monthStart(year, month + 1);
    const days = new Date(year, month + 1, 0).getDate();
    const buckets = Array.from({ length: Math.ceil(days / 7) }, (_, i) => {
      const from = addDays(currentFrom, i * 7);
      const next = addDays(from, 7);
      return {
        key: from,
        label: `${i * 7 + 1}-${Math.min((i + 1) * 7, days)}`,
        from,
        toExclusive: next < currentToExclusive ? next : currentToExclusive,
        value: 0,
      };
    });
    return {
      currentFrom,
      currentToExclusive,
      previousFrom: monthStart(year, month - 1),
      buckets,
      initialBucketIndex: Math.floor((now.getDate() - 1) / 7),
    };
  }

  const currentFrom = monthStart(year, month - 5);
  const buckets = Array.from({ length: 6 }, (_, i) => {
    const from = monthStart(year, month - 5 + i);
    return { key: from, label: `T${Number(from.slice(5, 7))}`, from, toExclusive: monthStart(year, month - 4 + i), value: 0 };
  });
  return {
    currentFrom,
    currentToExclusive: monthStart(year, month + 1),
    previousFrom: monthStart(year, month - 11),
    buckets,
    initialBucketIndex: 5,
  };
}

export function buildReport(
  transactions: TransactionWithJar[],
  activeJarIds: ReadonlySet<string>,
  rangeId: ReportRangeId,
  source: Date = new Date(),
): ReportData {
  const { currentFrom, currentToExclusive, previousFrom, buckets, initialBucketIndex } = buildRange(rangeId, source);
  const previousToExclusive = currentFrom;
  const jarMap = new Map<string, ReportJarRow>();
  const previousByJar = new Map<string, number>();
  let total = 0;
  let previousTotal = 0;

  for (const t of transactions) {
    if (t.type !== "expense") continue;
    const date = t.transactionDate;
    if (date >= previousFrom && date < previousToExclusive) {
      previousTotal += t.amount;
      previousByJar.set(t.jarId, (previousByJar.get(t.jarId) ?? 0) + t.amount);
      continue;
    }
    if (date < currentFrom || date >= currentToExclusive) continue;

    total += t.amount;
    const bucket = buckets.find((b) => date >= b.from && date < b.toExclusive);
    if (bucket) bucket.value += t.amount;

    const row = jarMap.get(t.jarId);
    if (row) {
      row.total += t.amount;
      row.count += 1;
    } else {
      jarMap.set(t.jarId, {
        jarId: t.jarId,
        name: t.jarName,
        color: t.jarColor,
        total: t.amount,
        previousTotal: 0,
        percentage: 0,
        count: 1,
        isActive: activeJarIds.has(t.jarId),
      });
    }
  }

  const jars = [...jarMap.values()]
    .map((jar) => ({ ...jar, previousTotal: previousByJar.get(jar.jarId) ?? 0, percentage: total > 0 ? (jar.total / total) * 100 : 0 }))
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "vi"));

  return {
    rangeId,
    ...COPY[rangeId],
    currentFrom,
    currentToExclusive,
    previousFrom,
    previousToExclusive,
    total,
    previousTotal,
    delta: total - previousTotal,
    buckets,
    initialBucketIndex,
    jars,
  };
}
