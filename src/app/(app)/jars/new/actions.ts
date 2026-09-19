"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Hu ca nhan: khong con truong isShared/household o day nua — hu gia dinh
// gio duoc tao rieng tu trang Gia dinh (createFamilyJar), khong phai tu
// day, de tranh trung lap ten/ngan sach voi hu cua nguoi con lai.
export type CreateJarInput = {
  name: string;
  icon: string;
  color: string;
  monthlyBudget: number;
  alertAt80: boolean;
  rollover: boolean;
};

function revalidateJarPaths() {
  revalidatePath("/jars");
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
}

/** Creates one or many jars in a single insert — used by both a single quick-add and the batch form. */
export async function createJars(inputs: CreateJarInput[]): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };
  if (inputs.length === 0) return { error: "Chưa chọn hũ nào." };

  const rows = [];
  for (const input of inputs) {
    const name = input.name.trim();
    if (!name) return { error: "Mỗi hũ cần có tên." };
    if (input.monthlyBudget < 0) return { error: "Ngân sách không thể âm." };
    rows.push({
      user_id: user.id,
      name,
      icon: input.icon,
      color: input.color,
      monthly_budget: input.monthlyBudget,
      alert_at_80: input.alertAt80,
      rollover: input.rollover,
      is_shared: false,
      household_id: null,
    });
  }

  const { error } = await supabase.from("jars").insert(rows);
  if (error) return { error: error.message };

  revalidateJarPaths();
  return {};
}
