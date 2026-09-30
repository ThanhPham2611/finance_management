import type { SupabaseClient } from "@supabase/supabase-js";
import { currentMonthStart, type RealJar } from "@/lib/queries/jars";
import { firstJar, type JarJoinRow, type RealTransactionWithJar } from "@/lib/queries/transactions";

export type ShareStatus = "pending" | "accepted" | "declined" | "revoked";

export type IncomingShare = { id: string; ownerId: string; ownerName: string; status: ShareStatus; createdAt: string };
export type OutgoingShare = { id: string; viewerId: string; viewerName: string; status: ShareStatus; createdAt: string };

const FALLBACK_NAME = "Người dùng";

async function namesById(supabase: SupabaseClient, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((p) => [p.id, (p.full_name as string | null) ?? FALLBACK_NAME]));
}

async function listSharesAsViewer(supabase: SupabaseClient, myUserId: string, status: "pending" | "accepted"): Promise<IncomingShare[]> {
  const { data, error } = await supabase
    .from("expense_shares")
    .select("id, owner_id, status, created_at")
    .eq("viewer_id", myUserId)
    .eq("status", status)
    .order("created_at", { ascending: false });
  if (error) throw error;

  const names = await namesById(supabase, (data ?? []).map((r) => r.owner_id));
  return (data ?? []).map((r) => ({
    id: r.id,
    ownerId: r.owner_id,
    ownerName: names.get(r.owner_id) ?? FALLBACK_NAME,
    status: r.status as ShareStatus,
    createdAt: r.created_at,
  }));
}

/** Loi moi CHUA phan hoi nguoi khac gui cho toi (toi la viewer). */
export function listPendingInvitesToMe(supabase: SupabaseClient, myUserId: string) {
  return listSharesAsViewer(supabase, myUserId, "pending");
}

/** Nguoi da cho toi xem chi tieu cua ho — day chinh la danh sach de bam vao xem. */
export function listSharesAcceptedToMe(supabase: SupabaseClient, myUserId: string) {
  return listSharesAsViewer(supabase, myUserId, "accepted");
}

/** Cac loi moi toi (owner) da gui di, moi trang thai TRU 'revoked'. */
export async function listMyOutgoingShares(supabase: SupabaseClient, myUserId: string): Promise<OutgoingShare[]> {
  const { data, error } = await supabase
    .from("expense_shares")
    .select("id, viewer_id, status, created_at")
    .eq("owner_id", myUserId)
    .neq("status", "revoked")
    .order("created_at", { ascending: false });
  if (error) throw error;

  const names = await namesById(supabase, (data ?? []).map((r) => r.viewer_id));
  return (data ?? []).map((r) => ({
    id: r.id,
    viewerId: r.viewer_id,
    viewerName: names.get(r.viewer_id) ?? FALLBACK_NAME,
    status: r.status as ShareStatus,
    createdAt: r.created_at,
  }));
}

/**
 * Toi (viewer) co dang duoc ownerId chia se (accepted) hay khong — dung o
 * /shared/[ownerId] de quyet dinh notFound() ro rang, khong dua vao RLS
 * tra ve rong mot cach am tham.
 */
export async function getAcceptedShare(supabase: SupabaseClient, ownerId: string, viewerId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("expense_shares")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("viewer_id", viewerId)
    .eq("status", "accepted")
    .maybeSingle();
  if (error) throw error;
  return !!data;
}

export async function getOwnerName(supabase: SupabaseClient, ownerId: string): Promise<string> {
  const { data, error } = await supabase.from("profiles").select("full_name").eq("id", ownerId).maybeSingle();
  if (error) throw error;
  return (data?.full_name as string | null) ?? FALLBACK_NAME;
}

/**
 * Hu CUA RIENG ownerId (khong tron voi hu cua nguoi dang xem) — RLS van la
 * noi thuc su quyet dinh co xem duoc khong, .eq() o day chi de khong hien
 * lan hu cua chinh minh khi ca 2 nguoi cung xem duoc bang jars.
 */
export async function listOwnerJarsWithSpent(supabase: SupabaseClient, ownerId: string): Promise<RealJar[]> {
  const monthStart = currentMonthStart();

  const [{ data: jars, error: jarsError }, { data: txs, error: txError }] = await Promise.all([
    supabase
      .from("jars")
      .select("id, name, icon, color, monthly_budget, is_shared, alert_at_80, rollover, is_savings")
      .eq("user_id", ownerId)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    supabase.from("transactions").select("jar_id, amount, type").eq("user_id", ownerId).gte("transaction_date", monthStart),
  ]);

  if (jarsError) throw jarsError;
  if (txError) throw txError;

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

/** Giao dich cua RIENG ownerId tu sinceDate tro di, kem thong tin hu. */
export async function listOwnerTransactionsSince(supabase: SupabaseClient, ownerId: string, sinceDate: string): Promise<RealTransactionWithJar[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, jar_id, amount, note, transaction_date, user_id, type, jars(name, icon, color)")
    .eq("user_id", ownerId)
    .gte("transaction_date", sinceDate)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as JarJoinRow[]).map((t) => {
    const jar = firstJar(t.jars);
    return {
      id: t.id,
      jarId: t.jar_id,
      amount: Number(t.amount),
      note: t.note,
      transactionDate: t.transaction_date,
      userId: t.user_id,
      type: t.type,
      jarName: jar?.name ?? "Không rõ hũ",
      jarIcon: jar?.icon ?? "wallet",
      jarColor: jar?.color ?? "var(--color-accent)",
    };
  });
}
