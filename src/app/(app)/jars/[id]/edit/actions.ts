"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Hu gia dinh (isShared=true) khong sua duoc qua day nua — ngan sach cua
// no tu tinh tu jar_contributions (xem household/actions.ts setContribution).
// Client (JarEditForm) an BudgetField va gui lai dung monthlyBudget cu cho
// truong hop nay nen khong sua nham.
export type UpdateJarInput = {
  jarId: string;
  name: string;
  monthlyBudget: number;
  alertAt80: boolean;
  rollover: boolean;
  isSavings: boolean;
};

function revalidateJarPaths(jarId: string) {
  revalidatePath("/jars");
  revalidatePath(`/jars/${jarId}`);
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
}

export async function updateJar(input: UpdateJarInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const name = input.name.trim();
  if (!name) return { error: "Cần đặt tên cho hũ." };
  if (input.monthlyBudget < 0) return { error: "Ngân sách không thể âm." };

  // Hu gia dinh: khong ghi de monthly_budget o day, vi no duoc tinh lai
  // tu dong tu jar_contributions (setContribution) va co the vua doi giua
  // luc mo form nay va luc bam Luu — ghi de bang gia tri cu se lam sai so.
  const { data: existing, error: existingError } = await supabase.from("jars").select("is_shared").eq("id", input.jarId).maybeSingle();
  if (existingError) return { error: existingError.message };

  // Hu tiet kiem luon bat rollover, tat canh bao 80% — ep o day (chot chan
  // thuc su, khong chi tin UI da an toggle). Hu gia dinh khong bao gio la
  // hu tiet kiem, du client co gui gi len (tu ve du UI da an toggle).
  const savings = existing?.is_shared ? false : input.isSavings;
  const patch: Record<string, unknown> = {
    name,
    alert_at_80: savings ? false : input.alertAt80,
    rollover: savings ? true : input.rollover,
    is_savings: savings,
  };
  if (!existing?.is_shared) {
    patch.monthly_budget = input.monthlyBudget;
  }

  // RLS cua bang jars cho phep sua hu cua chinh minh hoac hu gia dinh ma
  // minh la thanh vien — khong can loc them theo user_id.
  const { error } = await supabase.from("jars").update(patch).eq("id", input.jarId);

  if (error) return { error: error.message };

  revalidateJarPaths(input.jarId);
  return {};
}

/** Soft delete — keeps past transactions intact, just drops the jar from active lists. */
export async function deactivateJar(jarId: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  // RLS cho phep vo hieu hoa hu cua chinh minh hoac hu quy chung ma minh
  // la thanh vien gia dinh.
  const { error } = await supabase
    .from("jars")
    .update({ is_active: false })
    .eq("id", jarId);

  if (error) return { error: error.message };

  revalidateJarPaths(jarId);
  return {};
}
