import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import NewTransactionScreen from "@/app/transactions/new";

const mockReplace = jest.fn();
const mockMutate = jest.fn();
const mockReset = jest.fn();
const state: { params: Record<string, string>; jars: ReturnType<typeof makeJars> } = { params: {}, jars: [] as never };

const makeJars = (foodSpent = 400_000) => [
  { id: "food", name: "Ăn uống", color: "#174C3C", monthlyBudget: 1_000_000, spent: foodSpent, isShared: false, isSavings: false, alertAt80: true, rollover: false, icon: "wallet" },
  { id: "rent", name: "Nhà ở", color: "#9A5B13", monthlyBudget: 2_000_000, spent: 0, isShared: true, isSavings: false, alertAt80: true, rollover: false, icon: "home" },
  { id: "save", name: "Quỹ dư", color: "#2E6B57", monthlyBudget: 500_000, spent: 0, isShared: false, isSavings: true, alertAt80: false, rollover: true, icon: "savings" },
];

jest.mock("expo-router", () => ({
  router: { replace: (...args: unknown[]) => mockReplace(...args) },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => state.params,
}));
jest.mock("@/features/finance/hooks", () => ({
  useJars: () => ({ data: state.jars, isLoading: false, error: null, refetch: jest.fn() }),
  useCreateTransaction: () => ({ mutate: mockMutate, reset: mockReset, isPending: false, error: null }),
}));

const radio = (view: { getByRole: (...a: never[]) => unknown }, name: RegExp | string) => (view.getByRole as (r: string, o: object) => { props: { accessibilityState: { selected: boolean } } })("radio", { name });

beforeEach(() => {
  jest.clearAllMocks();
  state.params = {};
  state.jars = makeJars();
});

describe("NewTransactionScreen", () => {
  it("preselects the jar and type from the route", async () => {
    state.params = { jar: "rent", type: "deposit" };
    const view = await render(<NewTransactionScreen />);
    expect(radio(view, /^Nhà ở/).props.accessibilityState.selected).toBe(true);
    expect(radio(view, "Nạp tiền").props.accessibilityState.selected).toBe(true);
    expect(view.getByText("Thu vào hũ nào")).toBeTruthy();
  });

  it("shows what is left on every jar and a live hint under the amount", async () => {
    const view = await render(<NewTransactionScreen />);
    expect(view.getByText("còn 600.000 ₫")).toBeTruthy();
    expect(view.getByText("Nhập số tiền")).toBeTruthy();

    await fireEvent.changeText(view.getByLabelText("Số tiền"), "100000");
    expect(view.getByText("Sau khoản này Ăn uống còn 500.000 ₫")).toBeTruthy();

    await fireEvent.changeText(view.getByLabelText("Số tiền"), "700000");
    expect(view.getByText("Khoản này làm Ăn uống vượt 100.000 ₫")).toBeTruthy();
  });

  it("asks twice before withdrawing from a savings jar, and again after any change", async () => {
    const view = await render(<NewTransactionScreen />);
    await fireEvent.press(radio(view, /^Quỹ dư/) as never);
    await fireEvent.changeText(view.getByLabelText("Số tiền"), "50000");

    await fireEvent.press(view.getByText("Lưu giao dịch"));
    expect(mockMutate).not.toHaveBeenCalled();
    expect(view.getByText(/Bạn sắp rút tiền từ hũ tiết kiệm “Quỹ dư”/)).toBeTruthy();

    await fireEvent.changeText(view.getByLabelText("Số tiền"), "60000");
    expect(view.queryByText(/Bạn sắp rút tiền/)).toBeNull();

    await fireEvent.press(view.getByText("Lưu giao dịch"));
    await fireEvent.press(view.getByText("Xác nhận rút 60.000 ₫ từ hũ tiết kiệm"));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toEqual({ jarId: "save", amount: 60_000, note: "", type: "expense" });
  });

  it("depositing into a savings jar needs no confirmation", async () => {
    const view = await render(<NewTransactionScreen />);
    await fireEvent.press(view.getByRole("radio", { name: "Nạp tiền" }));
    await fireEvent.press(radio(view, /^Quỹ dư/) as never);
    await fireEvent.changeText(view.getByLabelText("Số tiền"), "50000");
    await fireEvent.press(view.getByText("Lưu giao dịch"));
    expect(mockMutate).toHaveBeenCalledTimes(1);
  });

  it("rejects an empty amount without calling the server", async () => {
    const view = await render(<NewTransactionScreen />);
    await fireEvent.press(view.getByText("Lưu giao dịch"));
    expect(view.getByText("Số tiền phải lớn hơn 0.")).toBeTruthy();
    expect(mockMutate).not.toHaveBeenCalled();
  });

  it("shows the result using the jar as it was BEFORE saving, even after the jar list refreshes", async () => {
    // Mô phỏng TanStack Query: ngay khi lưu xong, danh sách hũ được tải lại và đã gồm khoản vừa lưu.
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => {
      state.jars = makeJars(500_000);
      options.onSuccess();
    });
    const view = await render(<NewTransactionScreen />);
    await fireEvent.changeText(view.getByLabelText("Số tiền"), "100000");
    await fireEvent.changeText(view.getByLabelText("Ghi chú"), " Phở ");
    await fireEvent.press(view.getByText("Lưu giao dịch"));

    expect(mockMutate.mock.calls[0][0]).toEqual({ jarId: "food", amount: 100_000, note: "Phở", type: "expense" });
    expect(view.getByText("Đã lưu 100.000 ₫ vào Ăn uống")).toBeTruthy();
    expect(view.getByText("Đã chi 500.000 ₫ / 1.000.000 ₫")).toBeTruthy();
    expect(view.getByText("500.000 ₫")).toBeTruthy();

    await fireEvent.press(view.getByText("Xem hũ Ăn uống"));
    expect(mockReplace).toHaveBeenCalledWith({ pathname: "/jars/[id]", params: { id: "food" } });
  });

  it("'Nhập tiếp' returns to an empty form on the same jar and type", async () => {
    mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => options.onSuccess());
    state.params = { jar: "rent" };
    const view = await render(<NewTransactionScreen />);
    await fireEvent.press(view.getByRole("radio", { name: "Nạp tiền" }));
    await fireEvent.changeText(view.getByLabelText("Số tiền"), "100000");
    await fireEvent.press(view.getByText("Lưu giao dịch"));
    expect(view.getByText("Đã thu 100.000 ₫ vào Nhà ở")).toBeTruthy();

    await fireEvent.press(view.getByText("Nhập tiếp"));
    expect(view.getByLabelText("Số tiền").props.value).toBe("");
    expect(radio(view, /^Nhà ở/).props.accessibilityState.selected).toBe(true);
    expect(radio(view, "Nạp tiền").props.accessibilityState.selected).toBe(true);
    expect(mockReset).toHaveBeenCalled();
  });
});
