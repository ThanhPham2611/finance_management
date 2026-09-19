import type { SupabaseClient } from "@supabase/supabase-js";
import { vnNow } from "@/lib/format";

/**
 * Gamification (streak + huy hieu) — tinh HOAN TOAN tu du lieu da co san
 * (incomes/jar_allocations tu migration_008, transactions), KHONG can
 * migration hay bang moi. Thang nao chua tung bam "Ap dung" o /allocate
 * (khong co dong trong incomes) thi hasData=false — khong the xac nhan
 * la co giu duoc ngan sach hay khong nen KHONG tinh vao streak (lam dut
 * streak thay vi bo qua, de tranh "gian lan" streak bang cach khong bao
 * gio chia luong).
 */
export type MonthPerformance = {
  periodMonth: string;
  label: string;
  hasData: boolean;
  withinBudget: boolean;
  overJarNames: string[];
};

function monthLabel(periodMonth: string): string {
  const [y, m] = periodMonth.split("-").map(Number);
  return `Tháng ${m}, ${y}`;
}

function shiftMonth(base: Date, offset: number): string {
  const d = new Date(base.getFullYear(), base.getMonth() + offset, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Hieu suat cua monthsBack thang GAN NHAT DA HOAN TAT (khong tinh thang
 * hien tai dang chay do, vi chua ket thuc thi chua the biet co vuot hay
 * khong), tra ve theo thu tu tu cu -> moi.
 */
export async function getRecentMonthsPerformance(
  supabase: SupabaseClient,
  userId: string,
  monthsBack = 12
): Promise<MonthPerformance[]> {
  const now = vnNow();
  const periods = Array.from({ length: monthsBack }, (_, i) => shiftMonth(now, -(monthsBack - i)));
  const currentMonth = shiftMonth(now, 0);

  const { data: incomeRows } = await supabase
    .from("incomes")
    .select("id, period_month")
    .eq("user_id", userId)
    .in("period_month", periods);

  const incomeIdByPeriod = new Map<string, string>();
  for (const row of incomeRows ?? []) incomeIdByPeriod.set(row.period_month as string, row.id as string);

  const incomeIds = [...incomeIdByPeriod.values()];
  const { data: allocRows } = incomeIds.length
    ? await supabase.from("jar_allocations").select("income_id, jar_id, amount").in("income_id", incomeIds)
    : { data: [] as { income_id: string; jar_id: string; amount: number }[] };

  const jarIds = [...new Set((allocRows ?? []).map((r) => r.jar_id as string))];

  const [{ data: jarRows }, { data: txs }] = await Promise.all([
    jarIds.length
      ? supabase.from("jars").select("id, name").in("id", jarIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    jarIds.length
      ? supabase
          .from("transactions")
          .select("jar_id, amount, transaction_date")
          .in("jar_id", jarIds)
          .gte("transaction_date", periods[0])
          .lt("transaction_date", currentMonth)
      : Promise.resolve({ data: [] as { jar_id: string; amount: number; transaction_date: string }[] }),
  ]);

  const jarNameById = new Map((jarRows ?? []).map((j) => [j.id as string, j.name as string]));

  const spentByPeriodJar = new Map<string, Map<string, number>>();
  for (const t of txs ?? []) {
    const period = `${(t.transaction_date as string).slice(0, 7)}-01`;
    if (!spentByPeriodJar.has(period)) spentByPeriodJar.set(period, new Map());
    const m = spentByPeriodJar.get(period)!;
    m.set(t.jar_id as string, (m.get(t.jar_id as string) ?? 0) + Number(t.amount));
  }

  return periods.map((periodMonth) => {
    const incomeId = incomeIdByPeriod.get(periodMonth);
    const allocs = incomeId ? (allocRows ?? []).filter((r) => r.income_id === incomeId) : [];
    if (!incomeId || allocs.length === 0) {
      return { periodMonth, label: monthLabel(periodMonth), hasData: false, withinBudget: false, overJarNames: [] };
    }
    const spentByJar = spentByPeriodJar.get(periodMonth) ?? new Map<string, number>();
    const overJarNames: string[] = [];
    for (const a of allocs) {
      const spent = spentByJar.get(a.jar_id as string) ?? 0;
      if (spent > Number(a.amount) + 0.01) overJarNames.push(jarNameById.get(a.jar_id as string) ?? "?");
    }
    return { periodMonth, label: monthLabel(periodMonth), hasData: true, withinBudget: overJarNames.length === 0, overJarNames };
  });
}

/** Streak = so thang LIEN TIEP GAN NHAT (tinh nguoc tu thang ngay truoc
 * thang hien tai) khong vuot ngan sach o hu nao co lich su. Gap "khong co
 * du lieu" lam DUT streak. */
export function computeStreak(performances: MonthPerformance[]): number {
  let streak = 0;
  for (let i = performances.length - 1; i >= 0; i--) {
    const p = performances[i];
    if (!p.hasData || !p.withinBudget) break;
    streak++;
  }
  return streak;
}

export type Badge = {
  id: string;
  name: string;
  description: string;
  icon: string;
  achieved: boolean;
};

const STREAK_TIERS: { id: string; threshold: number; name: string; icon: string }[] = [
  { id: "streak-1", threshold: 1, name: "Tháng đầu trong ngân sách", icon: "sprout" },
  { id: "streak-3", threshold: 3, name: "3 tháng liên tiếp", icon: "flame" },
  { id: "streak-6", threshold: 6, name: "Nửa năm kỷ luật", icon: "medal" },
  { id: "streak-12", threshold: 12, name: "1 năm không vượt ngân sách", icon: "trophy" },
];

export function computeBadges(streak: number, performances: MonthPerformance[]): Badge[] {
  const streakBadges: Badge[] = STREAK_TIERS.map((t) => ({
    id: t.id,
    name: t.name,
    description: `Giữ ngân sách đúng hạn ${t.threshold} tháng liên tiếp.`,
    icon: t.icon,
    achieved: streak >= t.threshold,
  }));

  const monthsWithData = performances.filter((p) => p.hasData).length;
  const perfectMonths = performances.filter((p) => p.hasData && p.withinBudget).length;
  const perfectRate = monthsWithData > 0 ? perfectMonths / monthsWithData : 0;

  const extraBadges: Badge[] = [
    {
      id: "first-apply",
      name: "Bắt đầu chia lương",
      description: 'Áp dụng "Chia lương" ít nhất 1 tháng.',
      icon: "rocket",
      achieved: monthsWithData >= 1,
    },
    {
      id: "consistency",
      name: "Người kỷ luật",
      description: "Giữ đúng ngân sách ở ít nhất 80% số tháng đã theo dõi (tối thiểu 3 tháng có dữ liệu).",
      icon: "shield-check",
      achieved: monthsWithData >= 3 && perfectRate >= 0.8,
    },
  ];

  return [...streakBadges, ...extraBadges];
}
