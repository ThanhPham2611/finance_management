import { describe, expect, it } from "vitest";
import { addDebtPaymentInputSchema, addMonths, calculateDebtProgress, createDebtInputSchema, describeReminder, rankDebts, summarizeDebts, type Debt } from "../src/index";

const debt = (over: Partial<Debt> = {}): Debt => ({ id: "d", name: "iPhone", principal: 12_000_000, termMonths: 12, startDate: "2026-01-15", ...over });

describe("addMonths", () => {
  it("clamps to the last day of a shorter month", () => {
    expect(addMonths("2026-01-31", 1)).toBe("2026-02-28");
    expect(addMonths("2028-01-31", 1)).toBe("2028-02-29");
    expect(addMonths("2026-11-30", 3)).toBe("2027-02-28");
    expect(addMonths("2026-01-15", 12)).toBe("2027-01-15");
  });
});

describe("calculateDebtProgress", () => {
  it("tracks paid, remaining and the monthly amount needed to finish on time", () => {
    const progress = calculateDebtProgress(debt(), [{ amount: 3_000_000 }, { amount: 1_000_000 }], "2026-05-15");
    expect(progress).toMatchObject({ paid: 4_000_000, remaining: 8_000_000, pct: 33, dueDate: "2027-01-15", monthsLeft: 8, plannedMonthly: 1_000_000, monthlyNeeded: 1_000_000, status: "active" });
  });

  it("counts a partial month as one more payment period", () => {
    // 05/01 -> 15/01 năm sau: 8 tháng + 10 ngày => 9 kỳ.
    expect(calculateDebtProgress(debt(), [], "2026-05-05").monthsLeft).toBe(9);
    // 20/05 -> 15/01: 7 tháng + 26 ngày => 8 kỳ.
    expect(calculateDebtProgress(debt(), [], "2026-05-20").monthsLeft).toBe(8);
  });

  it("asks for more per month once behind schedule", () => {
    const progress = calculateDebtProgress(debt(), [{ amount: 1_000_000 }], "2026-07-15");
    expect(progress.monthsLeft).toBe(6);
    expect(progress.monthlyNeeded).toBe(Math.ceil(11_000_000 / 6));
  });

  it("is overdue after the due date until fully paid, and paid when nothing is left", () => {
    const overdue = calculateDebtProgress(debt(), [{ amount: 2_000_000 }], "2027-02-01");
    expect(overdue).toMatchObject({ status: "overdue", monthsLeft: 0, monthlyNeeded: 10_000_000 });
    expect(calculateDebtProgress(debt(), [{ amount: 12_000_000 }], "2027-02-01")).toMatchObject({ status: "paid", remaining: 0, pct: 100, monthlyNeeded: 0 });
    expect(calculateDebtProgress(debt(), [{ amount: 13_000_000 }], "2026-03-01").remaining).toBe(0);
  });
});

describe("debt reminder", () => {
  // 12tr / 12 tháng bắt đầu 15/01 => kỳ j đến hạn 15/(1+j), mỗi kỳ 1tr.
  const reminder = (paid: number, today: string, d = debt()) => calculateDebtProgress(d, paid ? [{ amount: paid }] : [], today).reminder;

  it("looks ahead to the first installment not yet covered, flagging it 'soon' within 7 days", () => {
    expect(reminder(4_000_000, "2026-05-10")).toEqual({ state: "later", dueDate: "2026-06-15", amount: 1_000_000, daysUntil: 36 });
    expect(reminder(4_000_000, "2026-06-10")).toMatchObject({ state: "soon", daysUntil: 5 });
    expect(reminder(4_000_000, "2026-06-08")).toMatchObject({ state: "soon", daysUntil: 7 });
    expect(reminder(4_000_000, "2026-06-07")).toMatchObject({ state: "later", daysUntil: 8 });
  });

  it("is due on the day and overdue after it", () => {
    expect(reminder(4_000_000, "2026-06-15")).toEqual({ state: "due", dueDate: "2026-06-15", amount: 1_000_000, daysUntil: 0 });
    expect(reminder(4_000_000, "2026-06-20")).toEqual({ state: "overdue", dueDate: "2026-06-15", amount: 1_000_000, daysUntil: -5 });
  });

  it("adds up every missed installment, including the final stretch past the last due date", () => {
    // 08/20: kỳ 5 (15/06), 6 (15/07), 7 (15/08) đã đến hạn => phải trả cộng dồn 7tr, đã trả 4tr.
    expect(reminder(4_000_000, "2026-08-20")).toMatchObject({ state: "overdue", amount: 3_000_000, dueDate: "2026-06-15" });
    expect(reminder(2_000_000, "2027-03-01")).toMatchObject({ state: "overdue", amount: 10_000_000 });
  });

  it("skips installments that were paid ahead, and is null once settled", () => {
    expect(reminder(6_500_000, "2026-02-01")).toEqual({ state: "later", dueDate: "2026-08-15", amount: 500_000, daysUntil: 195 });
    expect(reminder(12_000_000, "2026-06-01")).toBeNull();
  });

  it("makes the last installment absorb the rounding", () => {
    const d = debt({ principal: 1_000_000, termMonths: 3 });
    expect(reminder(666_668, "2026-02-01", d)).toMatchObject({ amount: 333_332, dueDate: "2026-04-15" });
  });

  it("describes each state in words", () => {
    const money = (n: number) => `${n}đ`;
    expect(describeReminder({ state: "overdue", dueDate: "2026-06-15", amount: 1_000_000, daysUntil: -5 }, money)).toBe("Trễ 5 ngày (hạn 15/06/2026) — cần trả 1000000đ");
    expect(describeReminder({ state: "due", dueDate: "2026-06-15", amount: 1, daysUntil: 0 }, money)).toBe("Đến hạn hôm nay — cần trả 1đ");
    expect(describeReminder({ state: "soon", dueDate: "2026-06-15", amount: 1, daysUntil: 3 }, money)).toBe("Hạn 15/06/2026 (còn 3 ngày) — 1đ");
    expect(describeReminder({ state: "later", dueDate: "2026-06-15", amount: 1, daysUntil: 30 }, money)).toBe("Kỳ tới 15/06/2026 — 1đ");
  });

  it("ranks the most urgent debt first and drops paid ones", () => {
    const items = [
      { debt: debt({ id: "later" }), payments: [{ amount: 4_000_000 }] },
      { debt: debt({ id: "paid" }), payments: [{ amount: 12_000_000 }] },
      { debt: debt({ id: "overdue", startDate: "2026-01-01" }), payments: [] },
    ];
    expect(rankDebts(items, "2026-05-10").map((item) => item.debt.id)).toEqual(["overdue", "later"]);
  });
});

describe("summarizeDebts", () => {
  it("adds up what is still owed and the monthly need, ignoring paid-off debts", () => {
    const items = [
      { debt: debt(), payments: [{ amount: 4_000_000 }] },
      { debt: debt({ id: "e", principal: 3_000_000, termMonths: 3, startDate: "2026-04-15" }), payments: [] },
      { debt: debt({ id: "f", principal: 500_000 }), payments: [{ amount: 500_000 }] },
    ];
    expect(summarizeDebts(items, "2026-05-15")).toEqual({ remaining: 8_000_000 + 3_000_000, monthlyNeeded: 1_000_000 + 1_500_000 });
  });
});

describe("debt input validation", () => {
  const id = "11111111-1111-4111-8111-111111111111";
  it("needs a name, positive amount and a whole-month term", () => {
    expect(createDebtInputSchema.safeParse({ name: " Nợ anh A ", principal: 5_000_000, termMonths: 6 }).success).toBe(true);
    expect(createDebtInputSchema.safeParse({ name: " ", principal: 5_000_000, termMonths: 6 }).success).toBe(false);
    expect(createDebtInputSchema.safeParse({ name: "A", principal: 0, termMonths: 6 }).success).toBe(false);
    expect(createDebtInputSchema.safeParse({ name: "A", principal: 1, termMonths: 0 }).success).toBe(false);
    expect(createDebtInputSchema.safeParse({ name: "A", principal: 1, termMonths: 1.5 }).success).toBe(false);
  });

  it("validates payments and optional dates", () => {
    expect(addDebtPaymentInputSchema.safeParse({ debtId: id, amount: 1_000_000, paidOn: "2026-02-30" }).success).toBe(false);
    expect(addDebtPaymentInputSchema.safeParse({ debtId: id, amount: 1_000_000 }).success).toBe(true);
    expect(addDebtPaymentInputSchema.safeParse({ debtId: id, amount: -1 }).success).toBe(false);
  });
});
