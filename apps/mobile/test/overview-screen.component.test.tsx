import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import OverviewScreen from "@/app/(tabs)/overview";

const mockPush = jest.fn();
const mockMarkSeen = jest.fn();
const mockResolve = jest.fn();
const mockAutoRollover = jest.fn();
const mockBar = jest.fn();
const mockLine = jest.fn();
const mockDonut = jest.fn();
const state: { jars: unknown; recent: unknown; since: unknown; pending: unknown; profile: unknown; params: Record<string, string>; resolving: { isPending: boolean; variables?: string; error: Error | null } } = {
  jars: {}, recent: {}, since: {}, pending: {}, profile: {}, params: {}, resolving: { isPending: false, error: null },
};

// Cố định "hôm nay" = 10/9/2026 (còn 21 ngày) để số liệu và dự báo không phụ thuộc đồng hồ máy.
jest.mock("@hu/domain", () => ({ ...jest.requireActual("@hu/domain"), vietnamNow: () => new Date(2026, 8, 10) }));
jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) }, useLocalSearchParams: () => state.params }));
jest.mock("@/features/finance/hooks", () => ({
  useAutoRollover: () => mockAutoRollover(),
  useJars: () => state.jars,
  useRecentTransactions: () => state.recent,
  useTransactionsSince: () => state.since,
  usePendingLeftovers: () => state.pending,
  useProfile: () => state.profile,
  useMarkTourSeen: () => ({ mutate: (...args: unknown[]) => mockMarkSeen(...args) }),
  useResolveLeftovers: () => ({ mutate: (...args: unknown[]) => mockResolve(...args), ...state.resolving }),
}));
jest.mock("react-native-chart-kit/v2", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    BarChart: (props: unknown) => (mockBar(props), <View />),
    LineChart: (props: unknown) => (mockLine(props), <View />),
    DonutChart: (props: unknown) => (mockDonut(props), <View />),
  };
});

const jar = (over: Record<string, unknown> = {}) => ({ id: "food", name: "Ăn uống", icon: "utensils", color: "#AB5637", monthlyBudget: 2_000_000, spent: 500_000, isShared: false, isSavings: false, alertAt80: true, rollover: false, ...over });
const ok = (data: unknown) => ({ data, isLoading: false, isRefetching: false, error: null, refetch: jest.fn() });
const tx = (id: string, amount: number, over: Record<string, unknown> = {}) => ({ id, jarId: "food", jarName: "Ăn uống", jarIcon: "utensils", jarColor: "#AB5637", amount, note: null, transactionDate: "2026-09-09", userId: "me", type: "expense", ...over });
const leftover = { jarId: "a", jarName: "Giải trí", jarIcon: "wallet", jarColor: "#9A5B13", budget: 1_000_000, spent: 400_000, leftover: 600_000 };
const layout = { nativeEvent: { layout: { width: 300, height: 200 } } };

beforeEach(() => {
  jest.clearAllMocks();
  state.jars = ok([jar(), jar({ id: "go", name: "Đi lại", monthlyBudget: 1_000_000, spent: 100_000 }), jar({ id: "save", name: "Quỹ dư", isSavings: true, monthlyBudget: 900_000, spent: 0 })]);
  state.recent = ok([tx("t1", 45_000, { note: "Phở" }), tx("t2", 500_000, { type: "deposit", transactionDate: "2026-08-30" })]);
  state.since = ok([tx("t1", 45_000)]);
  state.pending = ok([]);
  state.profile = ok({ fullName: "An", hasSeenTour: true });
  state.params = {};
  state.resolving = { isPending: false, error: null };
});

describe("OverviewScreen", () => {
  it("summarises what can still be spent, leaving savings jars out", async () => {
    const view = await render(<OverviewScreen />);
    expect(view.getByText("Tổng quan tháng này")).toBeTruthy();
    expect(view.getByText("Ngân sách 3.000.000 ₫ chia vào 2 hũ · còn 21 ngày")).toBeTruthy();
    expect(view.getByText(/^2\.400\.000/)).toBeTruthy(); // 3tr - (500k + 100k) → số lớn ở hero
    expect(view.getByText("Đang dành cho tương lai · 1 hũ")).toBeTruthy();
    expect(view.getByText("Quỹ dư (tiết kiệm)")).toBeTruthy();
    expect(view.getByText("TB 6.429 ₫/ngày")).toBeTruthy(); // 45k / 7
    expect(mockAutoRollover).toHaveBeenCalled();
  });

  it("shows no alert when jars are on track, and a combined alert when they are not", async () => {
    const quiet = await render(<OverviewScreen />);
    expect(quiet.queryByRole("alert")).toBeNull();

    state.jars = ok([jar({ monthlyBudget: 500_000, spent: 650_000 }), jar({ id: "b", name: "Đi lại", monthlyBudget: 1_000_000, spent: 850_000 })]);
    const loud = await render(<OverviewScreen />);
    expect(loud.getByText("Ăn uống vượt 150.000 ₫ · Đi lại đã dùng 85%")).toBeTruthy();
  });

  it("asks what to do with last month's leftover and forwards the choice", async () => {
    state.pending = ok([leftover]);
    const view = await render(<OverviewScreen />);
    expect(view.getByText(/Tháng 8, 2026 có 1 hũ dư, tổng 600.000 ₫/)).toBeTruthy();

    await fireEvent.press(view.getByText("Cộng vào Quỹ dư"));
    expect(mockResolve).toHaveBeenLastCalledWith("confirm");
    await fireEvent.press(view.getByText("Bỏ qua"));
    expect(mockResolve).toHaveBeenLastCalledWith("decline");
  });

  it("locks the banner buttons and shows progress while resolving, and shows a failure", async () => {
    state.pending = ok([leftover]);
    state.resolving = { isPending: true, variables: "confirm", error: new Error("Mất kết nối") };
    const view = await render(<OverviewScreen />);
    expect(view.getByText("Đang cộng…")).toBeTruthy();
    expect(view.getByText("Mất kết nối")).toBeTruthy();
    expect(view.getByRole("button", { name: "Đang cộng…" }).props.accessibilityState.disabled).toBe(true);
  });

  it("hides the leftover banner when nothing is pending", async () => {
    const view = await render(<OverviewScreen />);
    expect(view.queryByText("Cộng vào Quỹ dư")).toBeNull();
  });

  it("switches the budget split to a donut and the week to a line chart", async () => {
    const view = await render(<OverviewScreen />);
    await fireEvent.press(view.getByRole("radio", { name: "Dạng donut" }));
    await fireEvent(view.getByTestId("budget-donut-chart"), "layout", layout);
    expect(mockDonut).toHaveBeenCalledWith(expect.objectContaining({ valueKey: "value", data: expect.arrayContaining([expect.objectContaining({ name: "Ăn uống", value: 2_000_000 })]) }));
    expect(view.getByText("67%")).toBeTruthy(); // 2tr / 3tr

    await fireEvent(view.getByTestId("week-trend-chart"), "layout", layout);
    expect(mockBar).toHaveBeenCalledTimes(1);
    expect(mockBar.mock.calls[0][0].data).toHaveLength(7);
    await fireEvent.press(view.getByRole("radio", { name: "Dạng đường" }));
    expect(mockLine).toHaveBeenCalled();
  });

  it("opens a jar and a recent transaction (with its own month)", async () => {
    const view = await render(<OverviewScreen />);
    await fireEvent.press(view.getByText("Đi lại"));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/jars/[id]", params: { id: "go" } });
    await fireEvent.press(view.getByText("Phở"));
    expect(mockPush).toHaveBeenLastCalledWith({ pathname: "/transactions/[id]", params: { id: "t1", ym: "2026-09" } });
  });

  it("invites the user to create the first jar when there are none", async () => {
    state.jars = ok([]);
    const view = await render(<OverviewScreen />);
    expect(view.getByText("Bắt đầu với một chiếc hũ")).toBeTruthy();
  });

  it("surfaces a load error with a retry", async () => {
    state.recent = { ...ok(undefined), error: new Error("Không tải được") };
    const view = await render(<OverviewScreen />);
    expect(view.getByText("Không tải được")).toBeTruthy();
    expect(view.getByText("Thử lại")).toBeTruthy();
  });

  describe("product tour", () => {
    it("does not open for someone who has seen it", async () => {
      const view = await render(<OverviewScreen />);
      expect(view.queryByText("Chào mừng đến với Hũ")).toBeNull();
    });

    it("opens the first time, walks the full steps, and records that it was seen once", async () => {
      state.profile = ok({ fullName: "An", hasSeenTour: false });
      const view = await render(<OverviewScreen />);
      expect(view.getByText("Bước 1/6")).toBeTruthy();
      expect(view.getByText("Chào mừng đến với Hũ")).toBeTruthy();
      await fireEvent.press(view.getByText("Tiếp"));
      expect(view.getByText("Ghi giao dịch nhanh")).toBeTruthy();
      expect(mockMarkSeen).not.toHaveBeenCalled(); // chưa kết thúc

      await fireEvent.press(view.getByText("Bỏ qua"));
      expect(mockMarkSeen).toHaveBeenCalledTimes(1);
      expect(view.queryByText("Ghi giao dịch nhanh")).toBeNull();
    });

    it("only teaches creating the first jar when there are no jars yet", async () => {
      state.profile = ok({ fullName: "An", hasSeenTour: false });
      state.jars = ok([]);
      const view = await render(<OverviewScreen />);
      expect(view.getByText("Bước 1/3")).toBeTruthy();
    });

    it("can be replayed from the More tab without marking anything as seen, and again with a new code", async () => {
      state.params = { tour: "111" };
      const view = await render(<OverviewScreen />);
      expect(view.getByText("Chào mừng đến với Hũ")).toBeTruthy();
      await fireEvent.press(view.getByText("Bỏ qua"));
      expect(view.queryByText("Chào mừng đến với Hũ")).toBeNull();
      expect(mockMarkSeen).not.toHaveBeenCalled();

      state.params = { tour: "222" };
      await view.rerender(<OverviewScreen />);
      expect(view.getByText("Chào mừng đến với Hũ")).toBeTruthy();
    });

    it("does not nag when the profile could not be read", async () => {
      state.profile = { ...ok(undefined), error: new Error("lỗi") };
      const view = await render(<OverviewScreen />);
      expect(view.queryByText("Chào mừng đến với Hũ")).toBeNull();
    });
  });
});
