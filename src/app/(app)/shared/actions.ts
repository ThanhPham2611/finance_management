"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createShareRequest(email: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const trimmed = email.trim();
  if (!trimmed) return { error: "Nhập email người bạn muốn chia sẻ." };

  const { error } = await supabase.rpc("create_share_request", { p_viewer_email: trimmed });
  if (error) return { error: error.message };

  revalidatePath("/shared");
  return {};
}

export async function respondToShare(shareId: string, accept: boolean): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const { error } = await supabase.rpc("respond_to_share_request", { p_share_id: shareId, p_accept: accept });
  if (error) return { error: error.message };

  revalidatePath("/shared");
  return {};
}

export async function revokeShare(shareId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const { error } = await supabase.rpc("revoke_share", { p_share_id: shareId });
  if (error) return { error: error.message };

  revalidatePath("/shared");
  return {};
}
