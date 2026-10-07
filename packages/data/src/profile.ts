import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import { dataFailure, dataSuccess, type DataResult } from "./result";

export type Profile = { fullName: string | null; hasSeenTour: boolean };

/**
 * Hồ sơ của user. Chưa có dòng nào thì coi như ĐÃ xem hướng dẫn (giống Dashboard web) để không làm phiền người dùng
 * bằng tour khi tính năng phụ này lỗi.
 */
export async function getProfile(client: SupabaseClient<Database>, userId: string): Promise<Profile> {
  const { data, error } = await client.from("profiles").select("full_name, has_seen_tour").eq("id", userId).maybeSingle();
  if (error) throw error;
  return { fullName: data?.full_name ?? null, hasSeenTour: data?.has_seen_tour ?? true };
}

/** Đánh dấu đã xem xong (hoặc bỏ qua) hướng dẫn. Chỉ gọi khi tour lần đầu kết thúc; mở lại thủ công không gọi hàm này. */
export async function markTourSeen(client: SupabaseClient<Database>, userId: string): Promise<DataResult<void>> {
  const { error } = await client.from("profiles").update({ has_seen_tour: true }).eq("id", userId);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

/** Tên hiển thị: ưu tiên họ tên, rồi phần trước @ của email. */
export function displayNameOf(fullName: string | null, email: string | null | undefined): string {
  if (fullName?.trim()) return fullName.trim();
  if (email) return email.split("@")[0];
  return "Người dùng";
}

/** Chữ cái đại diện trong avatar. */
export function initialOf(fullName: string | null, email: string | null | undefined): string {
  return (fullName?.trim() || email || "?").trim().charAt(0).toUpperCase();
}
