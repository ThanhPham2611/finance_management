import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createMonthWindow,
  formatDayLabel as sharedFormatDayLabel,
  groupTransactionsByDay as sharedGroupTransactionsByDay,
  parseYMD as sharedParseYMD,
  toYMD as sharedToYMD,
  type MonthWindow as SharedMonthWindow,
  type Transaction as DomainTransaction,
} from "@hu/domain";
import { vnNow } from "@/lib/format";

export type RealTransaction = DomainTransaction;

export type RealTransactionWithJar = RealTransaction & {
  jarName: string;
  jarIcon: string;
  jarColor: string;
};

export type JarJoinRow = {
  id: string;
  jar_id: string;
  amount: number;
  note: string | null;
  transaction_date: string;
  user_id: string;
  type: "expense" | "deposit";
  jars: { name: string; icon: string | null; color: string | null } | { name: string; icon: string | null; color: string | null }[] | null;
};

export function firstJar(row: JarJoinRow["jars"]) {
  if (!row) return null;
  return Array.isArray(row) ? (row[0] ?? null) : row;
}

/**
 * Giao dich trong 1 hu. RLS tren bang `transactions` tu cho phep xem giao
 * dich cua ca 2 thanh vien gia dinh neu hu do la hu quy chung — nen o day
 * khong loc theo user_id nua, de "ai gop bao nhieu" hien du.
 */
export async function listTransactionsForJar(supabase: SupabaseClient, jarId: string, limit = 30): Promise<RealTransaction[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, jar_id, amount, note, transaction_date, user_id, type")
    .eq("jar_id", jarId)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? []).map((t) => ({
    id: t.id,
    jarId: t.jar_id,
    amount: Number(t.amount),
    note: t.note,
    transactionDate: t.transaction_date,
    userId: t.user_id,
    type: t.type,
  }));
}

/** Giao dich gan nhat ma user xem duoc (cua minh + hu quy chung), kem thong tin hu de hien thi. */
export async function listRecentTransactions(supabase: SupabaseClient, limit = 4): Promise<RealTransactionWithJar[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, jar_id, amount, note, transaction_date, user_id, type, jars(name, icon, color)")
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;

  return ((data ?? []) as unknown as JarJoinRow[]).map((t) => {
    const jar = firstJar(t.jars);
    return {
      id: t.id,
      jarId: t.jar_id,
      amount: Number(t.amount),
      note: t.note,
      transactionDate: t.transaction_date,
      userId: t.user_id,
      type: t.type,
      jarName: jar?.name ?? "Không rõ hũ",
      jarIcon: jar?.icon ?? "wallet",
      jarColor: jar?.color ?? "var(--color-accent)",
    };
  });
}

/** Tat ca giao dich xem duoc tu `sinceDate` (YYYY-MM-DD) den truoc `beforeDate` (neu co), kem thong tin hu. */
export async function listTransactionsSince(supabase: SupabaseClient, sinceDate: string, beforeDate?: string): Promise<RealTransactionWithJar[]> {
  let query = supabase
    .from("transactions")
    .select("id, jar_id, amount, note, transaction_date, user_id, type, jars(name, icon, color)")
    .gte("transaction_date", sinceDate);
  if (beforeDate) query = query.lt("transaction_date", beforeDate);

  const { data, error } = await query.order("transaction_date", { ascending: false }).order("created_at", { ascending: false });

  if (error) throw error;

  return ((data ?? []) as unknown as JarJoinRow[]).map((t) => {
    const jar = firstJar(t.jars);
    return {
      id: t.id,
      jarId: t.jar_id,
      amount: Number(t.amount),
      note: t.note,
      transactionDate: t.transaction_date,
      userId: t.user_id,
      type: t.type,
      jarName: jar?.name ?? "Không rõ hũ",
      jarIcon: jar?.icon ?? "wallet",
      jarColor: jar?.color ?? "var(--color-accent)",
    };
  });
}

const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function parseYMD(dateStr: string): Date {
  return sharedParseYMD(dateStr);
}

export function toYMD(date: Date): string {
  return sharedToYMD(date);
}

export type MonthWindow = SharedMonthWindow;

/** Cua so 1 thang de loc trang giao dich. `ym` sai hoac o tuong lai thi ve thang hien tai. `to` la dau thang sau (can tren, khong tinh). */
export function monthWindow(ym: string | undefined): MonthWindow {
  return createMonthWindow(ym, vnNow());
}

export function weekdayShort(dateStr: string): string {
  return WEEKDAYS_SHORT[parseYMD(dateStr).getDay()];
}

/** "Hôm nay", "Hôm qua", hoặc "Thứ X · dd.mm" — parse thu cong de tranh lech mui gio. */
export function formatDayLabel(dateStr: string): string {
  return sharedFormatDayLabel(dateStr, vnNow());
}

export function groupTransactionsByDay<T extends { transactionDate: string; amount: number; type?: "expense" | "deposit" }>(transactions: T[]) {
  return sharedGroupTransactionsByDay(transactions, vnNow());
}
