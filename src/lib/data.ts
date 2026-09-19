import { formatVND } from "@/lib/format";

/**
 * Mock domain data for the "Hũ" budgeting prototype (design direction 1b —
 * "Lưới hũ", the one every later screen in the design canvas was built on).
 * Nothing here is wired to Supabase yet: it mirrors the fixed numbers used
 * in the design file so every screen matches it exactly, and is meant to be
 * swapped for real queries against the schema in supabase/schema.sql.
 */

export type Jar = {
  id: string;
  name: string;
  short: string;
  icon: string;
  hue: string;
  budget: number;
  spent: number;
  /** what this jar spent in the previous period — for the reports delta */
  prev: number;
  /** number of transactions logged against this jar this period */
  count: number;
};

export const GREEN = "oklch(0.52 0.10 155)";
export const GREEN_INK = "oklch(0.45 0.10 155)";
export const AMBER = "oklch(0.70 0.15 68)";
export const AMBER_INK = "oklch(0.40 0.10 68)";

export const JARS: Jar[] = [
  { id: "an-uong", name: "Ăn uống", short: "Ăn uống", icon: "utensils", hue: "oklch(0.55 0.12 40)", budget: 9_000_000, spent: 7_700_000, prev: 7_400_000, count: 34 },
  { id: "sinh-hoat", name: "Sinh hoạt / hoá đơn", short: "Sinh hoạt", icon: "house", hue: "oklch(0.50 0.06 250)", budget: 5_000_000, spent: 4_100_000, prev: 4_050_000, count: 9 },
  { id: "mua-sam", name: "Mua sắm", short: "Mua sắm", icon: "shopping-bag", hue: "var(--color-accent)", budget: 3_000_000, spent: 3_420_000, prev: 2_480_000, count: 11 },
  { id: "con-cai", name: "Con cái", short: "Con cái", icon: "baby", hue: "oklch(0.55 0.09 300)", budget: 4_000_000, spent: 1_400_000, prev: 1_650_000, count: 5 },
  { id: "giao-duc", name: "Giáo dục", short: "Giáo dục", icon: "graduation-cap", hue: "oklch(0.52 0.08 200)", budget: 2_000_000, spent: 1_200_000, prev: 1_200_000, count: 3 },
  { id: "giai-tri", name: "Giải trí", short: "Giải trí", icon: "clapperboard", hue: "oklch(0.58 0.10 330)", budget: 1_500_000, spent: 600_000, prev: 840_000, count: 7 },
  { id: "quy-chung", name: "Quỹ chung gia đình", short: "Quỹ chung", icon: "users", hue: "oklch(0.52 0.07 145)", budget: 3_000_000, spent: 1_500_000, prev: 1_400_000, count: 4 },
  { id: "tiet-kiem", name: "Tiết kiệm", short: "Tiết kiệm", icon: "piggy-bank", hue: GREEN, budget: 3_500_000, spent: 3_500_000, prev: 3_500_000, count: 1 },
  { id: "du-phong", name: "Dự phòng", short: "Dự phòng", icon: "shield", hue: "oklch(0.50 0.03 60)", budget: 1_000_000, spent: 0, prev: 400_000, count: 0 },
];

export const INCOME = 32_000_000;
export const PERIOD_LABEL = "Tháng 9, 2026";
export const DAYS_LEFT = 11;

export function jarById(id: string): Jar | undefined {
  return JARS.find((j) => j.id === id);
}

export function totalBudget(): number {
  return JARS.reduce((sum, j) => sum + j.budget, 0);
}

export function totalSpent(): number {
  return JARS.reduce((sum, j) => sum + j.spent, 0);
}

export function getJarStats(jar: Jar) {
  const left = jar.budget - jar.spent;
  const pct = jar.budget ? jar.spent / jar.budget : 0;
  const over = left < 0;
  const goal = jar.id === "tiet-kiem" && left <= 0;
  const near = !over && !goal && pct >= 0.8;
  return {
    left,
    over,
    goal,
    near,
    pct: Math.min(100, Math.round(pct * 100)),
    pctLabel: `${Math.min(100, Math.round(pct * 100))}%`,
    shareLabel: `${((jar.budget / totalBudget()) * 100).toFixed(1)}%`,
    leftWord: over ? "vượt" : goal ? "đủ" : "còn",
    leftAmount: formatVND(Math.abs(left)),
    barColor: over ? "var(--color-accent)" : near ? AMBER : goal ? GREEN : jar.hue,
    inkColor: over ? "var(--color-accent-700)" : goal ? GREEN_INK : "var(--color-text)",
    tileBg: over ? "var(--color-accent-100)" : "var(--color-bg)",
    rowBg: over ? "var(--color-accent-100)" : "transparent",
  };
}

export const PRESETS = [
  { name: "Ăn uống", icon: "utensils", hue: "oklch(0.55 0.12 40)", suggest: "25–30%" },
  { name: "Sinh hoạt", icon: "house", hue: "oklch(0.50 0.06 250)", suggest: "15%" },
  { name: "Đi lại", icon: "bus", hue: "oklch(0.52 0.08 175)", suggest: "7%" },
  { name: "Mua sắm", icon: "shopping-bag", hue: "var(--color-accent)", suggest: "10%" },
  { name: "Con cái", icon: "baby", hue: "oklch(0.55 0.09 300)", suggest: "12%" },
  { name: "Giáo dục", icon: "graduation-cap", hue: "oklch(0.52 0.08 200)", suggest: "6%" },
  { name: "Sức khoẻ", icon: "heart-pulse", hue: "oklch(0.52 0.09 20)", suggest: "5%" },
  { name: "Tiết kiệm", icon: "piggy-bank", hue: GREEN, suggest: "10%" },
];

export const PLANS = [
  { id: "balanced", name: "Cân bằng", note: "Phù hợp phần lớn gia đình. Chi tiêu vừa phải, vẫn tiết kiệm đều.", pcts: [28, 16, 9, 12, 6, 5, 9, 11, 4] },
  { id: "save", name: "Ưu tiên tiết kiệm", note: "Giảm mua sắm và giải trí, dồn vào tiết kiệm và dự phòng.", pcts: [25, 15, 5, 12, 6, 3, 8, 20, 6] },
  { id: "kids", name: "Ưu tiên con cái", note: "Dành nhiều hơn cho con và giáo dục, cắt bớt phần linh hoạt.", pcts: [26, 15, 6, 20, 12, 3, 8, 8, 2] },
] as const;

export const INCOME_QUICK_AMOUNTS = [20_000_000, 26_000_000, 32_000_000, 40_000_000];

export type Range = {
  id: "week" | "month" | "half";
  label: string;
  note: string;
  total: number;
  prev: number;
  chartTitle: string;
  labels: string[];
  values: number[];
  activeIdx: number;
};

export const RANGES: Range[] = [
  { id: "week", label: "Tuần này", note: "tuần này", total: 5_460_000, prev: 4_980_000, chartTitle: "Chi 7 ngày", labels: ["T2", "T3", "T4", "T5", "T6", "T7", "CN"], values: [620_000, 940_000, 430_000, 1_120_000, 780_000, 1_150_000, 420_000], activeIdx: 6 },
  { id: "month", label: "Tháng 9", note: "tháng này", total: 23_420_000, prev: 21_560_000, chartTitle: "Chi theo tuần", labels: ["T1", "T2", "T3", "T4", "T5"], values: [5_980_000, 6_240_000, 5_740_000, 5_460_000, 0], activeIdx: 3 },
  { id: "half", label: "6 tháng", note: "6 tháng", total: 128_400_000, prev: 121_900_000, chartTitle: "Chi theo tháng", labels: ["T4", "T5", "T6", "T7", "T8", "T9"], values: [19_800_000, 21_300_000, 20_600_000, 21_740_000, 21_560_000, 23_420_000], activeIdx: 5 },
];

export type Transaction = {
  id: string;
  jarId: string | null;
  note: string;
  day: string;
  time: string;
  person: string;
  amount: number;
  income?: boolean;
};

/** newest first — mirrors the example rows shown across the design's screens */
export const TRANSACTIONS: Transaction[] = [
  { id: "t1", jarId: "an-uong", note: "Cà phê", day: "Hôm nay · 12.09", time: "15:10", person: "Lan", amount: 62_000 },
  { id: "t2", jarId: "sinh-hoat", note: "Nước tháng 9", day: "Hôm nay · 12.09", time: "11:40", person: "Hoà", amount: 110_000 },
  { id: "t3", jarId: "giao-duc", note: "Vở cho Mi", day: "Hôm nay · 12.09", time: "09:05", person: "Lan", amount: 95_000 },
  { id: "t4", jarId: "an-uong", note: "Chợ sáng", day: "Hôm nay · 12.09", time: "07:20", person: "Hoà", amount: 185_000 },
  { id: "t5", jarId: "mua-sam", note: "Áo khoác", day: "Hôm qua · 11.09", time: "19:30", person: "Lan", amount: 620_000 },
  { id: "t6", jarId: "sinh-hoat", note: "Xăng", day: "Hôm qua · 11.09", time: "08:10", person: "Hoà", amount: 185_000 },
  { id: "t7", jarId: "con-cai", note: "Học phí Mi", day: "Thứ Tư · 10.09", time: "16:00", person: "Hoà", amount: 1_200_000 },
  { id: "t8", jarId: "an-uong", note: "Trà sữa", day: "Thứ Tư · 10.09", time: "14:20", person: "Lan", amount: 95_000 },
  { id: "t9", jarId: "an-uong", note: "Siêu thị", day: "Thứ Ba · 09.09", time: "18:40", person: "Lan", amount: 815_000 },
  { id: "t10", jarId: null, note: "Lương Hoà", day: "Thứ Ba · 09.09", time: "09:00", person: "Hoà", amount: 32_000_000, income: true },
];

export function transactionsForJar(jarId: string): Transaction[] {
  return TRANSACTIONS.filter((t) => t.jarId === jarId);
}

export function groupTransactionsByDay(transactions: Transaction[]) {
  const groups = new Map<string, Transaction[]>();
  for (const t of transactions) {
    const list = groups.get(t.day) ?? [];
    list.push(t);
    groups.set(t.day, list);
  }
  return Array.from(groups.entries()).map(([day, items]) => ({
    day,
    items,
    total: items.reduce((sum, t) => sum + (t.income ? 0 : t.amount), 0),
  }));
}

export const CHAT_SUGGESTIONS = [
  {
    icon: "wallet",
    label: "Còn được chi bao nhiêu?",
    question: "Từ giờ tới cuối tháng tôi còn được chi bao nhiêu?",
    answer: "Còn 8.580.000 VND cho 11 ngày, tức khoảng 780.000 mỗi ngày nếu chia đều.",
    showDaily: true,
  },
  {
    icon: "trending-up",
    label: "So với tháng trước",
    question: "Tháng này tôi chi nhiều hơn tháng trước không?",
    answer: "Nhiều hơn 1.860.000, chủ yếu do Mua sắm tăng 940.000 và Ăn uống tăng 300.000.",
    showDaily: false,
  },
  {
    icon: "triangle-alert",
    label: "Hũ nào sắp vượt?",
    question: "Hũ nào sắp vượt ngân sách?",
    answer: "Hai hũ cần chú ý. Mua sắm đã vượt 420.000. Ăn uống dùng 86% khi còn 11 ngày.",
    showDaily: false,
  },
  {
    icon: "piggy-bank",
    label: "Tiết kiệm có đủ chưa?",
    question: "Tiết kiệm tháng này có đủ mục tiêu chưa?",
    answer: "Đủ rồi. Hũ Tiết kiệm đã nhận 3.500.000, đúng bằng mục tiêu tháng.",
    showDaily: false,
  },
] as const;
