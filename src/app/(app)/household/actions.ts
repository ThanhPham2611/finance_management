"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentMonthStart } from "@/lib/queries/jars";
import { getMyHouseholdId } from "@/lib/queries/household";

export async function createInvite(): Promise<{ code?: string; expiresAt?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const { data, error } = await supabase.rpc("create_household_invite");
  if (error) return { error: error.message };

  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { error: "Không tạo được mã mời." };

  revalidatePath("/household");
  return { code: row.code, expiresAt: row.expires_at };
}

export async function joinHousehold(code: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const trimmed = code.trim();
  if (!trimmed) return { error: "Nhập mã mời trước đã." };

  const { error } = await supabase.rpc("join_household", { p_code: trimmed });
  if (error) return { error: error.message };

  revalidatePath("/household");
  revalidatePath("/jars");
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}

export async function setNickname(userId: string, nickname: string): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const { error } = await supabase.rpc("set_member_nickname", { p_user_id: userId, p_nickname: nickname.trim() });
  if (error) return { error: error.message };

  revalidatePath("/household");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}

export type CreateFamilyJarInput = {
  name: string;
  icon: string;
  color: string;
  alertAt80: boolean;
  rollover: boolean;
};

/** Tao 1 hu gia dinh moi — ngan sach bat dau tu 0, se tang len khi tung nguoi nhap dong gop. */
export async function createFamilyJar(input: CreateFamilyJarInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const name = input.name.trim();
  if (!name) return { error: "Cần đặt tên cho hũ." };

  const householdId = await getMyHouseholdId(supabase, user.id);
  if (!householdId) return { error: "Cần lập gia đình trước khi tạo hũ gia đình." };

  const { error } = await supabase.from("jars").insert({
    user_id: user.id,
    name,
    icon: input.icon,
    color: input.color,
    monthly_budget: 0,
    alert_at_80: input.alertAt80,
    rollover: input.rollover,
    is_shared: true,
    household_id: householdId,
  });

  if (error) return { error: error.message };

  revalidatePath("/household");
  revalidatePath("/jars");
  revalidatePath("/");
  revalidatePath("/allocate");
  return {};
}

/**
 * Nhap/sua phan dong gop CUA CHINH MINH cho 1 hu gia dinh trong thang hien
 * tai — khong can nguoi kia duyet. Ngan sach hien thi cua hu (jars.monthly_budget)
 * duoc tinh lai = tong dong gop cua tat ca thanh vien ngay sau khi luu, de
 * moi noi khac trong app (dashboard, /jars, /allocate, /reports...) tu dong
 * thay so moi ma khong can sua gi them.
 */
export async function setContribution(jarId: string, amount: number): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };
  if (amount < 0) return { error: "Số tiền không thể âm." };

  const periodMonth = currentMonthStart();

  const { error: upsertError } = await supabase
    .from("jar_contributions")
    .upsert({ jar_id: jarId, user_id: user.id, period_month: periodMonth, amount }, { onConflict: "jar_id,user_id,period_month" });

  if (upsertError) return { error: upsertError.message };

  const { data: rows, error: sumError } = await supabase
    .from("jar_contributions")
    .select("amount")
    .eq("jar_id", jarId)
    .eq("period_month", periodMonth);

  if (sumError) return { error: sumError.message };

  const total = (rows ?? []).reduce((sum, r) => sum + Number(r.amount), 0);

  const { error: updateError } = await supabase.from("jars").update({ monthly_budget: total }).eq("id", jarId);
  if (updateError) return { error: updateError.message };

  revalidatePath("/household");
  revalidatePath("/jars");
  revalidatePath("/");
  revalidatePath("/allocate");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  revalidatePath(`/jars/${jarId}`);
  return {};
}
