import { parseYMD, toYMD } from "./dates";
import type { Debt, DebtPayment } from "./types";

export type DebtStatus = "active" | "overdue" | "paid";

/** Báo trước hạn trả từ ngần này ngày. */
export const DEBT_REMIND_DAYS = 7;

export type DebtReminder = {
  /** `overdue`: đã quá hạn kỳ trả · `due`: đến hạn hôm nay · `soon`: trong `DEBT_REMIND_DAYS` ngày tới · `later`: còn xa. */
  state: "overdue" | "due" | "soon" | "later";
  /** Hạn của kỳ trả chưa đủ sớm nhất (có thể đã qua). */
  dueDate: string;
  /** Số tiền cần trả cho kỳ đó; khi đã trễ nhiều kỳ là tổng các kỳ đã đến hạn mà chưa trả đủ. */
  amount: number;
  /** Âm nếu đã trễ. */
  daysUntil: number;
};

export type DebtProgress = {
  paid: number;
  remaining: number;
  /** 0–100, làm tròn. */
  pct: number;
  /** Hạn trả cuối (YYYY-MM-DD) = ngày bắt đầu + số tháng dự kiến. */
  dueDate: string;
  /** Số kỳ (tháng) còn lại tính đến hạn; phần lẻ tháng tính thành một kỳ. */
  monthsLeft: number;
  /** Mức trả đều mỗi tháng theo kế hoạch ban đầu. */
  plannedMonthly: number;
  /** Mỗi tháng cần trả bao nhiêu từ giờ để kịp hạn; quá hạn thì cần trả hết phần còn lại. */
  monthlyNeeded: number;
  status: DebtStatus;
  /** Kỳ trả kế tiếp theo lịch trả đều (kỳ k đến hạn vào ngày bắt đầu + k tháng); null khi đã tất toán. */
  reminder: DebtReminder | null;
};

/** Cộng tháng theo lịch, kẹp ngày cuối tháng (31/01 + 1 tháng = 28|29/02, không nhảy sang tháng 3). */
export function addMonths(value: string, months: number): string {
  const start = parseYMD(value);
  const target = new Date(start.getFullYear(), start.getMonth() + months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  return toYMD(new Date(target.getFullYear(), target.getMonth(), Math.min(start.getDate(), lastDay)));
}

/** Số kỳ tháng từ `today` đến `due` (làm tròn lên), 0 nếu đã qua hạn. */
function monthsBetween(today: string, due: string): number {
  if (today >= due) return 0;
  const from = parseYMD(today);
  const to = parseYMD(due);
  const whole = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  return from.getDate() > to.getDate() ? whole : from.getDate() < to.getDate() ? whole + 1 : whole;
}

function daysBetween(from: string, to: string): number {
  return Math.round((parseYMD(to).getTime() - parseYMD(from).getTime()) / 86_400_000);
}

/**
 * Lịch trả đều: kỳ j đến hạn ở `startDate + j tháng` và cộng dồn phải trả đủ `min(principal, j × plannedMonthly)`.
 * Kỳ chưa đủ sớm nhất quyết định hạn nhắc; trả trước thì tự nhảy sang kỳ sau.
 */
function nextReminder(debt: Debt, paid: number, today: string): DebtReminder | null {
  if (paid >= debt.principal) return null;
  const planned = Math.ceil(debt.principal / debt.termMonths);
  const target = (installment: number) => Math.min(debt.principal, installment * planned);
  const due = (installment: number) => addMonths(debt.startDate, installment);

  let first = 1;
  while (first < debt.termMonths && target(first) <= paid) first++;
  const dueDate = due(first);
  const daysUntil = daysBetween(today, dueDate);
  if (dueDate > today) {
    return { state: daysUntil <= DEBT_REMIND_DAYS ? "soon" : "later", dueDate, amount: target(first) - paid, daysUntil };
  }

  let latest = first;
  while (latest < debt.termMonths && due(latest + 1) <= today) latest++;
  return { state: dueDate < today ? "overdue" : "due", dueDate, amount: target(latest) - paid, daysUntil };
}

const dmy = (ymd: string) => ymd.split("-").reverse().join("/");

/** Câu nhắc hiển thị cho 1 khoản nợ; dùng chung web/mobile. `money` đã gồm đơn vị. */
export function describeReminder(reminder: DebtReminder, money: (value: number) => string): string {
  const amount = money(reminder.amount);
  switch (reminder.state) {
    case "overdue":
      return `Trễ ${-reminder.daysUntil} ngày (hạn ${dmy(reminder.dueDate)}) — cần trả ${amount}`;
    case "due":
      return `Đến hạn hôm nay — cần trả ${amount}`;
    case "soon":
      return `Hạn ${dmy(reminder.dueDate)} (còn ${reminder.daysUntil} ngày) — ${amount}`;
    case "later":
      return `Kỳ tới ${dmy(reminder.dueDate)} — ${amount}`;
  }
}

export function calculateDebtProgress(debt: Debt, payments: Pick<DebtPayment, "amount">[], today: string): DebtProgress {
  const paid = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const remaining = Math.max(0, debt.principal - paid);
  const dueDate = addMonths(debt.startDate, debt.termMonths);
  const monthsLeft = monthsBetween(today, dueDate);
  const status: DebtStatus = remaining === 0 ? "paid" : today > dueDate ? "overdue" : "active";

  return {
    paid,
    remaining,
    pct: debt.principal > 0 ? Math.min(100, Math.round((paid / debt.principal) * 100)) : 100,
    dueDate,
    monthsLeft,
    plannedMonthly: Math.ceil(debt.principal / debt.termMonths),
    monthlyNeeded: status === "paid" ? 0 : status === "overdue" ? remaining : Math.ceil(remaining / Math.max(1, monthsLeft)),
    status,
    reminder: nextReminder(debt, paid, today),
  };
}

/** Tổng còn nợ và tổng mỗi tháng cần trả của các khoản chưa tất toán. */
export function summarizeDebts(items: { debt: Debt; payments: Pick<DebtPayment, "amount">[] }[], today: string) {
  let remaining = 0;
  let monthlyNeeded = 0;
  for (const { debt, payments } of items) {
    const progress = calculateDebtProgress(debt, payments, today);
    remaining += progress.remaining;
    monthlyNeeded += progress.monthlyNeeded;
  }
  return { remaining, monthlyNeeded };
}

/** Các khoản chưa tất toán, khoản gấp nhất (trễ hạn / sắp đến hạn) lên đầu. */
export function rankDebts<T extends { debt: Debt; payments: Pick<DebtPayment, "amount">[] }>(items: T[], today: string): (T & { progress: DebtProgress })[] {
  return items
    .map((item) => ({ ...item, progress: calculateDebtProgress(item.debt, item.payments, today) }))
    .filter((item) => item.progress.status !== "paid")
    .sort((a, b) => (a.progress.reminder?.daysUntil ?? Infinity) - (b.progress.reminder?.daysUntil ?? Infinity));
}
