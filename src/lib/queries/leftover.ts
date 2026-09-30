import type { SupabaseClient } from "@supabase/supabase-js";
import { currentMonthStart } from "@/lib/queries/jars";
import { vnNow } from "@/lib/format";

/** Dau thang truoc thang hien tai, dang "YYYY-MM-01" (dung cho cot date). */
export function previousMonthStart(now: Date = vnNow()): string {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `${prev.getFullYear()}-${String(prev.getMonth() + 1).padStart(2, "0")}-01`;
}

/** "Tháng N, YYYY" cho thang ngay truoc thang hien tai — dung khi hien banner. */
export function previousMonthLabel(now: Date = vnNow()): string {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `Tháng ${prev.getMonth() + 1}, ${prev.getFullYear()}`;
}

export const SAVINGS_JAR_NAME = "Quỹ dư";

/** Tim hu "Quy du" mac dinh cua user (danh dau qua is_default_savings),
 * tu tao neu chua co. Dung is_default_savings thay vi so sanh ten de
 * user doi ten hu thoai mai ma khong lam gay logic. */
export async function getOrCreateSavingsJar(supabase: SupabaseClient, userId: string): Promise<{ id: string }> {
  const { data: existing, error: findError } = await supabase
    .from("jars")
    .select("id")
    .eq("user_id", userId)
    .eq("is_default_savings", true)
    .maybeSingle();
  if (findError) throw findError;
  if (existing) return { id: existing.id };

  const { data: created, error: createError } = await supabase
    .from("jars")
    .insert({
      user_id: userId,
      name: SAVINGS_JAR_NAME,
      icon: "piggy-bank",
      color: "#10B981",
      monthly_budget: 0,
      alert_at_80: false,
      rollover: true,
      is_shared: false,
      household_id: null,
      is_default_savings: true,
      is_savings: true,
      sort_order: 999,
    })
    .select("id")
    .single();
  if (createError) throw createError;
  return { id: created.id };
}

export type MonthEndJarInfo = {
  jarId: string;
  jarName: string;
  jarIcon: string;
  jarColor: string;
  budget: number;
  spent: number;
  leftover: number;
};

type CandidateJarRow = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  monthly_budget: number;
  created_at: string;
};

/** Hu ca nhan (khong phai Quy du) cua user, da ton tai truoc thang hien
 * tai, loc theo co rollover, kem tien du thang truoc (chi tra ve khi >
 * 0.01 — bo qua sai so lam tron va hu khong con gi de xu ly). */
async function computeMonthEndCandidates(supabase: SupabaseClient, userId: string, rollover: boolean): Promise<MonthEndJarInfo[]> {
  const periodMonth = previousMonthStart();
  const monthNow = currentMonthStart();

  const { data: jars, error: jarsError } = await supabase
    .from("jars")
    .select("id, name, icon, color, monthly_budget, created_at")
    .eq("user_id", userId)
    .eq("is_shared", false)
    .eq("is_active", true)
    .eq("is_default_savings", false)
    .eq("rollover", rollover)
    .lt("created_at", monthNow);
  if (jarsError) throw jarsError;
  if (!jars || jars.length === 0) return [];

  const jarIds = jars.map((j) => j.id);

  const { data: existingEvents, error: eventsError } = await supabase
    .from("jar_leftover_events")
    .select("jar_id")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .in("jar_id", jarIds);
  if (eventsError) throw eventsError;
  const processedJarIds = new Set((existingEvents ?? []).map((e) => e.jar_id as string));

  const remaining = (jars as CandidateJarRow[]).filter((j) => !processedJarIds.has(j.id));
  if (remaining.length === 0) return [];

  // Ngan sach CHINH XAC da ap dung thang truoc (tu migration_008 tro di, khi
  // /allocate luu lai lich su vao incomes/jar_allocations) — uu tien dung so
  // nay thay vi jars.monthly_budget HIEN TAI, vi hu co the da bi doi ngan
  // sach sau khi chia luong thang do. Hu nao khong co lich su cho thang truoc
  // (vd tao sau khi da chia luong, hoac thang do chua tung bam "Ap dung") thi
  // roi ve xap xi bang monthly_budget hien tai nhu truoc day.
  const remainingIds = remaining.map((j) => j.id);
  const [allocRows, { data: txs, error: txError }] = await Promise.all([
    supabase
      .from("incomes")
      .select("id")
      .eq("user_id", userId)
      .eq("period_month", periodMonth)
      .maybeSingle()
      .then(async ({ data: incomeRow }) => {
        if (!incomeRow) return [];
        const { data } = await supabase.from("jar_allocations").select("jar_id, amount").eq("income_id", incomeRow.id).in("jar_id", remainingIds);
        return data ?? [];
      }),
    supabase
      .from("transactions")
      .select("jar_id, amount, type")
      .in("jar_id", remainingIds)
      .gte("transaction_date", periodMonth)
      .lt("transaction_date", monthNow),
  ]);
  if (txError) throw txError;

  const exactBudgetByJar = new Map<string, number>();
  for (const row of allocRows) {
    exactBudgetByJar.set(row.jar_id as string, Number(row.amount));
  }

  // Khoan nap ("deposit") tru NGUOC vao spent, giong listJarsWithSpent —
  // neu khong, 1 khoan nap giua thang vao hu tiet kiem se bi tinh lon
  // thanh "da chi", lam leftover (budget - spent) bi tinh THIEU va rollover
  // cong THIEU vao thang sau.
  const spentByJar = new Map<string, number>();
  for (const t of txs ?? []) {
    const delta = t.type === "deposit" ? -Number(t.amount) : Number(t.amount);
    spentByJar.set(t.jar_id, (spentByJar.get(t.jar_id) ?? 0) + delta);
  }

  return remaining
    .map((j) => {
      const spent = spentByJar.get(j.id) ?? 0;
      const budget = exactBudgetByJar.get(j.id) ?? Number(j.monthly_budget);
      return {
        jarId: j.id,
        jarName: j.name,
        jarIcon: j.icon ?? "wallet",
        jarColor: j.color ?? "var(--color-accent)",
        budget,
        spent,
        leftover: budget - spent,
      };
    })
    .filter((j) => j.leftover > 0.01);
}

/** Hu KHONG bat rollover, con du tu thang truoc, CHUA duoc xu ly — can
 * hoi xac nhan nguoi dung truoc khi cong vao Quy du (hien banner). */
export async function getPendingLeftovers(supabase: SupabaseClient, userId: string): Promise<MonthEndJarInfo[]> {
  return computeMonthEndCandidates(supabase, userId, false);
}

/** Tu dong cong tien du thang truoc vao chinh hu (cho hu co bat rollover)
 * — khong can hoi, goi moi khi Dashboard tai trang. An toan goi nhieu
 * lan/dong thoi: insert vao jar_leftover_events TRUOC nhu 1 "khoa" — chi
 * that su cong tien vao ngan sach neu insert thanh cong (khong trung
 * jar_id + period_month voi 1 request khac vua xu ly xong). */
export async function applyAutoRollovers(supabase: SupabaseClient, userId: string): Promise<void> {
  const candidates = await computeMonthEndCandidates(supabase, userId, true);
  if (candidates.length === 0) return;

  const periodMonth = previousMonthStart();

  for (const c of candidates) {
    const { error: insertError } = await supabase.from("jar_leftover_events").insert({
      user_id: userId,
      jar_id: c.jarId,
      period_month: periodMonth,
      budget: c.budget,
      spent: c.spent,
      leftover: c.leftover,
      status: "rolled_over",
    });
    // Insert bi tu choi (thuong la trung unique jar_id+period_month) nghia
    // la mot request khac vua xu ly xong hu nay — bo qua, khong cong lan nua.
    if (insertError) continue;

    const { data: jarRow, error: readError } = await supabase.from("jars").select("monthly_budget").eq("id", c.jarId).single();
    if (readError) continue;

    await supabase
      .from("jars")
      .update({ monthly_budget: Number(jarRow.monthly_budget) + c.leftover })
      .eq("id", c.jarId);
  }
}
