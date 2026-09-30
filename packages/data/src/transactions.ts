import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import {
  createTransactionInputSchema,
  updateTransactionInputSchema,
  vietnamToday,
  type CreateTransactionInput,
  type Transaction,
  type UpdateTransactionInput,
} from "@hu/domain";
import { dataFailure, dataSuccess, type DataResult } from "./result";

export type TransactionWithJar = Transaction & {
  jarName: string;
  jarIcon: string;
  jarColor: string;
};

type TransactionJoinRow = {
  id: string;
  jar_id: string;
  amount: number;
  note: string | null;
  transaction_date: string;
  user_id: string;
  type: "expense" | "deposit";
  jars: { name: string; icon: string | null; color: string | null } | { name: string; icon: string | null; color: string | null }[] | null;
};

function validationMessage(path: PropertyKey | undefined): string {
  if (path === "jarId") return "Chưa chọn hũ.";
  if (path === "amount") return "Số tiền phải lớn hơn 0.";
  if (path === "transactionDate") return "Ngày giao dịch không hợp lệ.";
  return "Dữ liệu giao dịch không hợp lệ.";
}

function firstJar(value: TransactionJoinRow["jars"]) {
  if (!value) return null;
  return Array.isArray(value) ? (value[0] ?? null) : value;
}

export function mapTransaction(row: Omit<TransactionJoinRow, "jars">): Transaction {
  return {
    id: row.id,
    jarId: row.jar_id,
    amount: Number(row.amount),
    note: row.note,
    transactionDate: row.transaction_date,
    userId: row.user_id,
    type: row.type,
  };
}

export function mapTransactionWithJar(row: TransactionJoinRow): TransactionWithJar {
  const jar = firstJar(row.jars);
  return {
    ...mapTransaction(row),
    jarName: jar?.name ?? "Không rõ hũ",
    jarIcon: jar?.icon ?? "wallet",
    jarColor: jar?.color ?? "#9A5B13",
  };
}

export async function listTransactions(
  client: SupabaseClient<Database>,
  from: string,
  toExclusive?: string,
): Promise<TransactionWithJar[]> {
  let query = client
    .from("transactions")
    .select("id, jar_id, amount, note, transaction_date, user_id, type, jars(name, icon, color)")
    .gte("transaction_date", from);
  if (toExclusive) query = query.lt("transaction_date", toExclusive);
  const { data, error } = await query.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });
  if (error) throw error;
  return ((data ?? []) as unknown as TransactionJoinRow[]).map(mapTransactionWithJar);
}

export async function createTransaction(
  client: SupabaseClient<Database>,
  input: CreateTransactionInput,
  today = vietnamToday(),
  authenticatedUserId?: string,
): Promise<DataResult<void>> {
  const parsed = createTransactionInputSchema.safeParse({ ...input, transactionDate: input.transactionDate ?? today });
  if (!parsed.success) {
    return dataFailure("VALIDATION", validationMessage(parsed.error.issues[0]?.path[0]));
  }

  let userId = authenticatedUserId;
  if (!userId) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");
    userId = authData.user.id;
  }

  const { data: jar, error: jarError } = await client.from("jars").select("id").eq("id", parsed.data.jarId).maybeSingle();
  if (jarError) return dataFailure("SUPABASE", jarError.message);
  if (!jar) return dataFailure("NOT_FOUND", "Không tìm thấy hũ này.");

  const { error } = await client.from("transactions").insert({
    user_id: userId,
    jar_id: parsed.data.jarId,
    amount: parsed.data.amount,
    note: parsed.data.note || null,
    type: parsed.data.type,
    transaction_date: parsed.data.transactionDate ?? today,
  });
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

export async function updateTransaction(
  client: SupabaseClient<Database>,
  input: UpdateTransactionInput,
  authenticatedUserId?: string,
): Promise<DataResult<void>> {
  const parsed = updateTransactionInputSchema.safeParse(input);
  if (!parsed.success) return dataFailure("VALIDATION", validationMessage(parsed.error.issues[0]?.path[0]));

  if (!authenticatedUserId) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");
  }

  const { data: jar, error: jarError } = await client.from("jars").select("id").eq("id", parsed.data.jarId).maybeSingle();
  if (jarError) return dataFailure("SUPABASE", jarError.message);
  if (!jar) return dataFailure("NOT_FOUND", "Không tìm thấy hũ này.");

  const { error } = await client
    .from("transactions")
    .update({
      jar_id: parsed.data.jarId,
      amount: parsed.data.amount,
      note: parsed.data.note || null,
      transaction_date: parsed.data.transactionDate,
      type: parsed.data.type,
    })
    .eq("id", parsed.data.id);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

export async function deleteTransaction(
  client: SupabaseClient<Database>,
  transactionId: string,
  authenticatedUserId?: string,
): Promise<DataResult<void>> {
  let userId = authenticatedUserId;
  if (!userId) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");
    userId = authData.user.id;
  }
  const { error } = await client.from("transactions").delete().eq("id", transactionId).eq("user_id", userId);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}
