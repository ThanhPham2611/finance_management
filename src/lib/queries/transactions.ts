import type { SupabaseClient } from "@supabase/supabase-js";
import { vnNow } from "@/lib/format";

export type RealTransaction = {
  id: string;
  jarId: string;
  amount: number;
  note: string | null;
  transactionDate: string; // "YYYY-MM-DD"
  userId: string;
};

export type RealTransactionWithJar = RealTransaction & {
  jarName: string;
  jarIcon: string;
  jarColor: string;
};

type JarJoinRow = {
  id: string;
  jar_id: string;
  amount: number;
  note: string | null;
  transaction_date: string;
  user_id: string;
  jars: { name: string; icon: string | null; color: string | null } | { name: string; icon: string | null; color: string | null }[] | null;
};

function firstJar(row: JarJoinRow["jars"]) {
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
    .select("id, jar_id, amount, note, transaction_date, user_id")
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
  }));
}

/** Giao dich gan nhat ma user xem duoc (cua minh + hu quy chung), kem thong tin hu de hien thi. */
export async function listRecentTransactions(supabase: SupabaseClient, limit = 4): Promise<RealTransactionWithJar[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, jar_id, amount, note, transaction_date, user_id, jars(name, icon, color)")
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
      jarName: jar?.name ?? "Không rõ hũ",
      jarIcon: jar?.icon ?? "wallet",
      jarColor: jar?.color ?? "var(--color-accent)",
    };
  });
}

/** Tat ca giao dich xem duoc tu ngay `sinceDate` (YYYY-MM-DD) tro di, kem thong tin hu. */
export async function listTransactionsSince(supabase: SupabaseClient, sinceDate: string): Promise<RealTransactionWithJar[]> {
  const { data, error } = await supabase
    .from("transactions")
    .select("id, jar_id, amount, note, transaction_date, user_id, jars(name, icon, color)")
    .gte("transaction_date", sinceDate)
    .order("transaction_date", { ascending: false })
    .order("created_at", { ascending: false });

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
      jarName: jar?.name ?? "Không rõ hũ",
      jarIcon: jar?.icon ?? "wallet",
      jarColor: jar?.color ?? "var(--color-accent)",
    };
  });
}

const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function parseYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function weekdayShort(dateStr: string): string {
  return WEEKDAYS_SHORT[parseYMD(dateStr).getDay()];
}

/** "Hôm nay", "Hôm qua", hoặc "Thứ X · dd.mm" — parse thu cong de tranh lech mui gio. */
export function formatDayLabel(dateStr: string): string {
  const date = parseYMD(dateStr);
  const today = vnNow();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((today.getTime() - date.getTime()) / 86_400_000);

  const dm = `${String(date.getDate()).padStart(2, "0")}.${String(date.getMonth() + 1).padStart(2, "0")}`;
  if (diffDays === 0) return `Hôm nay · ${dm}`;
  if (diffDays === 1) return `Hôm qua · ${dm}`;
  return `${WEEKDAYS[date.getDay()]} · ${dm}`;
}

export function groupTransactionsByDay<T extends { transactionDate: string; amount: number }>(transactions: T[]) {
  const groups = new Map<string, T[]>();
  for (const t of transactions) {
    const list = groups.get(t.transactionDate) ?? [];
    list.push(t);
    groups.set(t.transactionDate, list);
  }
  return Array.from(groups.entries())
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, items]) => ({
      date,
      dayLabel: formatDayLabel(date),
      items,
      total: items.reduce((sum, t) => sum + t.amount, 0),
    }));
}
