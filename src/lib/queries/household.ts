import type { SupabaseClient } from "@supabase/supabase-js";

export const MAX_HOUSEHOLD_MEMBERS = 5;

export type HouseholdMember = {
  userId: string;
  name: string;
  nickname: string | null;
  isMe: boolean;
};

/** "Ten (biet danh)" neu co biet danh, khong thi chi ten — dung o moi noi hien thi thanh vien. */
export function memberLabel(member: Pick<HouseholdMember, "name" | "nickname">): string {
  return member.nickname ? `${member.name} (${member.nickname})` : member.name;
}

export type HouseholdInfo = {
  id: string;
  members: HouseholdMember[];
} | null;

/**
 * Household hien tai cua user (neu co) kem ten hien thi tung thanh vien.
 * Tra ve null neu user chua thuoc household nao (chua tung mo/tham gia).
 */
export async function getMyHousehold(supabase: SupabaseClient, userId: string): Promise<HouseholdInfo> {
  const { data: membership, error: membershipError } = await supabase
    .from("household_members")
    .select("household_id")
    .eq("user_id", userId)
    .maybeSingle();

  if (membershipError) throw membershipError;
  if (!membership) return null;

  const { data: members, error: membersError } = await supabase
    .from("household_members")
    .select("user_id, nickname")
    .eq("household_id", membership.household_id);

  if (membersError) throw membersError;

  const memberIds = (members ?? []).map((m) => m.user_id);
  const nicknameById = new Map((members ?? []).map((m) => [m.user_id, m.nickname as string | null]));
  const { data: profiles, error: profilesError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", memberIds);

  if (profilesError) throw profilesError;

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name as string | null]));

  return {
    id: membership.household_id,
    members: memberIds.map((id) => ({
      userId: id,
      name: id === userId ? "Bạn" : (nameById.get(id) ?? "Người thân"),
      nickname: nicknameById.get(id) ?? null,
      isMe: id === userId,
    })),
  };
}

/** Chi lay household_id cua user hien tai (khong can danh sach thanh vien) — dung trong server action khi tao/sua hu quy chung. */
export async function getMyHouseholdId(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data, error } = await supabase.from("household_members").select("household_id").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data?.household_id ?? null;
}

/** Tong so tien user hien tai da cam ket dong gop vao TAT CA hu gia dinh trong thang nay. */
export async function getMyFamilyContributionTotal(supabase: SupabaseClient, userId: string, periodMonth: string): Promise<number> {
  const { data, error } = await supabase
    .from("jar_contributions")
    .select("amount")
    .eq("user_id", userId)
    .eq("period_month", periodMonth);
  if (error) throw error;
  return (data ?? []).reduce((sum, r) => sum + Number(r.amount), 0);
}

/** Dong gop cua tung nguoi cho 1 hu gia dinh trong thang nay — dung de hien thi o trang Gia dinh. */
export type JarContribution = { userId: string; amount: number };

export async function getJarContributions(supabase: SupabaseClient, jarId: string, periodMonth: string): Promise<JarContribution[]> {
  const { data, error } = await supabase
    .from("jar_contributions")
    .select("user_id, amount")
    .eq("jar_id", jarId)
    .eq("period_month", periodMonth);
  if (error) throw error;
  return (data ?? []).map((r) => ({ userId: r.user_id, amount: Number(r.amount) }));
}

/** Ten hien thi cua nguoi tao 1 dong du lieu (giao dich...), dung cho hu quy chung. */
export function nameOf(members: HouseholdMember[], userId: string): string {
  const m = members.find((m) => m.userId === userId);
  return m ? memberLabel(m) : "Người thân";
}

/**
 * Thoi diem (created_at) cua giao dich gan nhat trong CAC HU GIA DINH cua
 * moi thanh vien — chi tinh giao dich o hu chung (household_id khong null),
 * khop voi RLS: giao dich hu ca nhan cua nguoi khac van khong xem duoc.
 */
export async function getMemberLastSpendTimes(supabase: SupabaseClient, householdId: string): Promise<Map<string, string>> {
  const { data, error } = await supabase
    .from("transactions")
    .select("user_id, created_at, jars!inner(household_id)")
    .eq("jars.household_id", householdId)
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) throw error;

  const lastByUser = new Map<string, string>();
  for (const row of (data ?? []) as { user_id: string; created_at: string }[]) {
    if (!lastByUser.has(row.user_id)) lastByUser.set(row.user_id, row.created_at);
  }
  return lastByUser;
}
