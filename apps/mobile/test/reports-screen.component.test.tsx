import React from "react";
import { act, fireEvent, render } from "@testing-library/react-native";
import { Share } from "react-native";
import type { BarChart } from "react-native-chart-kit/v2";
import { toYMD, vietnamNow } from "@hu/domain";
import ReportsScreen from "@/app/(tabs)/reports";

const mockPush = jest.fn();
const mockBarChart = jest.fn<void, [React.ComponentProps<typeof BarChart>]>();
const refetchTransactions = jest.fn();
const refetchJars = jest.fn();
const queries: { transactions: unknown; jars: unknown } = { transactions: {}, jars: {} };

jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock("@/features/finance/hooks", () => ({
  useReportTransactions: () => queries.transactions,
  useJars: () => queries.jars,
}));
jest.mock("react-native-chart-kit/v2", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  return {
    BarChart: (props: React.ComponentProps<typeof BarChart>) => {
      mockBarChart(props);
      return <View />;
    },
    DonutChart: () => <View />,
  };
});

const today = toYMD(vietnamNow());
const tx = (id: string, jarId: string, jarName: string, amount: number) => ({
  id, jarId, jarName, jarColor: "#174C3C", type: "expense", amount, note: "", transactionDate: today,
});
const transactions = [tx("1", "a", "Ăn uống", 300000), tx("2", "old", "Hũ cũ", 100000)];
const jars = [{ id: "a", name: "Ăn uống", color: "#174C3C", isSavings: false }];

const ok = (data: unknown, refetch: jest.Mock) => ({ data, isLoading: false, isRefetching: false, error: null, refetch });

beforeEach(() => {
  jest.clearAllMocks();
  queries.transactions = ok(transactions, refetchTransactions);
  queries.jars = ok(jars, refetchJars);
});

describe("ReportsScreen", () => {
  it("shows the month by default and switches range", async () => {
    const view = await render(<ReportsScreen />);
    expect(view.getByText("Báo cáo")).toBeTruthy();
    expect(view.getByText("Theo dõi nhịp chi tiêu theo thời gian và từng hũ.")).toBeTruthy();
    expect(view.getByRole("radio", { name: "Tháng này" }).props.accessibilityState.selected).toBe(true);
    expect(view.getByText("Đã chi tháng này")).toBeTruthy();

    await fireEvent.press(view.getByRole("radio", { name: "Tuần này" }));
    expect(view.getByText("Đã chi tuần này")).toBeTruthy();

    await fireEvent.press(view.getByRole("radio", { name: "6 tháng" }));
    await fireEvent(view.getByTestId("report-bar-chart"), "layout", { nativeEvent: { layout: { width: 300, height: 200 } } });
    expect(mockBarChart.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({ data: expect.any(Array) }));
  });

  it("groups the charts into titled cards and shows the change against the previous period as a chip", async () => {
    const view = await render(<ReportsScreen />);
    expect(view.getByRole("header", { name: "Chi tiêu theo thời gian" })).toBeTruthy();
    expect(view.getByRole("header", { name: "Tỷ trọng theo hũ" })).toBeTruthy();
    expect(view.getByRole("header", { name: "Giao dịch gần đây" })).toBeTruthy();
    // Chi tháng này 400k, tháng trước không có → tăng đúng bằng tổng.
    expect(view.getByText("Tăng 400.000 ₫ so với kỳ trước")).toBeTruthy();
  });

  it("opens active jars and leaves inactive jars non-interactive", async () => {
    const view = await render(<ReportsScreen />);
    // Chỉ xét các dòng tỷ trọng theo hũ (nhãn có "Mở hũ"); danh sách giao dịch gần đây cũng có nút nhưng là mục khác.
    await fireEvent.press(view.getByRole("button", { name: /Ăn uống.*Mở hũ/ }));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/jars/[id]", params: { id: "a" } });
    expect(view.queryByRole("button", { name: /Hũ cũ.*Mở hũ/ })).toBeNull();
    expect(view.getAllByText("Hũ cũ").length).toBeGreaterThan(0);
  });

  it("shows loading while either query loads", async () => {
    queries.jars = { ...ok(undefined, refetchJars), isLoading: true };
    const view = await render(<ReportsScreen />);
    expect(view.getByText("Đang tổng hợp báo cáo…")).toBeTruthy();
  });

  it("retries both queries on error and keeps the selected range", async () => {
    const view = await render(<ReportsScreen />);
    await fireEvent.press(view.getByRole("radio", { name: "Tuần này" }));
    queries.transactions = { ...ok(undefined, refetchTransactions), error: new Error("Mất kết nối") };
    await view.rerender(<ReportsScreen />);
    expect(view.getByText("Mất kết nối")).toBeTruthy();
    await fireEvent.press(view.getByRole("button", { name: "Thử lại" }));
    expect(refetchTransactions).toHaveBeenCalledTimes(1);
    expect(refetchJars).toHaveBeenCalledTimes(1);

    queries.transactions = ok(transactions, refetchTransactions);
    await view.rerender(<ReportsScreen />);
    expect(view.getByRole("radio", { name: "Tuần này" }).props.accessibilityState.selected).toBe(true);
  });

  it("refreshes both queries without changing range", async () => {
    const view = await render(<ReportsScreen />);
    await fireEvent.press(view.getByRole("radio", { name: "6 tháng" }));
    await act(async () => view.getByTestId("reports-screen").props.refreshControl.props.onRefresh());
    expect(refetchTransactions).toHaveBeenCalledTimes(1);
    expect(refetchJars).toHaveBeenCalledTimes(1);
    expect(view.getByRole("radio", { name: "6 tháng" }).props.accessibilityState.selected).toBe(true);
  });

  it("shows an empty state when the range has no spending and offers to record one", async () => {
    queries.transactions = ok([], refetchTransactions);
    const view = await render(<ReportsScreen />);
    expect(view.getByText("Chưa có khoản chi trong kỳ này")).toBeTruthy();
    expect(view.getByRole("radio", { name: "Tuần này" })).toBeTruthy();
    await fireEvent.press(view.getByRole("button", { name: "Ghi giao dịch" }));
    expect(mockPush).toHaveBeenCalledWith("/transactions/new");
  });

  describe("scope, export and recent transactions", () => {
    const family = { id: "fam", name: "Nhà chung", color: "#9A5B13", isSavings: false, isShared: true };
    const withFamily = () => {
      queries.transactions = ok([...transactions, tx("3", "fam", "Nhà chung", 700000)], refetchTransactions);
      queries.jars = ok([...jars, family], refetchJars);
    };

    it("offers a scope switch only when there are family jars, and narrows the report to it", async () => {
      const single = await render(<ReportsScreen />);
      expect(single.queryByRole("radio", { name: "Gia đình" })).toBeNull();

      withFamily();
      const view = await render(<ReportsScreen />);
      expect(view.getByText("1.100.000 ₫")).toBeTruthy(); // tất cả: 300k + 100k + 700k
      await fireEvent.press(view.getByRole("radio", { name: "Gia đình" }));
      expect(view.getByText("700.000 ₫")).toBeTruthy();
      await fireEvent.press(view.getByRole("radio", { name: "Cá nhân" }));
      expect(view.getByText("400.000 ₫")).toBeTruthy();
    });

    it("shows each jar's transaction count and change against the previous period", async () => {
      const lastMonth = toYMD(new Date(vietnamNow().getFullYear(), vietnamNow().getMonth() - 1, 15));
      queries.transactions = ok([
        ...transactions, // nay: Ăn uống 300k, Hũ cũ 100k
        { ...tx("9", "a", "Ăn uống", 100000), transactionDate: lastMonth }, // kỳ trước: Ăn uống 100k → tăng 200k
        { ...tx("10", "old", "Hũ cũ", 100000), transactionDate: lastMonth }, // kỳ trước: Hũ cũ 100k → không đổi
      ], refetchTransactions);
      const view = await render(<ReportsScreen />);
      expect(view.getByText("+200.000 ₫")).toBeTruthy();
      expect(view.getByText("không đổi")).toBeTruthy();
      expect(view.getAllByText("1 giao dịch")).toHaveLength(2);
    });

    it("exports the in-scope expenses as CSV through the share sheet, and hides the button when empty", async () => {
      const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
      const view = await render(<ReportsScreen />);
      await fireEvent.press(view.getByText("Xuất CSV"));
      const { message, title } = share.mock.calls[0][0] as { message: string; title: string };
      expect(title).toMatch(/^giao-dich-\d{4}-\d{2}-\d{2}\.csv$/);
      expect(message.startsWith("\uFEFFNgày,Hũ,Ghi chú,Số tiền (VND)\n")).toBe(true);
      expect(message.split("\n")).toHaveLength(3); // tiêu đề + 2 khoản chi

      queries.transactions = ok([], refetchTransactions);
      const empty = await render(<ReportsScreen />);
      expect(empty.queryByText("Xuất CSV")).toBeNull();
    });

    it("leaves deposits out of the report, the export and the recent list", async () => {
      queries.transactions = ok([...transactions, { ...tx("5", "a", "Ăn uống", 999000), type: "deposit" }], refetchTransactions);
      const share = jest.spyOn(Share, "share").mockResolvedValue({ action: "sharedAction" });
      const view = await render(<ReportsScreen />);
      expect(view.getByText("400.000 ₫")).toBeTruthy();
      await fireEvent.press(view.getByText("Xuất CSV"));
      expect((share.mock.calls[0][0] as { message: string }).message).not.toContain("999000");
    });

    it("lists the 5 most recent expenses and opens one with its own month", async () => {
      queries.transactions = ok(Array.from({ length: 7 }, (_, i) => ({ ...tx(`r${i}`, "a", "Ăn uống", 1000 + i), note: `Khoản ${i}` })), refetchTransactions);
      const view = await render(<ReportsScreen />);
      expect(view.getByText("Giao dịch gần đây")).toBeTruthy();
      expect(view.getByText("Khoản 4")).toBeTruthy();
      expect(view.queryByText("Khoản 5")).toBeNull();
      await fireEvent.press(view.getByText("Khoản 0"));
      expect(mockPush).toHaveBeenCalledWith({ pathname: "/transactions/[id]", params: { id: "r0", ym: today.slice(0, 7) } });
    });
  });
});
