"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrCreateSavingsJar, getPendingLeftovers, previousMonthStart } from "@/lib/queries/leftover";

export type ResolveLeftoversInput = { action: "confirm" | "decline" };

function revalidateLeftoverPaths() {
  revalidatePath("/");
  revalidatePath("/jars");
  revalidatePath("/allocate");
  revalidatePath("/reports");
}

/** Xu ly toan bo hu dang cho quyet dinh (tien du thang truoc, khong bat
 * rollover) cung luc — khop voi UX 1 banner hoi Co/Khong cho tat ca. */
export async function resolveLeftovers(input: ResolveLeftoversInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const pending = await getPendingLeftovers(supabase, user.id);
  if (pending.length === 0) return {};

  const periodMonth = previousMonthStart();
  const status = input.action === "confirm" ? "confirmed" : "declined";

  const rows = pending.map((p) => ({
    user_id: user.id,
    jar_id: p.jarId,
    period_month: periodMonth,
    budget: p.budget,
    spent: p.spent,
    leftover: p.leftover,
    status,
  }));

  // Insert truoc de "khoa" — chi cong tien vao Quy du neu insert khong bi
  // trung (tranh cong 2 lan khi bam nut nhieu lan / mo 2 tab).
  const { error: insertError } = await supabase.from("jar_leftover_events").insert(rows);
  if (insertError) return { error: insertError.message };

  if (input.action === "confirm") {
    const savingsJar = await getOrCreateSavingsJar(supabase, user.id);
    const totalLeftover = pending.reduce((s, p) => s + p.leftover, 0);

    const { data: savingsRow, error: readError } = await supabase.from("jars").select("monthly_budget").eq("id", savingsJar.id).single();
    if (readError) return { error: readError.message };

    const { error: updateError } = await supabase
      .from("jars")
      .update({ monthly_budget: Number(savingsRow.monthly_budget) + totalLeftover })
      .eq("id", savingsJar.id);
    if (updateError) return { error: updateError.message };
  }

  revalidateLeftoverPaths();
  return {};
}
