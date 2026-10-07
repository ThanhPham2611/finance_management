import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import { safeColor, vietnamNow } from "@hu/domain";
import { dataFailure, dataSuccess, type DataResult } from "./result";

// Port của src/lib/queries/leftover.ts + app/(app)/leftover-actions.ts (web), dùng cho mobile.

type Client = SupabaseClient<Database>;

export const SAVINGS_JAR_NAME = "Quỹ dư";

const monthStart = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;

/** Đầu tháng trước tháng hiện tại, dạng "YYYY-MM-01" (cột kiểu date). */
export function previousMonthStart(now: Date = vietnamNow()): string {
  return monthStart(new Date(now.getFullYear(), now.getMonth() - 1, 1));
}

/** "Tháng N, YYYY" của tháng ngay trước tháng hiện tại, dùng khi hiện banner. */
export function previousMonthLabel(now: Date = vietnamNow()): string {
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  return `Tháng ${prev.getMonth() + 1}, ${prev.getFullYear()}`;
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

/** Hũ "Quỹ dư" mặc định của user (đánh dấu bằng is_default_savings để đổi tên thoải mái), tự tạo nếu chưa có. */
export async function getOrCreateSavingsJar(client: Client, userId: string): Promise<{ id: string }> {
  const { data: existing, error: findError } = await client.from("jars").select("id").eq("user_id", userId).eq("is_default_savings", true).maybeSingle();
  if (findError) throw findError;
  if (existing) return { id: existing.id };

  const { data: created, error: createError } = await client
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

/**
 * Hũ cá nhân (không phải Quỹ dư) đã tồn tại trước tháng này, lọc theo cờ rollover, kèm tiền dư tháng trước.
 * Chỉ trả hũ dư > 0,01 (bỏ sai số làm tròn) và chưa có sự kiện xử lý cho tháng trước.
 */
async function monthEndCandidates(client: Client, userId: string, rollover: boolean, now: Date): Promise<MonthEndJarInfo[]> {
  const periodMonth = previousMonthStart(now);
  const currentMonth = monthStart(now);

  const { data: jars, error: jarsError } = await client
    .from("jars")
    .select("id, name, icon, color, monthly_budget")
    .eq("user_id", userId)
    .eq("is_shared", false)
    .eq("is_active", true)
    .eq("is_default_savings", false)
    .eq("rollover", rollover)
    .lt("created_at", currentMonth);
  if (jarsError) throw jarsError;
  if (!jars || jars.length === 0) return [];

  const { data: events, error: eventsError } = await client
    .from("jar_leftover_events")
    .select("jar_id")
    .eq("user_id", userId)
    .eq("period_month", periodMonth)
    .in("jar_id", jars.map((jar) => jar.id));
  if (eventsError) throw eventsError;
  const processed = new Set((events ?? []).map((event) => event.jar_id));

  const remaining = jars.filter((jar) => !processed.has(jar.id));
  if (remaining.length === 0) return [];
  const remainingIds = remaining.map((jar) => jar.id);

  // Ngân sách CHÍNH XÁC đã áp dụng tháng trước (lịch sử Chia lương) được ưu tiên hơn monthly_budget HIỆN TẠI,
  // vì hũ có thể đã đổi ngân sách sau khi chia lương. Hũ không có lịch sử thì dùng monthly_budget như xấp xỉ.
  const exactBudget = new Map<string, number>();
  const { data: income } = await client.from("incomes").select("id").eq("user_id", userId).eq("period_month", periodMonth).maybeSingle();
  if (income) {
    const { data: allocations } = await client.from("jar_allocations").select("jar_id, amount").eq("income_id", income.id).in("jar_id", remainingIds);
    for (const row of allocations ?? []) exactBudget.set(row.jar_id, Number(row.amount));
  }

  const { data: transactions, error: transactionsError } = await client
    .from("transactions")
    .select("jar_id, amount, type")
    .in("jar_id", remainingIds)
    .gte("transaction_date", periodMonth)
    .lt("transaction_date", currentMonth);
  if (transactionsError) throw transactionsError;

  // Khoản nạp trừ NGƯỢC vào spent (giống listJarsWithSpent), nếu không leftover bị tính thiếu và rollover cộng thiếu.
  const spentByJar = new Map<string, number>();
  for (const t of transactions ?? []) {
    spentByJar.set(t.jar_id, (spentByJar.get(t.jar_id) ?? 0) + (t.type === "deposit" ? -Number(t.amount) : Number(t.amount)));
  }

  return remaining
    .map((jar) => {
      const spent = spentByJar.get(jar.id) ?? 0;
      const budget = exactBudget.get(jar.id) ?? Number(jar.monthly_budget);
      return { jarId: jar.id, jarName: jar.name, jarIcon: jar.icon ?? "wallet", jarColor: safeColor(jar.color), budget, spent, leftover: budget - spent };
    })
    .filter((jar) => jar.leftover > 0.01);
}

/** Hũ KHÔNG bật rollover còn dư từ tháng trước và chưa xử lý: cần hỏi người dùng trước khi cộng vào Quỹ dư. */
export function getPendingLeftovers(client: Client, userId: string, now: Date = vietnamNow()): Promise<MonthEndJarInfo[]> {
  return monthEndCandidates(client, userId, false, now);
}

/**
 * Tự cộng tiền dư tháng trước vào chính hũ có bật rollover, không cần hỏi. Trả về số hũ đã cộng.
 * Gọi lại hay gọi đồng thời đều an toàn: insert vào jar_leftover_events TRƯỚC như một "khóa" (unique jar_id + period_month),
 * chỉ cộng ngân sách nếu insert thành công.
 */
export async function applyAutoRollovers(client: Client, userId: string, now: Date = vietnamNow()): Promise<number> {
  const candidates = await monthEndCandidates(client, userId, true, now);
  const periodMonth = previousMonthStart(now);
  let applied = 0;

  for (const candidate of candidates) {
    const { error: lockError } = await client.from("jar_leftover_events").insert({
      user_id: userId,
      jar_id: candidate.jarId,
      period_month: periodMonth,
      budget: candidate.budget,
      spent: candidate.spent,
      leftover: candidate.leftover,
      status: "rolled_over",
    });
    // Bị từ chối (thường do trùng khóa) nghĩa là request khác vừa xử lý hũ này: bỏ qua, không cộng lần nữa.
    if (lockError) continue;

    const { data: jar, error: readError } = await client.from("jars").select("monthly_budget").eq("id", candidate.jarId).single();
    if (readError) continue;
    const { error: updateError } = await client.from("jars").update({ monthly_budget: Number(jar.monthly_budget) + candidate.leftover }).eq("id", candidate.jarId);
    if (!updateError) applied += 1;
  }
  return applied;
}

/** Xử lý cùng lúc mọi hũ đang chờ quyết định (một banner Có/Không cho tất cả). */
export async function resolveLeftovers(client: Client, userId: string, action: "confirm" | "decline", now: Date = vietnamNow()): Promise<DataResult<void>> {
  try {
    const pending = await getPendingLeftovers(client, userId, now);
    if (pending.length === 0) return dataSuccess(undefined);

    const status = action === "confirm" ? "confirmed" : "declined";
    // Insert trước để "khóa": chỉ cộng vào Quỹ dư nếu không bị trùng (bấm nhiều lần / mở 2 nơi).
    const { error: insertError } = await client.from("jar_leftover_events").insert(
      pending.map((jar) => ({ user_id: userId, jar_id: jar.jarId, period_month: previousMonthStart(now), budget: jar.budget, spent: jar.spent, leftover: jar.leftover, status }) as const),
    );
    if (insertError) return dataFailure("SUPABASE", insertError.message);

    if (action === "confirm") {
      const savings = await getOrCreateSavingsJar(client, userId);
      const { data: row, error: readError } = await client.from("jars").select("monthly_budget").eq("id", savings.id).single();
      if (readError) return dataFailure("SUPABASE", readError.message);
      const total = pending.reduce((sum, jar) => sum + jar.leftover, 0);
      const { error: updateError } = await client.from("jars").update({ monthly_budget: Number(row.monthly_budget) + total }).eq("id", savings.id);
      if (updateError) return dataFailure("SUPABASE", updateError.message);
    }
    return dataSuccess(undefined);
  } catch (error) {
    return dataFailure("SUPABASE", error instanceof Error ? error.message : "Không xử lý được tiền dư tháng trước.");
  }
}
