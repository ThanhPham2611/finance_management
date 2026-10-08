import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import {
  addDebtPaymentInputSchema,
  createDebtInputSchema,
  vietnamToday,
  type AddDebtPaymentInput,
  type CreateDebtInput,
  type Debt,
  type DebtPayment,
} from "@hu/domain";
import { dataFailure, dataSuccess, type DataResult } from "./result";

export type DebtWithPayments = Debt & { payments: DebtPayment[] };

type DebtRow = {
  id: string;
  name: string;
  principal: number;
  term_months: number;
  start_date: string;
  debt_payments: { id: string; debt_id: string; amount: number; paid_on: string }[] | null;
};

export function mapDebt(row: DebtRow): DebtWithPayments {
  return {
    id: row.id,
    name: row.name,
    principal: Number(row.principal),
    termMonths: row.term_months,
    startDate: row.start_date,
    payments: (row.debt_payments ?? [])
      .map((payment) => ({ id: payment.id, debtId: payment.debt_id, amount: Number(payment.amount), paidOn: payment.paid_on }))
      .sort((a, b) => (a.paidOn < b.paidOn ? 1 : a.paidOn > b.paidOn ? -1 : 0)),
  };
}

/** Các khoản nợ đang theo dõi của user (RLS giới hạn theo chủ), cũ nhất trước. */
export async function listDebts(client: SupabaseClient<Database>): Promise<DebtWithPayments[]> {
  const { data, error } = await client
    .from("debts")
    .select("id, name, principal, term_months, start_date, debt_payments(id, debt_id, amount, paid_on)")
    .eq("is_active", true)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as unknown as DebtRow[]).map(mapDebt);
}

async function currentUserId(client: SupabaseClient<Database>, known?: string): Promise<string | null> {
  if (known) return known;
  const { data, error } = await client.auth.getUser();
  return error || !data.user ? null : data.user.id;
}

export async function createDebt(
  client: SupabaseClient<Database>,
  input: CreateDebtInput,
  authenticatedUserId?: string,
  today = vietnamToday(),
): Promise<DataResult<void>> {
  const parsed = createDebtInputSchema.safeParse(input);
  if (!parsed.success) return dataFailure("VALIDATION", "Kiểm tra lại tên khoản nợ, số tiền và số tháng (1–600).");
  const userId = await currentUserId(client, authenticatedUserId);
  if (!userId) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");

  const { error } = await client.from("debts").insert({
    user_id: userId,
    name: parsed.data.name,
    principal: parsed.data.principal,
    term_months: parsed.data.termMonths,
    start_date: parsed.data.startDate ?? today,
  });
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

export async function addDebtPayment(
  client: SupabaseClient<Database>,
  input: AddDebtPaymentInput,
  authenticatedUserId?: string,
  today = vietnamToday(),
): Promise<DataResult<void>> {
  const parsed = addDebtPaymentInputSchema.safeParse(input);
  if (!parsed.success) return dataFailure("VALIDATION", "Số tiền trả phải lớn hơn 0 và ngày phải hợp lệ.");
  const userId = await currentUserId(client, authenticatedUserId);
  if (!userId) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");

  const { error } = await client.from("debt_payments").insert({
    user_id: userId,
    debt_id: parsed.data.debtId,
    amount: parsed.data.amount,
    paid_on: parsed.data.paidOn ?? today,
  });
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

/** Xoá một lần trả nhập nhầm. */
export async function deleteDebtPayment(client: SupabaseClient<Database>, paymentId: string): Promise<DataResult<void>> {
  const { error } = await client.from("debt_payments").delete().eq("id", paymentId);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

/** Bỏ khoản nợ khỏi danh sách (soft delete như hũ, giữ lại lịch sử trả). */
export async function archiveDebt(client: SupabaseClient<Database>, debtId: string): Promise<DataResult<void>> {
  const { error } = await client.from("debts").update({ is_active: false }).eq("id", debtId);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}
