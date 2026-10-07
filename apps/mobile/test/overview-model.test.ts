import { describe, expect, it } from "vitest";
import type { Jar } from "@hu/domain";
import { overviewAlert, weekSpend, weekStart } from "../src/features/overview/model";

const jar = (over: Partial<Jar> = {}): Jar => ({
  id: "j", name: "Ăn uống", icon: "utensils", color: "#174C3C", monthlyBudget: 1_000_000, spent: 250_000,
  isShared: false, alertAt80: true, rollover: false, isSavings: false, ...over,
});
const day10 = new Date(2026, 8, 10);

describe("overviewAlert", () => {
  it("is empty when every jar is on track", () => {
    expect(overviewAlert([jar()], day10)).toBeNull();
  });

  it("joins over-budget, near-limit and projected overspend jars with a middle dot", () => {
    const jars = [
      jar({ id: "a", name: "Mua sắm", monthlyBudget: 500_000, spent: 650_000 }),
      jar({ id: "b", name: "Ăn uống", spent: 850_000 }),
      jar({ id: "c", name: "Đi lại", monthlyBudget: 600_000, spent: 220_000 }), // 220k/10 ngày → dự báo 660k > 600k
    ];
    expect(overviewAlert(jars, day10)).toBe(
      "Mua sắm vượt 150.000 ₫ · Ăn uống đã dùng 85% · Đi lại có thể vượt ~60.000 ₫ nếu chi tiếp với tốc độ này",
    );
  });

  it("ignores savings jars even when they look over budget", () => {
    expect(overviewAlert([jar({ isSavings: true, spent: 5_000_000 })], day10)).toBeNull();
  });

  it("does not repeat a jar already flagged as near the limit in the projection", () => {
    const text = overviewAlert([jar({ spent: 850_000 })], day10);
    expect(text).toBe("Ăn uống đã dùng 85%");
  });
});

describe("weekSpend", () => {
  const tx = (transactionDate: string, amount: number, type: "expense" | "deposit" = "expense") => ({ transactionDate, amount, type });

  it("always returns 7 days, oldest first, ending today", () => {
    const week = weekSpend([], day10);
    expect(week).toHaveLength(7);
    expect(week[0]).toEqual({ date: "2026-09-04", label: "T6", value: 0 });
    expect(week[6]).toEqual({ date: "2026-09-10", label: "T5", value: 0 });
    expect(weekStart(day10)).toBe("2026-09-04");
  });

  it("sums expenses per day and leaves deposits out", () => {
    const week = weekSpend([tx("2026-09-10", 30_000), tx("2026-09-10", 20_000), tx("2026-09-10", 500_000, "deposit"), tx("2026-09-08", 15_000)], day10);
    expect(week.find((day) => day.date === "2026-09-10")?.value).toBe(50_000);
    expect(week.find((day) => day.date === "2026-09-08")?.value).toBe(15_000);
  });

  it("crosses a month boundary", () => {
    const week = weekSpend([tx("2026-08-31", 10_000)], new Date(2026, 8, 2));
    expect(week.map((day) => day.date)).toEqual(["2026-08-27", "2026-08-28", "2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-02"]);
    expect(week[4].value).toBe(10_000);
  });
});
