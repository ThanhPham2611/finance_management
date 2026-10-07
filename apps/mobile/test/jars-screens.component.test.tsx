import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import JarsScreen from "@/app/(tabs)/jars";
import JarDetailScreen from "@/app/jars/[id]";

const mockPush = jest.fn();
const queries: { jars: unknown; history: unknown; id: string } = { jars: {}, history: {}, id: "food" };
const state: { household: unknown } = { household: null };

// Cố định "hôm nay" = 10/9/2026 để số ngày còn lại và dự báo không phụ thuộc đồng hồ máy.
jest.mock("@hu/domain", () => ({ ...jest.requireActual("@hu/domain"), vietnamNow: () => new Date(2026, 8, 10) }));
jest.mock("expo-router", () => ({
  router: { push: (...args: unknown[]) => mockPush(...args), replace: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: queries.id }),
}));
jest.mock("@/features/finance/hooks", () => ({
  useJars: () => queries.jars,
  useJarTransactions: () => queries.history,
  useHouseholdMembers: () => ({ data: state.household }),
  useDeactivateJar: () => ({ mutate: jest.fn(), isPending: false, error: null }),
}));

const jar = (over: Record<string, unknown> = {}) => ({ id: "food", name: "Ăn uống", icon: "utensils", color: "#AB5637", monthlyBudget: 1_000_000, spent: 250_000, isShared: false, isSavings: false, alertAt80: true, rollover: false, ...over });
const ok = (data: unknown) => ({ data, isLoading: false, isRefetching: false, error: null, refetch: jest.fn() });
const tx = (id: string, amount: number, over: Record<string, unknown> = {}) => ({ id, jarId: "food", amount, note: null, transactionDate: "2026-09-05", userId: "me", type: "expense", ...over });

beforeEach(() => {
  jest.clearAllMocks();
  queries.id = "food";
  queries.jars = ok([jar()]);
  queries.history = ok([]);
});

describe("JarsScreen", () => {
  it("sums only spendable jars, counts those needing attention and marks family/savings jars", async () => {
    queries.jars = ok([
      jar({ id: "a", name: "Ăn uống", monthlyBudget: 3_000_000, spent: 3_500_000 }),
      jar({ id: "b", name: "Đi lại", monthlyBudget: 1_000_000, spent: 100_000 }),
      jar({ id: "h", name: "Nhà ở", monthlyBudget: 2_000_000, spent: 0, isShared: true }),
      jar({ id: "s", name: "Quỹ dư", monthlyBudget: 9_000_000, spent: 0, isSavings: true }),
    ]);
    const view = await render(<JarsScreen />);
    expect(view.getByText("6.000.000 ₫")).toBeTruthy(); // 3tr + 1tr + 2tr, không gồm hũ tiết kiệm
    expect(view.getByText("4 hũ · Cần chú ý 1")).toBeTruthy();
    expect(view.getByText("Đã vượt 500.000 ₫")).toBeTruthy();
    expect(view.getByText("GIA ĐÌNH")).toBeTruthy();
    expect(view.getByText("TIẾT KIỆM")).toBeTruthy();
    expect(view.getByText("Đã tiết kiệm 9.000.000 ₫")).toBeTruthy();
  });

  it("opens a jar and offers creation when there are none", async () => {
    const view = await render(<JarsScreen />);
    await fireEvent.press(view.getByText("Ăn uống"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/jars/[id]", params: { id: "food" } });

    queries.jars = ok([]);
    const empty = await render(<JarsScreen />);
    expect(empty.getByText("Chưa có hũ nào")).toBeTruthy();
  });
});

describe("JarDetailScreen", () => {
  it("shows what is left per day, the averages and the jar's own transactions", async () => {
    queries.history = ok([tx("t1", 50_000, { note: "Phở" }), tx("t2", 200_000, { type: "deposit", transactionDate: "2026-09-02" })]);
    const view = await render(<JarDetailScreen />);
    expect(view.getByText("CÒN ĐƯỢC CHI")).toBeTruthy();
    expect(view.getByText(/Khoảng 35\.714 ₫\/ngày trong 21 ngày còn lại/)).toBeTruthy(); // 750k / 21
    expect(view.getByText("Đã chi 250.000 ₫ · 25%")).toBeTruthy();
    expect(view.getByText("25.000 ₫")).toBeTruthy(); // TB/ngày: 250k / 10
    expect(view.getByText("Phở")).toBeTruthy();
    expect(view.getByText("+200.000 ₫")).toBeTruthy();
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("warns when the jar is over budget and when the pace will exceed it", async () => {
    queries.jars = ok([jar({ spent: 1_200_000 })]);
    const over = await render(<JarDetailScreen />);
    expect(over.getByText("Đã vượt ngân sách 200.000 ₫.")).toBeTruthy();

    queries.jars = ok([jar({ spent: 340_000 })]);
    const pace = await render(<JarDetailScreen />);
    expect(pace.getByText(/Với tốc độ chi hiện tại, hũ này có thể vượt ngân sách khoảng/)).toBeTruthy();
  });

  it("savings jars show what was saved and never warn", async () => {
    queries.jars = ok([jar({ isSavings: true, spent: -500_000, monthlyBudget: 1_000_000 })]);
    const view = await render(<JarDetailScreen />);
    expect(view.getByText("ĐÃ TIẾT KIỆM ĐƯỢC")).toBeTruthy();
    expect(view.getByText("Tự động cộng dồn qua các tháng, không reset")).toBeTruthy();
    expect(view.getByText("Đã rút 0 ₫ · 0%")).toBeTruthy();
    expect(view.queryByRole("alert")).toBeNull();
  });

  it("jumps to the entry form with the jar preselected, for expense and deposit", async () => {
    const view = await render(<JarDetailScreen />);
    await fireEvent.press(view.getByText("Nhập chi"));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/transactions/new", params: { jar: "food" } });
    await fireEvent.press(view.getByText("Nhập thu"));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/transactions/new", params: { jar: "food", type: "deposit" } });
  });

  it("opens a transaction for editing with its own month", async () => {
    queries.history = ok([tx("t1", 50_000, { note: "Phở", transactionDate: "2026-07-20" })]);
    const view = await render(<JarDetailScreen />);
    await fireEvent.press(view.getByText("Phở"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/transactions/[id]", params: { id: "t1", ym: "2026-07" } });
  });

  it("names who spent on a family jar", async () => {
    state.household = { id: "h1", members: [{ userId: "me", name: "Bạn", nickname: null, isMe: true }, { userId: "wife", name: "Bình", nickname: "vợ", isMe: false }] };
    queries.jars = ok([jar({ isShared: true })]);
    queries.history = ok([tx("t1", 50_000, { note: "Điện", userId: "wife", transactionDate: "2026-09-09" })]);
    const view = await render(<JarDetailScreen />);
    expect(view.getByText(/ · 09\.09 · vợ$/)).toBeTruthy();
    expect(view.getByText("QUỸ CHUNG")).toBeTruthy();
    state.household = null;
  });

  it("explains an unknown jar instead of crashing", async () => {
    queries.id = "missing";
    const view = await render(<JarDetailScreen />);
    expect(view.getByText("Không tìm thấy hũ")).toBeTruthy();
  });
});
