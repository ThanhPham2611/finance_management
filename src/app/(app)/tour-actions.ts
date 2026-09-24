"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

/** Danh dau user da xem xong (hoac bo qua) huong dan Dashboard — goi 1 lan
 * duy nhat khi tour ket thuc hoac khi bam "Bo qua"/Esc. Mo lai tour thu
 * cong (nut "Xem huong dan lai") KHONG goi ham nay — chi mo lai cuc bo o
 * client qua query param ?tour=1. */
export async function markTourSeen(): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const { error } = await supabase.from("profiles").update({ has_seen_tour: true }).eq("id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/");
  return {};
}
