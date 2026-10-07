import { calculateJarStats, formatMoney, vietnamNow, type Jar, type TransactionType } from "@hu/domain";

const vnd = (value: number) => `${formatMoney(value)} ₫`;

/** Số còn lại của hũ sau khoản này: nạp thì cộng, chi thì trừ. */
export function balanceAfter(jar: Pick<Jar, "monthlyBudget" | "spent">, amount: number, type: TransactionType): number {
  const left = jar.monthlyBudget - jar.spent;
  return type === "deposit" ? left + amount : left - amount;
}

/** Dòng phụ trên mỗi hũ ở bước chọn hũ: còn/vượt bao nhiêu (hũ tiết kiệm: đã tiết kiệm). */
export function jarBalanceLabel(jar: Pick<Jar, "monthlyBudget" | "spent" | "isSavings">): string {
  const left = jar.monthlyBudget - jar.spent;
  return jar.isSavings ? `đã tiết kiệm ${vnd(Math.abs(left))}` : `${left < 0 ? "vượt" : "còn"} ${vnd(Math.abs(left))}`;
}

export type EntryHint = { text: string; tone: "default" | "warning" | "danger" };

/** Gợi ý trực tiếp dưới ô số tiền. Cảnh báo vàng khi sau khoản chi hũ còn dưới 15% ngân sách, đỏ khi vượt. */
export function entryHint(jar: Pick<Jar, "name" | "monthlyBudget" | "spent">, amount: number, type: TransactionType): EntryHint {
  if (!amount) return { text: "Nhập số tiền", tone: "default" };
  const after = balanceAfter(jar, amount, type);
  if (type === "deposit") return { text: `Sau khoản này ${jar.name} có ${vnd(after)}`, tone: "default" };
  if (after < 0) return { text: `Khoản này làm ${jar.name} vượt ${vnd(-after)}`, tone: "danger" };
  return { text: `Sau khoản này ${jar.name} còn ${vnd(after)}`, tone: jar.monthlyBudget && after < jar.monthlyBudget * 0.15 ? "warning" : "default" };
}

export type SavedSummary = { message: string; detail: string; balance: number; warning: string | null };

/** Tóm tắt sau khi lưu. `jar` phải là hũ TRƯỚC khoản giao dịch này (đừng truyền dữ liệu đã tải lại, sẽ bị cộng đôi). */
export function savedSummary(jar: Jar, amount: number, type: TransactionType, now = vietnamNow()): SavedSummary {
  const after = balanceAfter(jar, amount, type);
  const updated: Jar = { ...jar, spent: type === "deposit" ? jar.spent - amount : jar.spent + amount };
  const stats = calculateJarStats(updated, now);
  const detail = jar.isSavings
    ? `Đã tiết kiệm được ${vnd(Math.max(0, after))}`
    : type === "deposit"
      ? `Còn ${vnd(Math.max(0, after))} / ${vnd(jar.monthlyBudget)}`
      : `Đã chi ${vnd(updated.spent)} / ${vnd(jar.monthlyBudget)}`;
  const warning = jar.isSavings
    ? null
    : stats.over
      ? `Hũ này đã vượt ngân sách ${vnd(Math.abs(stats.left))}.`
      : stats.near
        ? `Hũ này đã dùng ${stats.pct}% ngân sách.`
        : stats.willExceed
          ? `Với tốc độ này, hũ có thể vượt ngân sách ~${vnd(stats.projectedOverAmount)} vào cuối tháng.`
          : null;
  return { message: `${type === "deposit" ? "Đã thu" : "Đã lưu"} ${vnd(amount)} vào ${jar.name}`, detail, balance: Math.max(0, after), warning };
}
