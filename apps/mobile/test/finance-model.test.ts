import { describe, expect, it } from "vitest";
import type { Jar } from "@hu/domain";
import { amountFromText, buildOverviewSummary, mutationBlockedMessage } from "../src/features/finance/model";

const jars: Jar[] = [
  {
    id: "1",
    name: "Ăn uống",
    icon: "utensils",
    color: "#174C3C",
    monthlyBudget: 3_000_000,
    spent: 1_200_000,
    isShared: false,
    alertAt80: true,
    rollover: false,
    isSavings: false,
  },
  {
    id: "2",
    name: "Mua nhà",
    icon: "house",
    color: "#9A5B13",
    monthlyBudget: 5_000_000,
    spent: -500_000,
    isShared: false,
    alertAt80: false,
    rollover: true,
    isSavings: true,
  },
];

describe("mobile finance view model", () => {
  it("excludes savings jars from spendable remaining money", () => {
    expect(buildOverviewSummary(jars)).toEqual({
      budget: 3_000_000,
      spent: 1_200_000,
      remaining: 1_800_000,
      saved: 5_500_000,
      spendableJarCount: 1,
      savingsJarCount: 1,
    });
  });

  it("parses a formatted VND amount using digits only", () => {
    expect(amountFromText("1.250.000 đ")).toBe(1_250_000);
    expect(amountFromText("abc")).toBe(0);
  });

  it("blocks writes with a clear message while offline", () => {
    expect(mutationBlockedMessage(false)).toBe("Bạn đang offline. Kết nối mạng để lưu thay đổi.");
    expect(mutationBlockedMessage(true)).toBeNull();
  });
});
