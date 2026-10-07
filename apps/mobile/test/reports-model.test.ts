import { describe, expect, it } from "vitest";
import type { TransactionWithJar } from "@hu/data";
import { buildReport, reportsFetchSince } from "../src/features/reports/model";

function tx(
  id: string,
  date: string,
  amount: number,
  jar: { id: string; name: string; color: string },
  type: "expense" | "deposit" = "expense",
): TransactionWithJar {
  return {
    id,
    jarId: jar.id,
    amount,
    note: null,
    transactionDate: date,
    userId: "u1",
    type,
    jarName: jar.name,
    jarIcon: "utensils",
    jarColor: jar.color,
  };
}

const food = { id: "food", name: "Ăn uống", color: "#174C3C" };
const old = { id: "old", name: "Hũ cũ", color: "#9A5B13" };
const activeIds = new Set(["food"]);

const expenseFixtures = [
  tx("1", "2026-09-26", 100_000, food),
  tx("2", "2026-10-01", 200_000, food),
  tx("3", "2026-09-30", 150_000, old),
  tx("4", "2026-09-20", 300_000, food),
  // deposits must never change any expected value
  tx("5", "2026-09-26", 999_000, food, "deposit"),
  tx("6", "2026-09-20", 999_000, old, "deposit"),
  tx("7", "2026-10-01", 999_000, food, "deposit"),
];

const now = new Date("2026-09-30T18:30:00.000Z"); // 2026-10-01 01:30 in Vietnam

describe("report ranges", () => {
  it("fetches back to the start of the previous six-month window", () => {
    expect(reportsFetchSince(now)).toBe("2025-11-01");
  });

  it("builds a 7-day week in Vietnam time", () => {
    const week = buildReport(expenseFixtures, activeIds, "week", now);
    expect(week.currentFrom).toBe("2026-09-25");
    expect(week.currentToExclusive).toBe("2026-10-02");
    expect(week.previousFrom).toBe("2026-09-18");
    expect(week.previousToExclusive).toBe("2026-09-25");
    expect(week.buckets).toHaveLength(7);
    expect(week.initialBucketIndex).toBe(6);
    expect([week.label, week.note]).toEqual(["Tuần này", "tuần này"]);
  });

  it("builds a calendar month with seven-day buckets", () => {
    const month = buildReport(expenseFixtures, activeIds, "month", new Date("2027-01-15T05:00:00.000Z"));
    expect([month.currentFrom, month.previousFrom]).toEqual(["2027-01-01", "2026-12-01"]);
    expect([month.currentToExclusive, month.previousToExclusive]).toEqual(["2027-02-01", "2027-01-01"]);
    expect(month.buckets.map((b) => [b.from, b.toExclusive])).toEqual([
      ["2027-01-01", "2027-01-08"],
      ["2027-01-08", "2027-01-15"],
      ["2027-01-15", "2027-01-22"],
      ["2027-01-22", "2027-01-29"],
      ["2027-01-29", "2027-02-01"],
    ]);
    expect(month.initialBucketIndex).toBe(2);
    expect([month.label, month.note]).toEqual(["Tháng này", "tháng này"]);
  });

  it("builds six calendar months", () => {
    const half = buildReport(expenseFixtures, activeIds, "half", new Date("2027-02-10T05:00:00.000Z"));
    expect([half.currentFrom, half.previousFrom]).toEqual(["2026-09-01", "2026-03-01"]);
    expect([half.currentToExclusive, half.previousToExclusive]).toEqual(["2027-03-01", "2026-09-01"]);
    expect(half.buckets).toHaveLength(6);
    expect(half.initialBucketIndex).toBe(5);
    expect([half.label, half.note]).toEqual(["6 tháng", "6 tháng"]);
  });
});

describe("report aggregation", () => {
  it("sums only expenses and groups by jar", () => {
    const report = buildReport(expenseFixtures, activeIds, "week", now);
    // current week 09-25..10-01: 100k + 200k food, 150k old = 450k; previous 09-18..09-24: 300k
    expect(report.total).toBe(450_000);
    expect(report.previousTotal).toBe(300_000);
    expect(report.delta).toBe(150_000);
    expect(report.buckets.reduce((sum, bucket) => sum + bucket.value, 0)).toBe(report.total);
    expect(report.jars.map(({ name, total, count, isActive }) => ({ name, total, count, isActive }))).toEqual([
      { name: "Ăn uống", total: 300_000, count: 2, isActive: true },
      { name: "Hũ cũ", total: 150_000, count: 1, isActive: false },
    ]);
    expect(report.jars.reduce((sum, jar) => sum + jar.percentage, 0)).toBeCloseTo(100);
  });

  it("tracks what each jar spent in the previous period, so the change per jar can be shown", () => {
    const report = buildReport(expenseFixtures, activeIds, "week", now);
    // kỳ trước 09-18..09-24 chỉ có 300k của hũ Ăn uống (xem `expenseFixtures`); hũ Hũ cũ chưa chi gì ở kỳ đó
    const byName = Object.fromEntries(report.jars.map((jar) => [jar.name, jar.previousTotal]));
    expect(byName).toEqual({ "Ăn uống": 300_000, "Hũ cũ": 0 });
    expect(report.jars.reduce((sum, jar) => sum + jar.previousTotal, 0)).toBeLessThanOrEqual(report.previousTotal);
  });

  it("keeps zero-valued buckets and returns no jars for an empty range", () => {
    const empty = buildReport([], activeIds, "month", now);
    expect(empty.total).toBe(0);
    expect(empty.delta).toBe(0);
    expect(empty.jars).toEqual([]);
    expect(empty.buckets.length).toBeGreaterThan(0);
    expect(empty.buckets.every((bucket) => bucket.value === 0)).toBe(true);
  });

  it("orders equal totals by name", () => {
    const a = { id: "a", name: "B hũ", color: "#111" };
    const b = { id: "b", name: "A hũ", color: "#222" };
    const report = buildReport([tx("1", "2026-10-01", 10, a), tx("2", "2026-10-01", 10, b)], new Set(), "week", now);
    expect(report.jars.map((j) => j.name)).toEqual(["A hũ", "B hũ"]);
  });
});
