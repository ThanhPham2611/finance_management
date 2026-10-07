"use server";

import { revalidatePath } from "next/cache";
import { deleteTransaction as deleteTransactionData, updateTransaction as updateTransactionData } from "@hu/data";
import type { UpdateTransactionInput } from "@hu/domain";
import { createClient } from "@/lib/supabase/server";

export type { UpdateTransactionInput } from "@hu/domain";

export async function updateTransaction(input: UpdateTransactionInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const result = await updateTransactionData(supabase, input, user.id);
  if (result.error) return { error: result.error.message };

  revalidatePath("/jars");
  revalidatePath(`/jars/${input.jarId}`);
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}

/** Xoa 1 giao dich — chi giao dich do CHINH MINH tao (loc them user_id o
 * day, du RLS hien cho phep thanh vien gia dinh xoa cheo giao dich trong
 * hu quy chung — khong muon nguoi khac xoa duoc giao dich cua minh). */
export async function deleteTransaction(input: { id: string; jarId: string }): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const result = await deleteTransactionData(supabase, input.id, user.id);
  if (result.error) return { error: result.error.message };

  revalidatePath("/jars");
  revalidatePath(`/jars/${input.jarId}`);
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}
