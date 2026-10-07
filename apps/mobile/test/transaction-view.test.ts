import { describe, expect, it } from "vitest";
import type { TransactionWithJar } from "@hu/data";
import { jarLabel } from "../src/features/finance/model";
import { buildTransactionView, noFilters } from "../src/features/transactions/view";

const tx = (id: string, jarId: string, jarName: string, amount: number, over: Partial<TransactionWithJar> = {}): TransactionWithJar => ({
  id, jarId, jarName, jarIcon: "wallet", jarColor: "#174C3C", amount, note: null, transactionDate: "2026-10-05", userId: "me", type: "expense", ...over,
});

const rows = [
  tx("1", "food", "Ăn uống", 50_000, { note: "Phở bò" }),
  tx("2", "food", "Ăn uống", 30_000, { transactionDate: "2026-10-06" }),
  tx("3", "rent", "Nhà ở (gia đình)", 2_000_000),
  tx("4", "save", "Quỹ dư", 500_000, { type: "deposit" }),
];
const family = new Set(["rent"]);

describe("buildTransactionView", () => {
  it("counts only expenses in totals, keeps deposits in the list", () => {
    const view = buildTransactionView(rows, family, noFilters);
    expect(view.filtered).toHaveLength(4);
    expect(view.totalSpent).toBe(2_080_000);
    expect(view.filtering).toBe(false);
  });

  it("splits personal and family expenses", () => {
    const view = buildTransactionView(rows, family, noFilters);
    expect(view.personal).toEqual({ amount: 80_000, count: 2 });
    expect(view.family).toEqual({ amount: 2_000_000, count: 1 });
  });

  it("searches note and jar name, case-insensitively", () => {
    expect(buildTransactionView(rows, family, { ...noFilters, query: "  PHỞ " }).filtered.map((t) => t.id)).toEqual(["1"]);
    expect(buildTransactionView(rows, family, { ...noFilters, query: "ăn uống" }).filtered.map((t) => t.id)).toEqual(["1", "2"]);
  });

  it("filters by type and jar", () => {
    expect(buildTransactionView(rows, family, { ...noFilters, type: "deposit" }).filtered.map((t) => t.id)).toEqual(["4"]);
    expect(buildTransactionView(rows, family, { ...noFilters, jarId: "rent" }).filtered.map((t) => t.id)).toEqual(["3"]);
  });

  it("scope narrows the list but the scope cards keep reflecting the other filters", () => {
    const view = buildTransactionView(rows, family, { ...noFilters, scope: "family" });
    expect(view.filtered.map((t) => t.id)).toEqual(["3"]);
    expect(view.totalSpent).toBe(2_000_000);
    expect(view.personal.amount).toBe(80_000);
    expect(view.filtering).toBe(true);
  });

  it("aggregates expense per day for the calendar, ignoring deposits", () => {
    const view = buildTransactionView(rows, family, noFilters);
    expect(view.spendByDay.get("2026-10-05")).toEqual({ total: 2_050_000, count: 2 });
    expect(view.spendByDay.get("2026-10-06")).toEqual({ total: 30_000, count: 1 });
  });

  it("calendar totals follow the active filters", () => {
    const view = buildTransactionView(rows, family, { ...noFilters, jarId: "food" });
    expect(view.spendByDay.get("2026-10-05")).toEqual({ total: 50_000, count: 1 });
  });

  it("returns empty aggregates when nothing matches", () => {
    const view = buildTransactionView(rows, family, { ...noFilters, query: "không có gì" });
    expect(view.filtered).toEqual([]);
    expect(view.totalSpent).toBe(0);
    expect(view.spendByDay.size).toBe(0);
  });
});

describe("jarLabel", () => {
  it("marks family and savings jars like the web", () => {
    expect(jarLabel({ name: "Nhà", isShared: true, isSavings: false })).toBe("Nhà (gia đình)");
    expect(jarLabel({ name: "Quỹ", isShared: false, isSavings: true })).toBe("Quỹ (tiết kiệm)");
    expect(jarLabel({ name: "Ăn", isShared: false, isSavings: false })).toBe("Ăn");
  });
});
