import { calculateJarStats, formatMoney, type Jar } from "@hu/domain";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

/** Số ngày còn lại của tháng, tính cả hôm nay (tối thiểu 1). */
export function daysLeftInMonth(now: Date): number {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  return Math.max(1, lastDay - now.getDate() + 1);
}

export type JarBanner = { tone: "danger" | "warning"; text: string };

/** Số liệu màn chi tiết hũ, cùng quy tắc với trang /jars/[id] của web. `now` là giờ Việt Nam. */
export function jarDetail(jar: Jar, now: Date) {
  const stats = calculateJarStats(jar, now);
  const daysLeft = daysLeftInMonth(now);
  const remaining = Math.max(0, stats.left);
  let banner: JarBanner | null = null;
  if (!jar.isSavings) {
    if (stats.over) banner = { tone: "danger", text: `Đã vượt ngân sách ${vnd(Math.abs(stats.left))}.` };
    else if (stats.near) banner = { tone: "warning", text: `Đã dùng ${stats.pct}% khi còn ${daysLeft} ngày.` };
    else if (stats.willExceed) banner = { tone: "warning", text: `Với tốc độ chi hiện tại, hũ này có thể vượt ngân sách khoảng ${vnd(stats.projectedOverAmount)} vào cuối tháng.` };
  }
  return {
    stats,
    daysLeft,
    remaining,
    perDayLeft: remaining / daysLeft,
    avgPerDay: now.getDate() ? Math.round(jar.spent / now.getDate()) : 0,
    banner,
  };
}

/** Tổng quan danh sách hũ. Hũ tiết kiệm không nằm trong tổng ngân sách hay "Cần chú ý" (không phải tiền để chi). */
export function jarsOverview(jars: Jar[], now: Date) {
  const spendable = jars.filter((jar) => !jar.isSavings);
  const budgetSum = spendable.reduce((sum, jar) => sum + jar.monthlyBudget, 0);
  const needsAttention = spendable.filter((jar) => {
    const stats = calculateJarStats(jar, now);
    return stats.over || stats.near || stats.willExceed;
  }).length;
  return {
    budgetSum,
    needsAttention,
    shares: spendable.map((jar) => ({ id: jar.id, color: jar.color, share: budgetSum ? (jar.monthlyBudget / budgetSum) * 100 : 0 })),
  };
}
