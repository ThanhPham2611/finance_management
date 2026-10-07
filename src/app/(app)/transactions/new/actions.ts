"use server";

import { revalidatePath } from "next/cache";
import { createTransaction as createTransactionData } from "@hu/data";
import type { CreateTransactionInput } from "@hu/domain";
import { createClient } from "@/lib/supabase/server";
import { vnToday } from "@/lib/format";

export type { CreateTransactionInput } from "@hu/domain";

export async function createTransaction(input: CreateTransactionInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const result = await createTransactionData(supabase, input, vnToday(), user.id);
  if (result.error) return { error: result.error.message };

  revalidatePath("/jars");
  revalidatePath(`/jars/${input.jarId}`);
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}
