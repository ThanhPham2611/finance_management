import type { SupabaseClient, User } from "@supabase/supabase-js";

export type CurrentProfile = {
  userId: string;
  email: string | null;
  fullName: string | null;
  currency: string;
  hasSeenTour: boolean;
};

/**
 * Nguoi dang nhap + ho so trong bang profiles. Tra ve null neu chua dang nhap.
 */
export async function getCurrentProfile(supabase: SupabaseClient): Promise<CurrentProfile | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, currency, has_seen_tour")
    .eq("id", user.id)
    .maybeSingle();

  return {
    userId: user.id,
    email: (user as User).email ?? null,
    fullName: profile?.full_name ?? null,
    currency: profile?.currency ?? "VND",
    hasSeenTour: profile?.has_seen_tour ?? false,
  };
}

/** Chu cai dai dien de hien trong avatar tron/vuong khi chua co anh. */
export function initialOf(profile: CurrentProfile): string {
  const source = profile.fullName || profile.email || "?";
  return source.trim().charAt(0).toUpperCase();
}

/** Ten hien thi: uu tien ho ten, roi den phan truoc @ cua email. */
export function displayNameOf(profile: CurrentProfile): string {
  if (profile.fullName) return profile.fullName;
  if (profile.email) return profile.email.split("@")[0];
  return "Người dùng";
}
