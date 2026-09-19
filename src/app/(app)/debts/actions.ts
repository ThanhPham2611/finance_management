"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type DebtInput = {
  name: string;
  principal: number;
  interestRate: number;
  minPayment: number;
};

function validate(input: DebtInput): string | null {
  if (!input.name.trim()) return "Chưa nhập tên khoản nợ.";
  if (!(input.principal >= 0)) return "Dư nợ không hợp lệ.";
  if (!(input.interestRate >= 0 && input.interestRate <= 100)) return "Lãi suất phải trong khoảng 0-100%.";
  if (!(input.minPayment >= 0)) return "Số tiền trả tối thiểu không hợp lệ.";
  return null;
}

export async function createDebt(input: DebtInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const { error } = await supabase.from("debts").insert({
    user_id: user.id,
    name: input.name.trim(),
    principal: input.principal,
    interest_rate: input.interestRate,
    min_payment: input.minPayment,
  });
  if (error) return { error: error.message };

  revalidatePath("/debts");
  return {};
}

export async function updateDebt(id: string, input: DebtInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const validationError = validate(input);
  if (validationError) return { error: validationError };

  const { error } = await supabase
    .from("debts")
    .update({
      name: input.name.trim(),
      principal: input.principal,
      interest_rate: input.interestRate,
      min_payment: input.minPayment,
    })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/debts");
  return {};
}

export async function deleteDebt(id: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const { error } = await supabase.from("debts").delete().eq("id", id).eq("user_id", user.id);
  if (error) return { error: error.message };

  revalidatePath("/debts");
  return {};
}
