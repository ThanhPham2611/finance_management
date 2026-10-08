import { describe, expect, it } from "vitest";
import {
  budgetShare,
  buildMonthGrid,
  calculateJarStats,
  calculateSpendingPace,
  formatCompactMoney,
  createJarInputSchema,
  createMonthWindow,
  createTransactionInputSchema,
  formatMoney,
  groupTransactionsByDay,
  JAR_COLORS,
  JAR_PRESETS,
  nextJarColor,
  paceMessage,
  pickJarColors,
  safeColor,
  withDistinctJarColors,
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

describe("calendar grid", () => {
  it("starts weeks on Monday and pads to full weeks", () => {
    const grid = buildMonthGrid("2026-10"); // 1/10/2026 là Thứ Năm
    expect(grid).toHaveLength(35);
    expect(grid.slice(0, 3)).toEqual([null, null, null]);
    expect(grid[3]).toEqual({ date: "2026-10-01", day: 1 });
    expect(grid[33]).toEqual({ date: "2026-10-31", day: 31 });
    expect(grid[34]).toBeNull();
  });

  it("handles February in a leap year", () => {
    expect(buildMonthGrid("2028-02").filter(Boolean)).toHaveLength(29);
  });

  it("shortens amounts for narrow cells", () => {
    expect([950, 45_000, 45_500, 1_200_000, 12_000_000].map(formatCompactMoney)).toEqual(["950", "45k", "45,5k", "1,2tr", "12tr"]);
  });
});

describe("jar presets", () => {
  it("every preset can be saved through the create-jar schema", () => {
    for (const preset of JAR_PRESETS) {
      const result = createJarInputSchema.safeParse({ name: preset.name, icon: preset.icon, color: preset.color, monthlyBudget: 0 });
      expect(result.success, preset.name).toBe(true);
    }
  });

  it("only the savings preset is named Tiết kiệm, and names are unique", () => {
    const names = JAR_PRESETS.map((preset) => preset.name);
    expect(new Set(names).size).toBe(names.length);
    expect(names).toContain("Tiết kiệm");
  });

  it("keeps hex colors and replaces CSS-only ones React Native cannot draw", () => {
    expect(safeColor("#174C3C")).toBe("#174C3C");
    expect(safeColor("oklch(0.52 0.10 155)")).toBe("#9A5B13");
    expect(safeColor("var(--color-accent)", "#000000")).toBe("#000000");
    expect(safeColor(null)).toBe("#9A5B13");
  });
});

describe("jar stats for savings jars", () => {
  it("never reports a negative percentage when deposits exceed withdrawals", () => {
    const jar = { id: "s", name: "Quỹ", icon: "savings", color: "#307A4F", monthlyBudget: 1_000_000, spent: -500_000, isShared: false, alertAt80: false, rollover: true, isSavings: true };
    const stats = calculateJarStats(jar, new Date(2026, 8, 10));
    expect(stats.pct).toBe(0);
    expect(stats.left).toBe(1_500_000);
    expect(stats.over).toBe(false);
  });
});

const jar = (over: Partial<Parameters<typeof calculateSpendingPace>[0][number]>) => ({
  id: "j",
  name: "Hũ",
  icon: "wallet",
  color: "#AB5637",
  monthlyBudget: 0,
  spent: 0,
  isShared: false,
  alertAt80: true,
  rollover: false,
  isSavings: false,
  ...over,
});

describe("spending pace", () => {
  // 30 ngày, ngân sách chi tiêu 15 triệu = 500k/ngày; hũ tiết kiệm không tính.
  const jars = (spent: number) => [jar({ monthlyBudget: 10_000_000, spent: spent * 0.6 }), jar({ monthlyBudget: 5_000_000, spent: spent * 0.4 }), jar({ monthlyBudget: 9_000_000, spent: 0, isSavings: true })];
  const day10 = new Date(2026, 8, 10);

  it("warns when the daily average beats the daily budget (600k vs 500k)", () => {
    const pace = calculateSpendingPace(jars(6_000_000), day10);
    expect(pace).toMatchObject({ status: "over", dailyBudget: 500_000, dailyAverage: 600_000, projectedOver: 3_000_000 });
    expect(pace.dailyAllowed).toBeCloseTo(9_000_000 / 21);
    expect(paceMessage(pace, (n) => `${Math.round(n)}đ`)?.tone).toBe("danger");
  });

  it("is good under 90%, watch between 90% and 100%", () => {
    expect(calculateSpendingPace(jars(4_000_000), day10).status).toBe("good");
    expect(calculateSpendingPace(jars(4_800_000), day10).status).toBe("watch");
    expect(calculateSpendingPace(jars(5_000_000), day10).status).toBe("watch");
  });

  it("does not judge in the first two days or without a budget", () => {
    expect(calculateSpendingPace(jars(900_000), new Date(2026, 8, 2)).status).toBe("early");
    expect(calculateSpendingPace([jar({})], day10).status).toBe("none");
    expect(paceMessage(calculateSpendingPace([jar({})], day10), String)).toBeNull();
  });

  it("allows nothing more once the budget is gone", () => {
    expect(calculateSpendingPace(jars(16_000_000), day10).dailyAllowed).toBe(0);
  });
});

describe("budget share", () => {
  it("is the rounded percentage of the total, 0 for an empty total", () => {
    expect(budgetShare({ monthlyBudget: 2_500_000 }, 10_000_000)).toBe(25);
    expect(budgetShare({ monthlyBudget: 1 }, 3)).toBe(33);
    expect(budgetShare({ monthlyBudget: 100 }, 0)).toBe(0);
  });
});

describe("jar colors", () => {
  it("has enough distinct, drawable colors and keeps the preset colors first", () => {
    expect(JAR_COLORS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(JAR_COLORS.map((color) => color.toUpperCase())).size).toBe(JAR_COLORS.length);
    expect(JAR_COLORS.every((color) => safeColor(color, "bad") === color)).toBe(true);
    expect(JAR_COLORS.slice(0, JAR_PRESETS.length)).toEqual(JAR_PRESETS.map((preset) => preset.color));
  });

  it("hands out the first unused color, case-insensitively, and cycles least-used when exhausted", () => {
    expect(nextJarColor([])).toBe(JAR_COLORS[0]);
    expect(nextJarColor([JAR_COLORS[0].toLowerCase(), "var(--x)", null])).toBe(JAR_COLORS[1]);
    expect(nextJarColor([...JAR_COLORS, ...JAR_COLORS.slice(0, 3)])).toBe(JAR_COLORS[3]);
  });

  it("recolors only the later duplicates, keeping the first jar's color and the order", () => {
    const jars = [{ id: "a", color: "#9A5B13" }, { id: "b", color: "#9a5b13" }, { id: "c", color: "#9A5B13" }, { id: "d", color: "#174C3C" }];
    const out = withDistinctJarColors(jars);
    expect(out.map((jar) => jar.id)).toEqual(["a", "b", "c", "d"]);
    expect(out[0].color).toBe("#9A5B13");
    expect(out[3].color).toBe("#174C3C");
    expect(new Set(out.map((jar) => jar.color.toUpperCase())).size).toBe(4);
    expect(jars[1].color).toBe("#9a5b13"); // input untouched
  });

  it("keeps a free requested color, replaces a taken or invalid one, and never repeats inside a batch", () => {
    const [a, b, c, d] = pickJarColors([JAR_COLORS[5], JAR_COLORS[5], "var(--color-accent)", undefined], [JAR_COLORS[0]]);
    expect(a).toBe(JAR_COLORS[5]);
    expect(new Set([JAR_COLORS[0], a, b, c, d]).size).toBe(5);
  });
});
