import { describe, expect, it } from "vitest";
import { allocationSummary, clampPct, equalSplit, fillRemainder, formatPct, initialPcts, rebalanceByAmount, toAllocations } from "../src/features/allocate/model";

const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);

describe("equalSplit", () => {
  it("always adds up to 100, with the remainder on the last jar", () => {
    expect(equalSplit(0)).toEqual([]);
    expect(equalSplit(4)).toEqual([25, 25, 25, 25]);
    const three = equalSplit(3);
    expect(three).toEqual([33.3, 33.3, 33.4]);
    expect(sum(three)).toBeCloseTo(100, 5);
    for (const count of [1, 2, 5, 6, 7, 9]) expect(sum(equalSplit(count))).toBeCloseTo(100, 5);
  });
});

describe("initialPcts", () => {
  it("follows current budgets, and is all zero when nothing is budgeted yet", () => {
    expect(initialPcts([3_000_000, 1_000_000])).toEqual([75, 25]);
    expect(initialPcts([0, 0])).toEqual([0, 0]);
  });
});

describe("rebalanceByAmount", () => {
  it("rescales the other jars proportionally so the total stays 100%", () => {
    // thu nhập 10tr; sửa hũ 0 thành 5tr (50%), hai hũ còn lại đang 30/20 → chia lại 30/20 trên 50%
    const next = rebalanceByAmount([50, 30, 20], 0, 5_000_000, 10_000_000);
    expect(next[0]).toBe(50);
    expect(next[1]).toBeCloseTo(30);
    expect(next[2]).toBeCloseTo(20);

    const bigger = rebalanceByAmount([50, 30, 20], 0, 8_000_000, 10_000_000);
    expect(bigger).toEqual([80, expect.closeTo(12, 5), expect.closeTo(8, 5)]);
    expect(sum(bigger)).toBeCloseTo(100, 5);
  });

  it("splits the remainder evenly when the other jars are all at zero", () => {
    expect(rebalanceByAmount([100, 0, 0], 0, 4_000_000, 10_000_000)).toEqual([40, 30, 30]);
  });

  it("gives the other jars nothing once one jar takes the whole income or more", () => {
    expect(rebalanceByAmount([50, 50], 0, 15_000_000, 10_000_000)).toEqual([150, 0]);
  });

  it("does nothing without income to divide, and treats a negative amount as zero", () => {
    expect(rebalanceByAmount([60, 40], 0, 1_000_000, 0)).toEqual([60, 40]);
    expect(rebalanceByAmount([60, 40], 0, -5, 10_000_000)[0]).toBe(0);
  });
});

describe("fillRemainder / allocationSummary", () => {
  it("moves the unallocated part to the last jar", () => {
    expect(fillRemainder([30, 20, 10])).toEqual([30, 20, 50]);
  });

  it("takes an excess back off the last jar, never below zero", () => {
    expect(fillRemainder([60, 30, 20])).toEqual([60, 30, 10]);
    expect(fillRemainder([90, 40, 5])).toEqual([90, 40, 0]);
  });

  it("leaves an already complete split alone", () => {
    const done = [50, 50];
    expect(fillRemainder(done)).toBe(done);
    expect(fillRemainder([])).toEqual([]);
  });

  it("reports what is left, over-allocation and an exact split", () => {
    expect(allocationSummary([30, 20], 10_000_000)).toMatchObject({ leftAmount: 5_000_000, over: false, exact: false });
    expect(allocationSummary([70, 50], 10_000_000)).toMatchObject({ leftAmount: -2_000_000, over: true, exact: false });
    expect(allocationSummary([60, 40], 10_000_000)).toMatchObject({ over: false, exact: true });
  });
});

describe("toAllocations / formatting", () => {
  it("turns percentages into rounded monthly budgets of the personal income", () => {
    expect(toAllocations([{ id: "a" }, { id: "b" }], [33.3, 66.7], 10_000_000)).toEqual([
      { jarId: "a", monthlyBudget: 3_330_000, pct: 33.3 },
      { jarId: "b", monthlyBudget: 6_670_000, pct: 66.7 },
    ]);
  });

  it("formats percentages without a trailing .0 and clamps input to 0-100", () => {
    expect(formatPct(25)).toBe("25");
    expect(formatPct(33.3)).toBe("33.3");
    expect(clampPct(140)).toBe(100);
    expect(clampPct(-3)).toBe(0);
    expect(clampPct(Number.NaN)).toBe(0);
  });
});
