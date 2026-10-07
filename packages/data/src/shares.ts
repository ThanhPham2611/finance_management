import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import { vietnamNow, type Jar } from "@hu/domain";
import { mapJarsWithSpent } from "./jars";
import { dataFailure, dataSuccess, type DataResult } from "./result";
import { mapTransactionWithJar, type TransactionWithJar } from "./transactions";

// Port của src/lib/queries/shares.ts + app/(app)/shared/actions.ts (web), dùng cho mobile.

type Client = SupabaseClient<Database>;

export type ShareStatus = "pending" | "accepted" | "declined" | "revoked";
export type IncomingShare = { id: string; ownerId: string; ownerName: string; status: ShareStatus; createdAt: string };
export type OutgoingShare = { id: string; viewerId: string; viewerName: string; status: ShareStatus; createdAt: string };

const FALLBACK_NAME = "Người dùng";

async function namesById(client: Client, ids: string[]): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await client.from("profiles").select("id, full_name").in("id", ids);
  if (error) throw error;
  return new Map((data ?? []).map((profile) => [profile.id, profile.full_name ?? FALLBACK_NAME]));
}

async function listSharesAsViewer(client: Client, myUserId: string, status: "pending" | "accepted"): Promise<IncomingShare[]> {
  const { data, error } = await client.from("expense_shares").select("id, owner_id, status, created_at").eq("viewer_id", myUserId).eq("status", status).order("created_at", { ascending: false });
  if (error) throw error;
  const names = await namesById(client, (data ?? []).map((row) => row.owner_id));
  return (data ?? []).map((row) => ({ id: row.id, ownerId: row.owner_id, ownerName: names.get(row.owner_id) ?? FALLBACK_NAME, status: row.status, createdAt: row.created_at }));
}

/** Lời mời CHƯA phản hồi người khác gửi cho tôi (tôi là viewer). */
export const listPendingInvitesToMe = (client: Client, myUserId: string) => listSharesAsViewer(client, myUserId, "pending");

/** Người đã cho tôi xem chi tiêu của họ: danh sách để bấm vào xem. */
export const listSharesAcceptedToMe = (client: Client, myUserId: string) => listSharesAsViewer(client, myUserId, "accepted");

/** Các lời mời tôi (owner) đã gửi đi, mọi trạng thái TRỪ "revoked". */
export async function listMyOutgoingShares(client: Client, myUserId: string): Promise<OutgoingShare[]> {
  const { data, error } = await client.from("expense_shares").select("id, viewer_id, status, created_at").eq("owner_id", myUserId).neq("status", "revoked").order("created_at", { ascending: false });
  if (error) throw error;
  const names = await namesById(client, (data ?? []).map((row) => row.viewer_id));
  return (data ?? []).map((row) => ({ id: row.id, viewerId: row.viewer_id, viewerName: names.get(row.viewer_id) ?? FALLBACK_NAME, status: row.status, createdAt: row.created_at }));
}

export type SharesOverview = { incoming: IncomingShare[]; accepted: IncomingShare[]; outgoing: OutgoingShare[] };

export async function getSharesOverview(client: Client, myUserId: string): Promise<SharesOverview> {
  const [incoming, accepted, outgoing] = await Promise.all([listPendingInvitesToMe(client, myUserId), listSharesAcceptedToMe(client, myUserId), listMyOutgoingShares(client, myUserId)]);
  return { incoming, accepted, outgoing };
}

export type SharedOwnerOverview = { ownerName: string; jars: Jar[]; transactions: TransactionWithJar[] };

/**
 * Hũ + giao dịch tháng này của RIÊNG ownerId, chỉ xem. Trả null khi tôi (viewer) chưa được ownerId chia sẻ (accepted): kiểm tra
 * tường minh thay vì dựa vào RLS trả về rỗng. `.eq("user_id", ownerId)` để không lẫn hũ của chính tôi khi RLS cho thấy cả hai.
 */
export async function getSharedOwnerOverview(client: Client, ownerId: string, viewerId: string, now: Date = vietnamNow()): Promise<SharedOwnerOverview | null> {
  const { data: share, error: shareError } = await client.from("expense_shares").select("id").eq("owner_id", ownerId).eq("viewer_id", viewerId).eq("status", "accepted").maybeSingle();
  if (shareError) throw shareError;
  if (!share) return null;

  const monthStart = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const [names, jarsResult, spendResult, transactionsResult] = await Promise.all([
    namesById(client, [ownerId]),
    client.from("jars").select("id, name, icon, color, monthly_budget, is_shared, alert_at_80, rollover, is_savings").eq("user_id", ownerId).eq("is_active", true).order("sort_order", { ascending: true }),
    client.from("transactions").select("jar_id, amount, type").eq("user_id", ownerId).gte("transaction_date", monthStart),
    client.from("transactions").select("id, jar_id, amount, note, transaction_date, user_id, type, jars(name, icon, color)").eq("user_id", ownerId).gte("transaction_date", monthStart).order("transaction_date", { ascending: false }).order("created_at", { ascending: false }),
  ]);
  if (jarsResult.error) throw jarsResult.error;
  if (spendResult.error) throw spendResult.error;
  if (transactionsResult.error) throw transactionsResult.error;

  return {
    ownerName: names.get(ownerId) ?? FALLBACK_NAME,
    jars: mapJarsWithSpent(jarsResult.data ?? [], spendResult.data ?? []),
    transactions: ((transactionsResult.data ?? []) as unknown as Parameters<typeof mapTransactionWithJar>[0][]).map(mapTransactionWithJar),
  };
}

/** Mời người khác xem chi tiêu của mình bằng email (họ phải đã có tài khoản và chấp nhận). */
export async function createShareRequest(client: Client, email: string): Promise<DataResult<void>> {
  const trimmed = email.trim();
  if (!trimmed) return dataFailure("VALIDATION", "Nhập email người bạn muốn chia sẻ.");
  const { error } = await client.rpc("create_share_request", { p_viewer_email: trimmed });
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

export async function respondToShare(client: Client, shareId: string, accept: boolean): Promise<DataResult<void>> {
  const { error } = await client.rpc("respond_to_share_request", { p_share_id: shareId, p_accept: accept });
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

export async function revokeShare(client: Client, shareId: string): Promise<DataResult<void>> {
  const { error } = await client.rpc("revoke_share", { p_share_id: shareId });
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}
