"use server";

import { revalidatePath } from "next/cache";
import {
  addDebtPayment as addDebtPaymentData,
  archiveDebt as archiveDebtData,
  createDebt as createDebtData,
  deleteDebtPayment as deleteDebtPaymentData,
} from "@hu/data";
import type { AddDebtPaymentInput, CreateDebtInput } from "@hu/domain";
import { createClient } from "@/lib/supabase/server";
import { vnToday } from "@/lib/format";

type Result = { error?: string };

/** Moi action: xac thuc, goi ham dung chung o @hu/data (cung logic voi mobile), roi lam moi trang. */
async function run(action: (supabase: Awaited<ReturnType<typeof createClient>>, userId: string) => Promise<{ error: { message: string } | null }>): Promise<Result> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const result = await action(supabase, user.id);
  if (result.error) return { error: result.error.message };

  revalidatePath("/debts");
  return {};
}

export async function createDebt(input: CreateDebtInput): Promise<Result> {
  return run((supabase, userId) => createDebtData(supabase, input, userId, vnToday()));
}

export async function addDebtPayment(input: AddDebtPaymentInput): Promise<Result> {
  return run((supabase, userId) => addDebtPaymentData(supabase, input, userId, vnToday()));
}

export async function deleteDebtPayment(paymentId: string): Promise<Result> {
  return run((supabase) => deleteDebtPaymentData(supabase, paymentId));
}

export async function archiveDebt(debtId: string): Promise<Result> {
  return run((supabase) => archiveDebtData(supabase, debtId));
}
