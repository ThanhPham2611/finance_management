"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateTransactionInput = {
  id: string;
  jarId: string;
  amount: number;
  note: string;
  transactionDate: string;
  type: "expense" | "deposit";
};

export async function updateTransaction(input: UpdateTransactionInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  if (!input.jarId) return { error: "Chưa chọn hũ." };
  if (!(input.amount > 0)) return { error: "Số tiền phải lớn hơn 0." };

  // RLS cua bang jars da tu gioi han: cua chinh minh, hoac hu quy chung
  // ma minh la thanh vien gia dinh.
  const { data: jar, error: jarError } = await supabase
    .from("jars")
    .select("id")
    .eq("id", input.jarId)
    .maybeSingle();

  if (jarError) return { error: jarError.message };
  if (!jar) return { error: "Không tìm thấy hũ này." };

  // RLS cua bang transactions cho phep sua giao dich cua chinh minh hoac
  // giao dich trong hu quy chung ma minh la thanh vien gia dinh.
  const { error } = await supabase
    .from("transactions")
    .update({
      jar_id: input.jarId,
      amount: input.amount,
      note: input.note.trim() || null,
      transaction_date: input.transactionDate,
      type: input.type,
    })
    .eq("id", input.id);

  if (error) return { error: error.message };

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

  const { error } = await supabase.from("transactions").delete().eq("id", input.id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/jars");
  revalidatePath(`/jars/${input.jarId}`);
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}
