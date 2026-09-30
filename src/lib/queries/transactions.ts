import type { SupabaseClient } from "@supabase/supabase-js";
import { vnNow } from "@/lib/format";

export type RealTransaction = {
  id: string;
  jarId: string;
  amount: number;
  note: string | null;
  transactionDate: string; // "YYYY-MM-DD"
  userId: string;
  type: "expense" | "deposit";
};

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

const WEEKDAYS = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
const WEEKDAYS_SHORT = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

export function parseYMD(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function toYMD(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

const YM = /^(\d{4})-(0[1-9]|1[0-2])$/;

export type MonthWindow = {
  ym: string;
  from: string;
  to: string;
  label: string;
  month: number;
  isCurrent: boolean;
  prev: string;
  next: string | null;
};

function shiftYm(ym: string, delta: number): string {
  const [y, m] = ym.split("-").map(Number);
  const date = new Date(y, m - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Cua so 1 thang de loc trang giao dich. `ym` sai hoac o tuong lai thi ve thang hien tai. `to` la dau thang sau (can tren, khong tinh). */
export function monthWindow(ym: string | undefined): MonthWindow {
  const now = vnNow();
  const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const requested = ym && YM.test(ym) && ym <= current ? ym : current;
  const month = Number(requested.slice(5));
  const isCurrent = requested === current;
  return {
    ym: requested,
    from: `${requested}-01`,
    to: `${shiftYm(requested, 1)}-01`,
    label: `Giao dịch tháng ${month}`,
    month,
    isCurrent,
    prev: shiftYm(requested, -1),
    next: isCurrent ? null : shiftYm(requested, 1),
  };
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

export function groupTransactionsByDay<T extends { transactionDate: string; amount: number; type?: string }>(transactions: T[]) {
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
      // Khoan nap khong phai "da chi" — loai khoi tong theo ngay, nhung
      // van giu du trong `items` de hien thi.
      total: items.reduce((sum, t) => sum + (t.type === "deposit" ? 0 : t.amount), 0),
    }));
}
