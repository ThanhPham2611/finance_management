import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import EditTransactionScreen from "@/app/transactions/[id]";

const mockUseTransactions = jest.fn();
const mockUpdate = jest.fn();
const mockBack = jest.fn();
const state: { transactions: unknown[]; userId: string } = { transactions: [], userId: "me" };

jest.mock("expo-router", () => ({
  router: { back: () => mockBack(), replace: jest.fn() },
  Stack: { Screen: () => null },
  useLocalSearchParams: () => ({ id: "t1", ym: "2026-08" }),
}));
jest.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ session: { user: { id: state.userId } } }) }));
jest.mock("@/features/finance/hooks", () => ({
  useJars: () => ({ data: [{ id: "food", name: "Ăn uống", color: "#174C3C", isSavings: false, isShared: false }], isLoading: false, error: null }),
  useTransactions: (ym?: string) => {
    mockUseTransactions(ym);
    return { data: state.transactions, isLoading: false, error: null };
  },
  useUpdateTransaction: () => ({ mutate: mockUpdate, isPending: false, error: null }),
  useDeleteTransaction: () => ({ mutate: jest.fn(), isPending: false, error: null }),
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const Picker = (props: { value: Date; onChange(event: unknown, date?: Date): void }) => <View testID="date-picker" accessibilityLabel="Ngày" {...({ value: props.value, onChange: props.onChange } as object)} />;
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

const row = (userId: string) => ({ id: "t1", jarId: "food", amount: 45_000, note: "Phở", transactionDate: "2026-08-14", userId, type: "expense" });

beforeEach(() => {
  jest.clearAllMocks();
  state.transactions = [row("me")];
  state.userId = "me";
});

describe("EditTransactionScreen", () => {
  it("loads the month passed in the route, so older transactions can be edited", async () => {
    await render(<EditTransactionScreen />);
    expect(mockUseTransactions).toHaveBeenCalledWith("2026-08");
  });

  it("saves the date picked by the user", async () => {
    const view = await render(<EditTransactionScreen />);
    const picker = view.getByTestId("date-picker");
    expect(picker.props.value).toEqual(new Date(2026, 7, 14));

    await fireEvent(picker, "change", {}, new Date(2026, 7, 20));
    await fireEvent.press(view.getByText("Lưu thay đổi"));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ id: "t1", transactionDate: "2026-08-20", amount: 45_000 }), expect.anything());
  });

  it("keeps the original date when the user does not touch it", async () => {
    const view = await render(<EditTransactionScreen />);
    await fireEvent.press(view.getByText("Lưu thay đổi"));
    expect(mockUpdate).toHaveBeenCalledWith(expect.objectContaining({ transactionDate: "2026-08-14" }), expect.anything());
  });

  it("offers delete only for the user's own transactions", async () => {
    const own = await render(<EditTransactionScreen />);
    expect(own.getByText("Xóa giao dịch")).toBeTruthy();

    state.transactions = [row("someone-else")];
    const other = await render(<EditTransactionScreen />);
    expect(other.queryByText("Xóa giao dịch")).toBeNull();
  });
});
