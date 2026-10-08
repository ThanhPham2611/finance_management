export type TransactionType = "expense" | "deposit";

export type Jar = {
  id: string;
  name: string;
  icon: string;
  color: string;
  monthlyBudget: number;
  spent: number;
  isShared: boolean;
  alertAt80: boolean;
  rollover: boolean;
  isSavings: boolean;
};

export type Transaction = {
  id: string;
  jarId: string;
  amount: number;
  note: string | null;
  transactionDate: string;
  userId: string;
  type: TransactionType;
};

export type Profile = {
  id: string;
  fullName: string | null;
  currency: string;
};

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

/** Khoản nợ (trả góp, vay người quen...). Tách hẳn khỏi hũ: tiền trả nợ không trừ vào hũ nào. `principal` là TỔNG số tiền phải trả (đã gồm lãi nếu có). */
export type Debt = {
  id: string;
  name: string;
  principal: number;
  termMonths: number;
  startDate: string;
};

export type DebtPayment = {
  id: string;
  debtId: string;
  amount: number;
  paidOn: string;
};
