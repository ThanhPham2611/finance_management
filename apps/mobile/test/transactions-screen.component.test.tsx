import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { createMonthWindow } from "@hu/domain";
import TransactionsScreen from "@/app/(tabs)/transactions";

const mockPush = jest.fn();
const mockUseTransactions = jest.fn();
const refetch = jest.fn();
const queries: { transactions: unknown; jars: unknown } = { transactions: {}, jars: {} };
const state: { household: unknown } = { household: null };

jest.mock("expo-router", () => ({ router: { push: (...args: unknown[]) => mockPush(...args) } }));
jest.mock("@/features/finance/hooks", () => ({
  useTransactions: (ym?: string) => {
    mockUseTransactions(ym);
    return queries.transactions;
  },
  useJars: () => queries.jars,
  useHouseholdMembers: () => ({ data: state.household }),
}));

const month = createMonthWindow(undefined);
const tx = (id: string, jarId: string, jarName: string, amount: number, day: string, note: string | null = null, type = "expense") => ({
  id, jarId, jarName, jarIcon: "wallet", jarColor: "#174C3C", amount, note, transactionDate: `${month.ym}-${day}`, userId: "me", type,
});
const transactions = [
  tx("t2", "food", "Ăn uống", 45_000, "02", "Phở bò"),
  tx("t1", "rent", "Nhà ở", 2_000_000, "01", "Tiền nhà"),
  tx("t3", "food", "Ăn uống", 500_000, "01", "Nạp thêm", "deposit"),
];
const jar = (id: string, name: string, isShared = false) => ({ id, name, isShared, isSavings: false, color: "#174C3C" });
const ok = (data: unknown) => ({ data, isLoading: false, isRefetching: false, error: null, refetch });

beforeEach(() => {
  jest.clearAllMocks();
  queries.transactions = ok(transactions);
  queries.jars = ok([jar("food", "Ăn uống"), jar("rent", "Nhà ở", true)]);
});

describe("TransactionsScreen", () => {
  it("shows the current month, expense total and all rows", async () => {
    const view = await render(<TransactionsScreen />);
    expect(view.getByText(`Tháng ${month.month}, ${month.ym.slice(0, 4)}`)).toBeTruthy();
    expect(view.getByText("Đã chi tháng này")).toBeTruthy();
    expect(view.getByText("2.045.000 ₫")).toBeTruthy();
    expect(view.getByText("Phở bò")).toBeTruthy();
    expect(view.getByText("Tiền nhà")).toBeTruthy();
    // Một lần ở chip lọc hũ, một lần ở dòng giao dịch.
    expect(view.getAllByText("Nhà ở (gia đình)")).toHaveLength(2);
    expect(mockUseTransactions).toHaveBeenLastCalledWith(month.ym);
  });

  it("groups the rows into one titled card per day, and switches view with icon-only radios", async () => {
    const view = await render(<TransactionsScreen />);
    // Hai ngày có giao dịch (01 và 02) → hai thẻ ngày, mỗi thẻ một tiêu đề.
    expect(view.getAllByRole("header")).toHaveLength(2);

    expect(view.getByRole("radio", { name: "Danh sách" }).props.accessibilityState.selected).toBe(true);
    await fireEvent.press(view.getByRole("radio", { name: "Lịch" }));
    expect(view.getByRole("radio", { name: "Lịch" }).props.accessibilityState.selected).toBe(true);
    expect(view.getByRole("radio", { name: "Danh sách" }).props.accessibilityState.selected).toBe(false);
  });

  it("goes back a month, and cannot go past the current one", async () => {
    const view = await render(<TransactionsScreen />);
    expect(view.getByRole("button", { name: "Tháng sau" }).props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(view.getByRole("button", { name: "Tháng trước" }));
    expect(mockUseTransactions).toHaveBeenLastCalledWith(month.prev);
    expect(view.getByText("Đã chi tháng " + Number(month.prev.slice(5)))).toBeTruthy();
    expect(view.getByRole("button", { name: "Tháng sau" }).props.accessibilityState.disabled).toBeFalsy();
  });

  it("searches by note and clears the filter", async () => {
    const view = await render(<TransactionsScreen />);
    await fireEvent.changeText(view.getByLabelText("Tìm giao dịch"), "phở");
    expect(view.queryByText("Tiền nhà")).toBeNull();
    expect(view.getByText("Phở bò")).toBeTruthy();
    expect(view.getByText("1 / 3 giao dịch")).toBeTruthy();

    await fireEvent.press(view.getByRole("button", { name: "Xóa lọc" }));
    expect(view.getByText("Tiền nhà")).toBeTruthy();
    expect(view.getByText("3 giao dịch · TB 681.667 ₫/giao dịch")).toBeTruthy();
  });

  it("filters by type and by jar", async () => {
    const view = await render(<TransactionsScreen />);
    await fireEvent.press(view.getByRole("radio", { name: "Thu" }));
    expect(view.getByText("Nạp thêm")).toBeTruthy();
    expect(view.queryByText("Phở bò")).toBeNull();

    await fireEvent.press(view.getByRole("radio", { name: "Tất cả" }));
    await fireEvent.press(view.getByRole("radio", { name: "Nhà ở (gia đình)" }));
    expect(view.getByText("Tiền nhà")).toBeTruthy();
    expect(view.queryByText("Phở bò")).toBeNull();
  });

  it("narrows to family expenses from the scope card, only when a family jar exists", async () => {
    const view = await render(<TransactionsScreen />);
    await fireEvent.press(view.getByRole("button", { name: /^Gia đình:/ }));
    expect(view.getByText("Tiền nhà")).toBeTruthy();
    expect(view.queryByText("Phở bò")).toBeNull();

    queries.jars = ok([jar("food", "Ăn uống"), jar("rent", "Nhà ở")]);
    const personalOnly = await render(<TransactionsScreen />);
    expect(personalOnly.queryByRole("button", { name: /^Gia đình:/ })).toBeNull();
  });

  it("calendar mode lists the selected day and switches day on tap", async () => {
    const view = await render(<TransactionsScreen />);
    await fireEvent.press(view.getByRole("radio", { name: "Lịch" }));

    // Mặc định chọn ngày gần nhất có giao dịch (02).
    expect(view.getByLabelText("Giao dịch trong ngày")).toBeTruthy();
    expect(view.getByText("Phở bò")).toBeTruthy();
    expect(view.queryByText("Tiền nhà")).toBeNull();
    expect(view.getByRole("button", { name: /^Ngày 2, đã chi 45\.000 ₫/ }).props.accessibilityState.selected).toBe(true);

    await fireEvent.press(view.getByRole("button", { name: /^Ngày 1, đã chi 2\.000\.000 ₫/ }));
    expect(view.getByText("Tiền nhà")).toBeTruthy();
    expect(view.queryByText("Phở bò")).toBeNull();
  });

  it("names who spent on a family jar, once the household is known", async () => {
    state.household = { id: "h1", members: [{ userId: "me", name: "Bạn", nickname: null, isMe: true }, { userId: "wife", name: "Bình", nickname: "vợ", isMe: false }] };
    queries.transactions = ok([{ ...transactions[1], userId: "wife" }, transactions[0]]);
    const view = await render(<TransactionsScreen />);
    expect(view.getByText("Nhà ở (gia đình) · vợ")).toBeTruthy(); // hũ gia đình: có tên người chi
    expect(view.queryByText(/^Ăn uống · /)).toBeNull(); // hũ cá nhân: không ghi tên người chi
    state.household = null;
  });

  it("opens the edit screen with the month of the tapped row", async () => {
    const view = await render(<TransactionsScreen />);
    await fireEvent.press(view.getByText("Phở bò"));
    expect(mockPush).toHaveBeenCalledWith({ pathname: "/transactions/[id]", params: { id: "t2", ym: month.ym } });
  });

  it("shows an empty state for a month without transactions", async () => {
    queries.transactions = ok([]);
    const view = await render(<TransactionsScreen />);
    expect(view.getByText("Sổ tháng này còn trống")).toBeTruthy();
  });
});
