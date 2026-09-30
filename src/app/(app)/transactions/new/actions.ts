"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { vnToday } from "@/lib/format";

export type CreateTransactionInput = {
  jarId: string;
  amount: number;
  note: string;
  type?: "expense" | "deposit";
};

export async function createTransaction(input: CreateTransactionInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  if (!input.jarId) return { error: "Chưa chọn hũ." };
  if (!(input.amount > 0)) return { error: "Số tiền phải lớn hơn 0." };

  const type = input.type ?? "expense";

  // Xac nhan hu nay dung la hu duoc phep dung (cua chinh minh, hoac hu
  // quy chung ma minh la thanh vien gia dinh) — dua vao RLS cua bang jars
  // de tra ve null neu khong co quyen, thay vi tu gioi han chi user_id.
  const { data: jar, error: jarError } = await supabase
    .from("jars")
    .select("id")
    .eq("id", input.jarId)
    .maybeSingle();

  if (jarError) return { error: jarError.message };
  if (!jar) return { error: "Không tìm thấy hũ này." };
  // "thu" dung type deposit: tru nguoc vao spent nen cong tien vao hu,
  // ke ca hu chi tieu thuong — khong chi hu tiet kiem.

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    jar_id: input.jarId,
    amount: input.amount,
    note: input.note.trim() || null,
    type,
    // Ghi ro ngay theo gio VN thay vi de DB dung default `current_date`
    // (DB chay UTC — khoan chi luc 1h sang gio VN se bi ghi lui 1 ngay).
    transaction_date: vnToday(),
  });

  if (error) return { error: error.message };

  revalidatePath("/jars");
  revalidatePath(`/jars/${input.jarId}`);
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}
