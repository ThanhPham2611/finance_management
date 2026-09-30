"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { currentMonthStart } from "@/lib/queries/jars";

export type ApplyAllocationInput = {
  /** Tong thu nhap da nhap thang nay (truoc khi tru phan gop hu gia dinh)
   * — luu vao bang incomes de lam lich su, KHONG dung de tinh lai
   * monthlyBudget (client da tinh san). */
  income: number;
  allocations: { jarId: string; monthlyBudget: number; pct: number }[];
};

export async function applyAllocation(input: ApplyAllocationInput): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Bạn cần đăng nhập lại." };

  const results = await Promise.all(
    input.allocations.map(({ jarId, monthlyBudget }) =>
      supabase.from("jars").update({ monthly_budget: monthlyBudget }).eq("id", jarId).eq("user_id", user.id)
    )
  );

  const failed = results.find((r) => r.error);
  if (failed?.error) return { error: failed.error.message };

  // Luu lai lich su thu nhap + phan bo theo thang (bang incomes/jar_allocations,
  // co san trong schema nhung truoc day chua duoc ghi) — de cac tinh nang sau
  // (vd tien du cuoi thang) tinh duoc CHINH XAC dua tren so
  // that da ap dung cho thang do, thay vi xap xi bang jars.monthly_budget HIEN
  // TAI (co the da bi doi lai sau khi chia luong). Bam "Ap dung" nhieu lan
  // trong cung 1 thang se GHI DE ban ghi income cu (upsert theo user_id +
  // period_month — can migration_008_income_allocation_history.sql), khong
  // cong don. Loi o buoc nay KHONG chan flow chinh vi ngan sach hu da cap
  // nhat thanh cong roi — chi log lai de khong lam nguoi dung thay loi "gia"
  // trong khi viec chinh (ap dung ngan sach) van thanh cong.
  const periodMonth = currentMonthStart();
  const { data: income, error: incomeError } = await supabase
    .from("incomes")
    .upsert({ user_id: user.id, period_month: periodMonth, amount: input.income }, { onConflict: "user_id,period_month" })
    .select("id")
    .single();

  if (incomeError || !income) {
    console.error("applyAllocation: khong luu duoc lich su thu nhap (bo qua, khong chan flow chinh)", incomeError);
  } else {
    // Xoa breakdown cu cua thang nay truoc khi ghi lai — tranh cong don khi
    // bam Ap dung nhieu lan (vd sua lai % sau khi da ap dung 1 lan).
    await supabase.from("jar_allocations").delete().eq("income_id", income.id);
    if (input.allocations.length > 0) {
      const { error: allocError } = await supabase.from("jar_allocations").insert(
        input.allocations.map((a) => ({
          income_id: income.id,
          jar_id: a.jarId,
          user_id: user.id,
          percent: a.pct,
          amount: a.monthlyBudget,
        }))
      );
      if (allocError) console.error("applyAllocation: khong luu duoc lich su phan bo hu (bo qua, khong chan flow chinh)", allocError);
    }
  }

  revalidatePath("/jars");
  revalidatePath("/allocate");
  revalidatePath("/");
  revalidatePath("/transactions");
  revalidatePath("/reports");
  return {};
}
