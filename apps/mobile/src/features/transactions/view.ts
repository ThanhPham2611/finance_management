import type { TransactionWithJar } from "@hu/data";

export type TypeFilter = "all" | "expense" | "deposit";
export type ScopeFilter = "all" | "personal" | "family";
export type TransactionFilters = { query: string; type: TypeFilter; jarId: string; scope: ScopeFilter };
export type DaySpend = { total: number; count: number };

export const noFilters: TransactionFilters = { query: "", type: "all", jarId: "all", scope: "all" };

const spentOf = (rows: TransactionWithJar[]) => rows.filter((t) => t.type !== "deposit");
const sum = (rows: TransactionWithJar[]) => rows.reduce((total, t) => total + t.amount, 0);

/** Lọc/tổng hợp giao dịch của 1 tháng, cùng quy tắc với trang Giao dịch của web:
 * tổng, lịch và thẻ Cá nhân/Gia đình chỉ tính khoản chi; khoản nạp vẫn hiện trong danh sách. */
export function buildTransactionView(transactions: TransactionWithJar[], familyJarIds: ReadonlySet<string>, filters: TransactionFilters) {
  const q = filters.query.trim().toLowerCase();
  const matched = transactions.filter((t) => {
    if (filters.type !== "all" && t.type !== filters.type) return false;
    if (filters.jarId !== "all" && t.jarId !== filters.jarId) return false;
    return !q || `${t.note ?? ""} ${t.jarName}`.toLowerCase().includes(q);
  });
  const filtered = filters.scope === "all" ? matched : matched.filter((t) => (filters.scope === "family") === familyJarIds.has(t.jarId));

  const matchedSpend = spentOf(matched);
  const family = matchedSpend.filter((t) => familyJarIds.has(t.jarId));
  const personal = matchedSpend.filter((t) => !familyJarIds.has(t.jarId));

  const spend = spentOf(filtered);
  const spendByDay = new Map<string, DaySpend>();
  for (const t of spend) {
    const day = spendByDay.get(t.transactionDate) ?? { total: 0, count: 0 };
    spendByDay.set(t.transactionDate, { total: day.total + t.amount, count: day.count + 1 });
  }

  return {
    filtered,
    filtering: q !== "" || filters.type !== "all" || filters.jarId !== "all" || filters.scope !== "all",
    totalSpent: sum(spend),
    personal: { amount: sum(personal), count: personal.length },
    family: { amount: sum(family), count: family.length },
    spendByDay,
  };
}
