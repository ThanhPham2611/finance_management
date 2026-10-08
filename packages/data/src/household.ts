import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import { listJarsWithSpent, listUsedJarColors } from "./jars";
import { dataFailure, dataSuccess, type DataResult } from "./result";
import { pickJarColors, vietnamNow, type Jar } from "@hu/domain";

// Port của src/lib/queries/household.ts + app/(app)/household/actions.ts (web), dùng cho mobile.

type Client = SupabaseClient<Database>;

export const MAX_HOUSEHOLD_MEMBERS = 5;

export type HouseholdMember = { userId: string; name: string; nickname: string | null; isMe: boolean };
export type HouseholdInfo = { id: string; members: HouseholdMember[] } | null;

/** Tên hiển thị của 1 thành viên: mình luôn là "Bạn"; người khác thì biệt danh (nếu có) thay hẳn cho tên. */
export function memberLabel(member: Pick<HouseholdMember, "name" | "nickname" | "isMe">): string {
  if (member.isMe) return "Bạn";
  return member.nickname ?? member.name;
}

/** Tên của người tạo 1 dòng dữ liệu (giao dịch…) trong hũ quỹ chung. */
export function nameOf(members: HouseholdMember[], userId: string): string {
  const member = members.find((item) => item.userId === userId);
  return member ? memberLabel(member) : "Người thân";
}

const monthStart = (now: Date) => `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;

/** Household hiện tại của user kèm tên hiển thị từng thành viên; null nếu chưa thuộc household nào. */
export async function getMyHousehold(client: Client, userId: string): Promise<HouseholdInfo> {
  const { data: membership, error: membershipError } = await client.from("household_members").select("household_id").eq("user_id", userId).maybeSingle();
  if (membershipError) throw membershipError;
  if (!membership) return null;

  const { data: members, error: membersError } = await client.from("household_members").select("user_id, nickname").eq("household_id", membership.household_id);
  if (membersError) throw membersError;

  const ids = (members ?? []).map((member) => member.user_id);
  const { data: profiles, error: profilesError } = await client.from("profiles").select("id, full_name").in("id", ids);
  if (profilesError) throw profilesError;

  const nameById = new Map((profiles ?? []).map((profile) => [profile.id, profile.full_name]));
  const nicknameById = new Map((members ?? []).map((member) => [member.user_id, member.nickname]));
  return {
    id: membership.household_id,
    members: ids.map((id) => ({ userId: id, name: id === userId ? "Bạn" : (nameById.get(id) ?? "Người thân"), nickname: nicknameById.get(id) ?? null, isMe: id === userId })),
  };
}

/** Tổng số tiền user hiện tại đã cam kết góp vào TẤT CẢ hũ gia đình trong tháng `periodMonth` ("YYYY-MM-01"). */
export async function getMyFamilyContributionTotal(client: Client, userId: string, periodMonth: string): Promise<number> {
  const { data, error } = await client.from("jar_contributions").select("amount").eq("user_id", userId).eq("period_month", periodMonth);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
}

/** Thời điểm (created_at) giao dịch gần nhất của từng thành viên, chỉ tính hũ quỹ chung (khớp RLS). */
export async function getMemberLastSpendTimes(client: Client, householdId: string): Promise<Record<string, string>> {
  const { data, error } = await client
    .from("transactions")
    .select("user_id, created_at, jars!inner(household_id)")
    .eq("jars.household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;

  const last: Record<string, string> = {};
  for (const row of (data ?? []) as unknown as { user_id: string; created_at: string }[]) {
    if (!(row.user_id in last)) last[row.user_id] = row.created_at;
  }
  return last;
}

export type FamilyJarView = {
  jar: Jar;
  contributions: { userId: string; name: string; amount: number }[];
};

export type HouseholdOverview = { household: HouseholdInfo; familyJars: FamilyJarView[]; lastSpendByUser: Record<string, string> };

/** Mọi thứ trang Gia đình cần: thành viên, hũ gia đình kèm phần góp tháng này của từng người, lần chi gần nhất. */
export async function getHouseholdOverview(client: Client, userId: string, now: Date = vietnamNow()): Promise<HouseholdOverview> {
  const household = await getMyHousehold(client, userId);
  if (!household) return { household: null, familyJars: [], lastSpendByUser: {} };

  const periodMonth = monthStart(now);
  const [lastSpendByUser, jars] = await Promise.all([getMemberLastSpendTimes(client, household.id), listJarsWithSpent(client, periodMonth)]);
  const shared = jars.filter((jar) => jar.isShared);

  const jarIds = shared.map((jar) => jar.id);
  const { data: rows, error } = jarIds.length
    ? await client.from("jar_contributions").select("jar_id, user_id, amount").in("jar_id", jarIds).eq("period_month", periodMonth)
    : { data: [], error: null };
  if (error) throw error;

  const familyJars = shared.map((jar) => ({
    jar,
    contributions: household.members.map((member) => ({
      userId: member.userId,
      name: memberLabel(member),
      amount: Number((rows ?? []).find((row) => row.jar_id === jar.id && row.user_id === member.userId)?.amount ?? 0),
    })),
  }));
  return { household, familyJars, lastSpendByUser };
}

const rpcFailure = (message: string) => dataFailure("SUPABASE", message);

/** Tạo mã mời (dùng được 7 ngày). */
export async function createHouseholdInvite(client: Client): Promise<DataResult<{ code: string; expiresAt: string }>> {
  const { data, error } = await client.rpc("create_household_invite");
  if (error) return rpcFailure(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return rpcFailure("Không tạo được mã mời.");
  return dataSuccess({ code: row.code, expiresAt: row.expires_at });
}

export async function joinHousehold(client: Client, code: string): Promise<DataResult<void>> {
  const trimmed = code.trim();
  if (!trimmed) return dataFailure("VALIDATION", "Nhập mã mời trước đã.");
  const { error } = await client.rpc("join_household", { p_code: trimmed });
  return error ? rpcFailure(error.message) : dataSuccess(undefined);
}

export async function setMemberNickname(client: Client, memberId: string, nickname: string): Promise<DataResult<void>> {
  const { error } = await client.rpc("set_member_nickname", { p_user_id: memberId, p_nickname: nickname.trim() });
  return error ? rpcFailure(error.message) : dataSuccess(undefined);
}

/** Tạo hũ gia đình mới: ngân sách bắt đầu từ 0, tăng lên khi từng người nhập phần đóng góp. Màu luôn là hex (RN không hiểu `var(...)`) và không trùng hũ đang có. */
export async function createFamilyJar(client: Client, userId: string, input: { name: string; icon?: string; color?: string; alertAt80?: boolean; rollover?: boolean }): Promise<DataResult<void>> {
  const name = input.name.trim();
  if (!name) return dataFailure("VALIDATION", "Cần đặt tên cho hũ.");

  const { data: membership, error: membershipError } = await client.from("household_members").select("household_id").eq("user_id", userId).maybeSingle();
  if (membershipError) return rpcFailure(membershipError.message);
  if (!membership) return dataFailure("VALIDATION", "Cần lập gia đình trước khi tạo hũ gia đình.");

  const used = await listUsedJarColors(client);
  if (used.error) return rpcFailure(used.error.message);
  const [color] = pickJarColors([input.color], used.data);

  const { error } = await client.from("jars").insert({
    user_id: userId,
    name,
    icon: input.icon ?? "home",
    color,
    monthly_budget: 0,
    alert_at_80: input.alertAt80 ?? true,
    rollover: input.rollover ?? false,
    is_shared: true,
    household_id: membership.household_id,
  });
  return error ? rpcFailure(error.message) : dataSuccess(undefined);
}

/**
 * Nhập/sửa phần đóng góp CỦA CHÍNH MÌNH cho 1 hũ gia đình trong tháng hiện tại (không cần người kia duyệt). Ngân sách hiển thị
 * của hũ (jars.monthly_budget) được tính lại = tổng đóng góp của mọi thành viên ngay sau khi lưu.
 */
export async function setContribution(client: Client, userId: string, jarId: string, amount: number, now: Date = vietnamNow()): Promise<DataResult<void>> {
  if (!Number.isFinite(amount) || amount < 0) return dataFailure("VALIDATION", "Số tiền không thể âm.");
  const periodMonth = monthStart(now);

  const { error: upsertError } = await client.from("jar_contributions").upsert({ jar_id: jarId, user_id: userId, period_month: periodMonth, amount }, { onConflict: "jar_id,user_id,period_month" });
  if (upsertError) return rpcFailure(upsertError.message);

  const { data: rows, error: sumError } = await client.from("jar_contributions").select("amount").eq("jar_id", jarId).eq("period_month", periodMonth);
  if (sumError) return rpcFailure(sumError.message);

  const total = (rows ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
  const { error: updateError } = await client.from("jars").update({ monthly_budget: total }).eq("id", jarId);
  return updateError ? rpcFailure(updateError.message) : dataSuccess(undefined);
}
