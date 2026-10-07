import { describe, expect, it } from "vitest";
import { JAR_PRESETS, type Jar } from "@hu/domain";
import { canSaveDrafts, draftCustom, draftFromPreset, togglePreset, toCreateInputs } from "../src/features/finance/jar-wizard";
import { jarDetail, jarsOverview } from "../src/features/finance/jar-stats";

const jar = (over: Partial<Jar> = {}): Jar => ({
  id: "j", name: "Ăn uống", icon: "utensils", color: "#174C3C", monthlyBudget: 1_000_000, spent: 400_000,
  isShared: false, alertAt80: true, rollover: false, isSavings: false, ...over,
});
const day10 = new Date(2026, 8, 10); // 10/9/2026, tháng 30 ngày

const preset = (name: string) => JAR_PRESETS.find((p) => p.name === name)!;

describe("jar wizard drafts", () => {
  it("toggling a preset adds then removes it", () => {
    const once = togglePreset([], preset("Ăn uống"));
    expect(once).toHaveLength(1);
    expect(once[0]).toMatchObject({ presetName: "Ăn uống", name: "Ăn uống", color: "#AB5637", budget: 0, isSavings: false });
    expect(togglePreset(once, preset("Ăn uống"))).toEqual([]);
  });

  it("the Tiết kiệm preset starts as a savings jar", () => {
    expect(draftFromPreset(preset("Tiết kiệm")).isSavings).toBe(true);
  });

  it("each draft gets its own key, and custom drafts start unnamed", () => {
    const a = draftCustom();
    const b = draftCustom();
    expect(a.key).not.toBe(b.key);
    expect(a).toMatchObject({ presetName: null, name: "", color: "#9A5B13" });
  });

  it("can save only when every draft has a name", () => {
    expect(canSaveDrafts([])).toBe(false);
    expect(canSaveDrafts([draftCustom()])).toBe(false);
    expect(canSaveDrafts([{ ...draftCustom(), name: "  " }])).toBe(false);
    expect(canSaveDrafts([{ ...draftCustom(), name: "Quà tặng" }, draftFromPreset(preset("Đi lại"))])).toBe(true);
  });

  it("builds create inputs with the shared options and trimmed names", () => {
    const drafts = [{ ...draftFromPreset(preset("Đi lại")), budget: 700_000 }, { ...draftCustom(), name: "  Quà tặng " }];
    expect(toCreateInputs(drafts, { alertAt80: false, rollover: true })).toEqual([
      { name: "Đi lại", icon: "bus", color: "#2C7866", monthlyBudget: 700_000, alertAt80: false, rollover: true, isSavings: false },
      { name: "Quà tặng", icon: "wallet", color: "#9A5B13", monthlyBudget: 0, alertAt80: false, rollover: true, isSavings: false },
    ]);
  });
});

describe("jarDetail", () => {
  it("computes days left, per-day allowance and daily average", () => {
    // 250k trong 10 ngày → dự báo 750k/tháng, chưa vượt ngân sách 1tr.
    const d = jarDetail(jar({ spent: 250_000 }), day10);
    expect(d.daysLeft).toBe(21); // 30 - 10 + 1
    expect(d.remaining).toBe(750_000);
    expect(d.perDayLeft).toBeCloseTo(750_000 / 21);
    expect(d.avgPerDay).toBe(25_000);
    expect(d.banner).toBeNull();
  });

  it("flags over-budget, near-limit and projected overspend", () => {
    expect(jarDetail(jar({ spent: 1_200_000 }), day10).banner).toEqual({ tone: "danger", text: "Đã vượt ngân sách 200.000 ₫." });
    expect(jarDetail(jar({ spent: 850_000 }), day10).banner).toEqual({ tone: "warning", text: "Đã dùng 85% khi còn 21 ngày." });
    expect(jarDetail(jar({ spent: 340_000 }), day10).banner?.text).toMatch(/^Với tốc độ chi hiện tại, hũ này có thể vượt ngân sách khoảng /);
  });

  it("never warns for savings jars and floors the remaining at zero", () => {
    const d = jarDetail(jar({ isSavings: true, spent: 2_000_000 }), day10);
    expect(d.banner).toBeNull();
    expect(d.remaining).toBe(0);
  });
});

describe("jarsOverview", () => {
  it("leaves savings jars out of the budget total and attention count", () => {
    const jars = [jar({ id: "a", monthlyBudget: 3_000_000, spent: 3_500_000 }), jar({ id: "b", monthlyBudget: 1_000_000, spent: 100_000 }), jar({ id: "s", isSavings: true, monthlyBudget: 9_000_000, spent: 0 })];
    const o = jarsOverview(jars, day10);
    expect(o.budgetSum).toBe(4_000_000);
    expect(o.needsAttention).toBe(1);
    expect(o.shares.map((s) => [s.id, s.share])).toEqual([["a", 75], ["b", 25]]);
  });

  it("does not divide by zero when no jar has a budget", () => {
    const o = jarsOverview([jar({ monthlyBudget: 0, spent: 0 })], day10);
    expect(o.budgetSum).toBe(0);
    expect(o.shares[0].share).toBe(0);
  });
});
