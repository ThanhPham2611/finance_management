import type { Transaction } from "./types";

export type TransactionSuggestion = Pick<Transaction, "jarId" | "amount" | "type"> & {
  note: string;
  /** Số lần giao dịch y hệt đã được nhập. */
  count: number;
  lastDate: string;
};

type Source = Pick<Transaction, "jarId" | "amount" | "type" | "transactionDate"> & { note: string | null };

const normalize = (note: string | null) => (note ?? "").trim().replace(/\s+/g, " ").toLowerCase();

/**
 * Gợi ý nhập nhanh: các giao dịch GIỐNG HỆT (cùng loại, hũ, số tiền, ghi chú không phân biệt hoa thường) đã nhập từ `minCount` lần.
 * Xếp theo số lần nhập, rồi theo ngày gần nhất; ghi chú hiển thị lấy theo lần nhập gần nhất. Người gọi lọc trước theo người dùng/khoảng thời gian.
 */
export function suggestTransactions(transactions: Source[], { limit = 6, minCount = 2 }: { limit?: number; minCount?: number } = {}): TransactionSuggestion[] {
  const groups = new Map<string, TransactionSuggestion>();
  for (const transaction of transactions) {
    if (!(transaction.amount > 0)) continue;
    const key = [transaction.type, transaction.jarId, transaction.amount, normalize(transaction.note)].join("|");
    const group = groups.get(key);
    if (!group) {
      groups.set(key, { jarId: transaction.jarId, amount: transaction.amount, type: transaction.type, note: (transaction.note ?? "").trim(), count: 1, lastDate: transaction.transactionDate });
    } else {
      group.count++;
      if (transaction.transactionDate >= group.lastDate) {
        group.lastDate = transaction.transactionDate;
        group.note = (transaction.note ?? "").trim();
      }
    }
  }
  return [...groups.values()]
    .filter((group) => group.count >= minCount)
    .sort((a, b) => b.count - a.count || (a.lastDate < b.lastDate ? 1 : a.lastDate > b.lastDate ? -1 : 0))
    .slice(0, limit);
}
