import { describe, expect, it } from "vitest";
import {
  calculateJarStats,
  createJarInputSchema,
  createMonthWindow,
  createTransactionInputSchema,
  formatMoney,
  groupTransactionsByDay,
} from "../src/index";

const JAR_ID = "11111111-1111-4111-8111-111111111111";

describe("money and month behavior", () => {
  it("formats VND amounts without decimal digits", () => {
    expect(formatMoney(1_600_000.4)).toBe("1.600.000");
  });

  it("falls back to the current Vietnam month for future input", () => {
    expect(createMonthWindow("2026-11", new Date(2026, 8, 30))).toEqual({
      ym: "2026-09",
      from: "2026-09-01",
      to: "2026-10-01",
      label: "Giao dịch tháng 9",
      month: 9,
      isCurrent: true,
      prev: "2026-08",
      next: null,
    });
  });

  it("creates a leap-February window with an exclusive March boundary", () => {
    const window = createMonthWindow("2028-02", new Date(2028, 1, 20));
    expect(window.from).toBe("2028-02-01");
    expect(window.to).toBe("2028-03-01");
  });
});

describe("transaction grouping", () => {
  it("excludes deposits from the daily spending total", () => {
    const groups = groupTransactionsByDay(
      [
        { transactionDate: "2026-09-30", amount: 120_000, type: "expense" as const },
        { transactionDate: "2026-09-30", amount: 50_000, type: "deposit" as const },
      ],
      new Date(2026, 8, 30),
    );

    expect(groups).toHaveLength(1);
    expect(groups[0]?.total).toBe(120_000);
    expect(groups[0]?.dayLabel).toBe("Hôm nay · 30.09");
  });
});

describe("jar calculations", () => {
  it("marks a jar as projected over budget after three days", () => {
    const stats = calculateJarStats(
      {
        id: JAR_ID,
        name: "Ăn uống",
        icon: "utensils",
        color: "#C58A31",
        monthlyBudget: 3_000_000,
        spent: 1_000_000,
        isShared: false,
        alertAt80: true,
        rollover: false,
        isSavings: false,
      },
      new Date(2026, 8, 5),
    );

    expect(stats.over).toBe(false);
    expect(stats.willExceed).toBe(true);
    expect(stats.projectedSpent).toBe(6_000_000);
    expect(stats.projectedOverAmount).toBe(3_000_000);
  });
});

describe("input validation", () => {
  it("rejects a transaction with a non-positive amount", () => {
    const result = createTransactionInputSchema.safeParse({ jarId: JAR_ID, amount: 0, note: "", type: "expense" });
    expect(result.success).toBe(false);
  });

  it("trims a valid jar name", () => {
    const result = createJarInputSchema.parse({
      name: "  Du lịch  ",
      monthlyBudget: 2_000_000,
      color: "#C58A31",
      icon: "plane",
    });
    expect(result.name).toBe("Du lịch");
  });

  it("requires savings jars to roll over", () => {
    const result = createJarInputSchema.safeParse({
      name: "Mua nhà",
      monthlyBudget: 5_000_000,
      color: "#C58A31",
      icon: "house",
      isSavings: true,
      rollover: false,
    });
    expect(result.success).toBe(false);
  });

  it("rejects calendar dates that do not exist", () => {
    const result = createTransactionInputSchema.safeParse({
      jarId: JAR_ID,
      amount: 10_000,
      note: "",
      type: "expense",
      transactionDate: "2026-02-31",
    });
    expect(result.success).toBe(false);
  });
});
