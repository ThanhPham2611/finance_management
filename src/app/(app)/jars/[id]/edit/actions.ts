"use server";

import { revalidatePath } from "next/cache";
import { deactivateJar as deactivateJarData, updateJar as updateJarData } from "@hu/data";
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

  const result = await updateJarData(supabase, { ...input, id: input.jarId }, user.id);
  if (result.error) return { error: result.error.message };

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

  const result = await deactivateJarData(supabase, jarId, user.id);
  if (result.error) return { error: result.error.message };

  revalidateJarPaths(jarId);
  return {};
}
