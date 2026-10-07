import { describe, expect, it } from "vitest";
import type { Jar } from "@hu/domain";
import { balanceAfter, entryHint, jarBalanceLabel, savedSummary } from "../src/features/finance/entry";

const jar = (over: Partial<Jar> = {}): Jar => ({
  id: "food", name: "Ăn uống", icon: "wallet", color: "#174C3C", monthlyBudget: 1_000_000, spent: 400_000,
  isShared: false, alertAt80: true, rollover: false, isSavings: false, ...over,
});
// Ngày 10/30 để dự báo bật được (>= 3 ngày đã qua).
const day10 = new Date(2026, 8, 10);

describe("balanceAfter / jarBalanceLabel", () => {
  it("expense lowers and deposit raises the remaining amount", () => {
    expect(balanceAfter(jar(), 100_000, "expense")).toBe(500_000);
    expect(balanceAfter(jar(), 100_000, "deposit")).toBe(700_000);
  });

  it("labels remaining, over-budget and savings jars", () => {
    expect(jarBalanceLabel(jar())).toBe("còn 600.000 ₫");
    expect(jarBalanceLabel(jar({ spent: 1_200_000 }))).toBe("vượt 200.000 ₫");
    expect(jarBalanceLabel(jar({ isSavings: true, spent: 0 }))).toBe("đã tiết kiệm 1.000.000 ₫");
  });
});

describe("entryHint", () => {
  it("asks for an amount first", () => {
    expect(entryHint(jar(), 0, "expense")).toEqual({ text: "Nhập số tiền", tone: "default" });
  });

  it("shows what is left, with a warning below 15% of budget", () => {
    expect(entryHint(jar(), 100_000, "expense")).toEqual({ text: "Sau khoản này Ăn uống còn 500.000 ₫", tone: "default" });
    expect(entryHint(jar(), 500_000, "expense").tone).toBe("warning");
  });

  it("flags going over budget", () => {
    expect(entryHint(jar(), 700_000, "expense")).toEqual({ text: "Khoản này làm Ăn uống vượt 100.000 ₫", tone: "danger" });
  });

  it("deposit states the new balance and never warns", () => {
    expect(entryHint(jar(), 50_000, "deposit")).toEqual({ text: "Sau khoản này Ăn uống có 650.000 ₫", tone: "default" });
  });
});

describe("savedSummary", () => {
  it("expense: reports spent/budget and the remaining balance", () => {
    const s = savedSummary(jar({ spent: 100_000 }), 50_000, "expense", day10);
    expect(s.message).toBe("Đã lưu 50.000 ₫ vào Ăn uống");
    expect(s.detail).toBe("Đã chi 150.000 ₫ / 1.000.000 ₫");
    expect(s.balance).toBe(850_000);
    expect(s.warning).toBeNull();
  });

  it("deposit: reports remaining/budget", () => {
    const s = savedSummary(jar(), 100_000, "deposit", day10);
    expect(s.message).toBe("Đã thu 100.000 ₫ vào Ăn uống");
    expect(s.detail).toBe("Còn 700.000 ₫ / 1.000.000 ₫");
  });

  it("warns when the jar goes over, using the pre-save jar (no double counting)", () => {
    const s = savedSummary(jar({ spent: 950_000 }), 100_000, "expense", day10);
    expect(s.warning).toBe("Hũ này đã vượt ngân sách 50.000 ₫.");
    expect(s.balance).toBe(0);
  });

  it("warns when near the limit, then when the pace will exceed the budget", () => {
    expect(savedSummary(jar({ spent: 700_000 }), 150_000, "expense", day10).warning).toBe("Hũ này đã dùng 85% ngân sách.");
    // 300k trong 10 ngày → dự báo 900k < 1tr, chưa cảnh báo; 340k → dự báo 1,02tr
    expect(savedSummary(jar({ spent: 100_000 }), 200_000, "expense", day10).warning).toBeNull();
    expect(savedSummary(jar({ spent: 100_000 }), 240_000, "expense", day10).warning).toMatch(/^Với tốc độ này, hũ có thể vượt ngân sách ~/);
  });

  it("savings jars never warn and show the saved amount", () => {
    const s = savedSummary(jar({ isSavings: true, spent: 0 }), 200_000, "deposit", day10);
    expect(s.detail).toBe("Đã tiết kiệm được 1.200.000 ₫");
    expect(s.warning).toBeNull();
  });
});
