import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import { vietnamNow } from "@hu/domain";
import { dataFailure, dataSuccess, type DataResult } from "./result";

type Client = SupabaseClient<Database>;

export type ApplyAllocationInput = {
  /** Tổng thu nhập đã nhập (trước khi trừ phần góp hũ gia đình), lưu vào incomes làm lịch sử. */
  income: number;
  allocations: { jarId: string; monthlyBudget: number; pct: number }[];
};

const MAX_MONEY = 999_999_999_999.99;
const validMoney = (value: number) => Number.isFinite(value) && value >= 0 && value <= MAX_MONEY;

/**
 * Áp dụng kết quả Chia lương cho tháng hiện tại: cập nhật `jars.monthly_budget` rồi lưu lịch sử thu nhập + phân bổ.
 * Bấm lại trong cùng tháng GHI ĐÈ bản ghi cũ (upsert theo user_id + period_month), không cộng dồn. Lỗi khi lưu LỊCH SỬ không
 * làm hỏng thao tác chính (ngân sách đã cập nhật xong): chỉ làm tiền dư cuối tháng quay về xấp xỉ theo ngân sách hiện tại.
 */
export async function applyAllocation(client: Client, userId: string, input: ApplyAllocationInput, now: Date = vietnamNow()): Promise<DataResult<void>> {
  if (!validMoney(input.income) || input.allocations.some((a) => !validMoney(a.monthlyBudget))) {
    return dataFailure("VALIDATION", "Số tiền phân bổ không hợp lệ.");
  }

  const updates = await Promise.all(
    input.allocations.map(({ jarId, monthlyBudget }) => client.from("jars").update({ monthly_budget: monthlyBudget }).eq("id", jarId).eq("user_id", userId)),
  );
  const failed = updates.find((result) => result.error);
  if (failed?.error) return dataFailure("SUPABASE", failed.error.message);

  const periodMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const { data: income, error: incomeError } = await client
    .from("incomes")
    .upsert({ user_id: userId, period_month: periodMonth, amount: input.income }, { onConflict: "user_id,period_month" })
    .select("id")
    .single();
  if (incomeError || !income) return dataSuccess(undefined);

  // Xóa breakdown cũ của tháng này trước khi ghi lại, tránh cộng dồn khi áp dụng nhiều lần.
  await client.from("jar_allocations").delete().eq("income_id", income.id);
  if (input.allocations.length > 0) {
    await client.from("jar_allocations").insert(
      input.allocations.map((a) => ({ income_id: income.id, jar_id: a.jarId, user_id: userId, percent: a.pct, amount: a.monthlyBudget })),
    );
  }
  return dataSuccess(undefined);
}
