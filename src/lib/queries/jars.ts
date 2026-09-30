import type { SupabaseClient } from "@supabase/supabase-js";
import { vnNow } from "@/lib/format";

export type RealJar = {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthlyBudget: number;
  spent: number;
  isShared: boolean;
  alertAt80: boolean;
  rollover: boolean;
  isSavings: boolean;
};

/** Dau thang hien tai theo gio VN, dang "YYYY-MM-01" (cot date trong Postgres). */
export function currentMonthStart(): string {
  const now = vnNow();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
}

/**
 * Lay danh sach hu ngan sach ma user hien tai xem duoc (hu cua chinh minh,
 * cong voi hu quy chung cua ca gia dinh neu co) kem so tien da chi trong
 * thang nay. RLS tren bang `jars`/`transactions` la noi thuc su gioi han
 * pham vi truy cap — ham nay khong loc them theo user_id nua, vi hu quy
 * chung can hien thi tien chi cua ca 2 nguoi trong gia dinh, khong chi
 * cua nguoi dang xem.
 */
export async function listJarsWithSpent(supabase: SupabaseClient): Promise<RealJar[]> {
  const monthStart = currentMonthStart();

  const [{ data: jars, error: jarsError }, { data: txs, error: txError }] = await Promise.all([
    supabase
      .from("jars")
      .select("id, name, icon, color, monthly_budget, is_shared, alert_at_80, rollover, is_savings")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("transactions").select("jar_id, amount, type").gte("transaction_date", monthStart),
  ]);

  if (jarsError) throw jarsError;
  if (txError) throw txError;

  // Khoan nap ("deposit") tru NGUOC vao spent — voi hu tiet kiem day la co
  // che duy nhat khien "con lai" tang len khi nap them tien giua thang.
  const spentByJar = new Map<string, number>();
  for (const t of txs ?? []) {
    const delta = t.type === "deposit" ? -Number(t.amount) : Number(t.amount);
    spentByJar.set(t.jar_id, (spentByJar.get(t.jar_id) ?? 0) + delta);
  }

  return (jars ?? []).map((j) => ({
    id: j.id,
    name: j.name,
    icon: j.icon ?? "wallet",
    color: j.color ?? "var(--color-accent)",
    monthlyBudget: Number(j.monthly_budget),
    spent: spentByJar.get(j.id) ?? 0,
    isShared: j.is_shared,
    alertAt80: j.alert_at_80,
    rollover: j.rollover,
    isSavings: j.is_savings,
  }));
}

/** Lay 1 hu cu the (RLS tu chan neu khong phai chu so huu/thanh vien gia dinh). */
export async function getJarWithSpent(supabase: SupabaseClient, jarId: string): Promise<RealJar | null> {
  const jars = await listJarsWithSpent(supabase);
  return jars.find((j) => j.id === jarId) ?? null;
}

export type JarStats = {
  left: number;
  pct: number;
  over: boolean;
  near: boolean;
  pctLabel: string;
  leftWord: string;
  leftAmount: string;
  barColor: string;
  inkColor: string;
  tileBg: string;
  rowBg: string;
  /** Du bao: neu chi tieu voi toc do hien tai, cuoi thang co the vuot ngan sach
   * (dua tren spent/ngay-da-qua x tong-ngay-trong-thang). Chi bat khi chua
   * vuot thuc te (!over) va da qua it nhat 3 ngay trong thang de tranh du bao
   * nhieu nhieu tu 1-2 giao dich dau thang. */
  willExceed: boolean;
  projectedSpent: number;
  projectedOverAmount: number;
};

const AMBER = "oklch(0.70 0.15 68)";
const MIN_DAYS_FOR_PREDICTION = 3;

export function jarStats(jar: RealJar, formatVND: (n: number) => string, now: Date = vnNow()): JarStats {
  const left = jar.monthlyBudget - jar.spent;
  const pct = jar.monthlyBudget ? jar.spent / jar.monthlyBudget : 0;
  const over = left < 0;
  const near = !over && jar.alertAt80 && pct >= 0.8;

  const dayOfMonth = now.getDate();
  const totalDaysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const canPredict = jar.monthlyBudget > 0 && dayOfMonth >= MIN_DAYS_FOR_PREDICTION;
  const projectedSpent = canPredict ? (jar.spent / dayOfMonth) * totalDaysInMonth : jar.spent;
  const willExceed = jar.alertAt80 && !over && canPredict && projectedSpent > jar.monthlyBudget;

  return {
    left,
    pct: Math.min(100, Math.round(pct * 100)),
    over,
    near,
    pctLabel: `${Math.min(100, Math.round(pct * 100))}%`,
    leftWord: over ? "vượt" : "còn",
    leftAmount: formatVND(Math.abs(left)),
    barColor: over ? "var(--color-accent)" : near ? AMBER : willExceed ? AMBER : jar.color,
    inkColor: over ? "var(--color-accent-700)" : "var(--color-text)",
    tileBg: over ? "var(--color-accent-100)" : "var(--color-bg)",
    rowBg: over ? "var(--color-accent-100)" : "transparent",
    willExceed,
    projectedSpent,
    projectedOverAmount: Math.max(0, projectedSpent - jar.monthlyBudget),
  };
}

/** Ten hien thi cua 1 hu — them hau to "(gia đình)" cho hu quy chung, hoac
 * "(tiết kiệm)" cho hu tiet kiem, de phan biet voi hu ca nhan cung ten (vd
 * ca 2 deu co hu "An uong"), vi icon giong het nhau nen chi nhin icon la
 * khong du de biet hu nao. 2 hau to khong bao gio cung xuat hien (hu tiet
 * kiem luon la hu ca nhan, xem jar-edit-form.tsx). */
export function jarLabel(jar: Pick<RealJar, "name" | "isShared" | "isSavings">): string {
  return jar.isShared ? `${jar.name} (gia đình)` : jar.isSavings ? `${jar.name} (tiết kiệm)` : jar.name;
}

export function totalBudget(jars: RealJar[]): number {
  return jars.reduce((sum, j) => sum + j.monthlyBudget, 0);
}

export function totalSpent(jars: RealJar[]): number {
  return jars.reduce((sum, j) => sum + j.spent, 0);
}
