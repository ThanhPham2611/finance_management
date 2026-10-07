"use server";

import { revalidatePath } from "next/cache";
import { createJars as createJarsData } from "@hu/data";
import type { CreateJarInput } from "@hu/domain";
import { createClient } from "@/lib/supabase/server";

// Hu ca nhan: khong con truong isShared/household o day nua — hu gia dinh
// gio duoc tao rieng tu trang Gia dinh (createFamilyJar), khong phai tu
// day, de tranh trung lap ten/ngan sach voi hu cua nguoi con lai.
export type { CreateJarInput } from "@hu/domain";

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
  const result = await createJarsData(supabase, inputs, user.id);
  if (result.error) return { error: result.error.message };

  revalidateJarPaths();
  return {};
}
