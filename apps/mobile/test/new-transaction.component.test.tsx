import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { parseYMD, toYMD, vietnamToday } from "@hu/domain";
import NewTransactionScreen from "@/app/transactions/new";

const mockReplace = jest.fn();
const mockMutate = jest.fn();
const mockReset = jest.fn();
const state: { params: Record<string, string>; jars: ReturnType<typeof makeJars>; history: unknown[] } = { params: {}, jars: [] as never, history: [] };

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
  useTransactionsSince: () => ({ data: state.history }),
}));
jest.mock("@/providers/auth-provider", () => ({ useAuth: () => ({ session: { user: { id: "me" } } }) }));

jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const Picker = (props: { value: Date; maximumDate?: Date; onChange(event: unknown, date?: Date): void }) => <View testID="date-picker" accessibilityLabel="Ngày" {...({ value: props.value, maximumDate: props.maximumDate, onChange: props.onChange } as object)} />;
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

const DATE_PATTERN = expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/);
const radio = (view: { getByRole: (...a: never[]) => unknown }, name: RegExp | string) => (view.getByRole as (r: string, o: object) => { props: { accessibilityState: { selected: boolean } } })("radio", { name });

beforeEach(() => {
  jest.clearAllMocks();
  state.params = {};
  state.jars = makeJars();
  state.history = [];
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
    expect(view.getByText("Nhập số tiền · hỗ trợ 50k, 2tr5, 1+2+3")).toBeTruthy();

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
    expect(mockMutate.mock.calls[0][0]).toEqual({ jarId: "save", amount: 60_000, note: "", type: "expense", transactionDate: DATE_PATTERN });
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

    expect(mockMutate.mock.calls[0][0]).toEqual({ jarId: "food", amount: 100_000, note: "Phở", type: "expense", transactionDate: DATE_PATTERN });
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

  describe("transaction date", () => {
    const today = vietnamToday();
    const daysAgo = (days: number) => {
      const date = parseYMD(today);
      date.setDate(date.getDate() - days);
      return date;
    };

    it("defaults to today, forbids future dates, and saves the date the user picks", async () => {
      const view = await render(<NewTransactionScreen />);
      const picker = view.getByTestId("date-picker");
      expect(picker.props.value).toEqual(parseYMD(today));
      expect(picker.props.maximumDate).toEqual(parseYMD(today));

      await fireEvent.changeText(view.getByLabelText("Số tiền"), "100000");
      await fireEvent(picker, "change", {}, daysAgo(1));
      await fireEvent.press(view.getByText("Lưu giao dịch"));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ amount: 100_000, transactionDate: toYMD(daysAgo(1)) });
    });

    it("sends today's date when the user leaves it alone", async () => {
      const view = await render(<NewTransactionScreen />);
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "100000");
      await fireEvent.press(view.getByText("Lưu giao dịch"));
      expect(mockMutate.mock.calls[0][0].transactionDate).toBe(today);
    });

    it("says a last-month date does not touch this month's budget, before and after saving", async () => {
      mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => options.onSuccess());
      const lastMonth = parseYMD(today);
      lastMonth.setDate(1);
      lastMonth.setMonth(lastMonth.getMonth() - 1);
      const view = await render(<NewTransactionScreen />);
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "100000");
      expect(view.getByText("Sau khoản này Ăn uống còn 500.000 ₫")).toBeTruthy();

      await fireEvent(view.getByTestId("date-picker"), "change", {}, lastMonth);
      expect(view.getByText("Khoản thuộc tháng trước, không tính vào ngân sách tháng này")).toBeTruthy();

      await fireEvent.press(view.getByText("Lưu giao dịch"));
      expect(view.getByText("Thuộc tháng trước, không tính vào ngân sách tháng này")).toBeTruthy();
      expect(view.getByText("600.000 ₫")).toBeTruthy(); // hũ giữ nguyên số dư
    });

    it("'Nhập tiếp' keeps the date that was used", async () => {
      mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => options.onSuccess());
      const view = await render(<NewTransactionScreen />);
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "100000");
      await fireEvent(view.getByTestId("date-picker"), "change", {}, daysAgo(2));
      await fireEvent.press(view.getByText("Lưu giao dịch"));
      await fireEvent.press(view.getByText("Nhập tiếp"));
      expect(view.getByTestId("date-picker").props.value).toEqual(daysAgo(2));
    });
  });

  describe("quick-add suggestions", () => {
    const entry = (over: Record<string, unknown> = {}) => ({ id: "x", jarId: "food", amount: 3_000, note: "Gửi xe", transactionDate: "2026-09-01", userId: "me", type: "expense", ...over });
    const repeat = (count: number, over: Record<string, unknown> = {}) => Array.from({ length: count }, () => entry(over));
    const quick = (view: { queryAllByRole: (r: string, o: object) => unknown[] }) => view.queryAllByRole("button", { name: /^Thêm nhanh/ });

    beforeEach(() => {
      state.history = [
        ...repeat(3),
        entry({ amount: 45_000, note: "Phở" }), // chỉ 1 lần
        ...repeat(2, { amount: 99_000, note: "Cơm", userId: "other" }), // của người khác
        ...repeat(2, { jarId: "save", amount: 100_000, note: "Rút" }), // rút tiết kiệm: phải qua bước xác nhận
        ...repeat(2, { jarId: "save", amount: 500_000, note: "Gửi lương", type: "deposit" }),
        ...repeat(2, { jarId: "gone", amount: 1_000, note: "Hũ đã xoá" }),
      ];
    });

    it("offers only what the user repeats: own, still-existing jars, not a one-tap savings withdrawal", async () => {
      const view = await render(<NewTransactionScreen />);
      expect(view.getByText("Gợi ý — bấm để thêm luôn")).toBeTruthy();
      expect(quick(view)).toHaveLength(1);
      expect(view.getByRole("button", { name: "Thêm nhanh Gửi xe 3.000 ₫ vào Ăn uống" })).toBeTruthy();
    });

    it("follows the Chi/Thu switch", async () => {
      const view = await render(<NewTransactionScreen />);
      await fireEvent.press(view.getByRole("radio", { name: "Nạp tiền" }));
      expect(quick(view)).toHaveLength(1);
      expect(view.getByRole("button", { name: "Thêm nhanh Gửi lương 500.000 ₫ vào Quỹ dư" })).toBeTruthy();
    });

    it("is absent when nothing has been repeated", async () => {
      state.history = [entry(), entry({ note: "Khác" })];
      const view = await render(<NewTransactionScreen />);
      expect(view.queryByText("Gợi ý — bấm để thêm luôn")).toBeNull();
    });

    it("one tap records the same transaction dated today, then shows the usual result", async () => {
      mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => options.onSuccess());
      const view = await render(<NewTransactionScreen />);
      await fireEvent.press(view.getByRole("button", { name: /^Thêm nhanh Gửi xe/ }));
      expect(mockMutate).toHaveBeenCalledTimes(1);
      expect(mockMutate.mock.calls[0][0]).toEqual({ jarId: "food", amount: 3_000, note: "Gửi xe", type: "expense", transactionDate: vietnamToday() });
      expect(view.getByText("Đã lưu 3.000 ₫ vào Ăn uống")).toBeTruthy();
    });

    it("uses the date chosen in the form, so past entries can be added in one tap too", async () => {
      mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => options.onSuccess());
      const twoDaysAgo = parseYMD(vietnamToday());
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      const view = await render(<NewTransactionScreen />);
      await fireEvent(view.getByTestId("date-picker"), "change", {}, twoDaysAgo);
      await fireEvent.press(view.getByRole("button", { name: /^Thêm nhanh Gửi xe/ }));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ transactionDate: toYMD(twoDaysAgo) });
    });

    it("a deposit suggestion goes straight into the savings jar without the withdrawal prompt", async () => {
      mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => options.onSuccess());
      const view = await render(<NewTransactionScreen />);
      await fireEvent.press(view.getByRole("radio", { name: "Nạp tiền" }));
      await fireEvent.press(view.getByRole("button", { name: /^Thêm nhanh Gửi lương/ }));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ jarId: "save", amount: 500_000, type: "deposit" });
      expect(view.getByText("Đã thu 500.000 ₫ vào Quỹ dư")).toBeTruthy();
    });
  });

  describe("calculator amount", () => {
    it("evaluates what is typed, shows the result live, and saves the result", async () => {
      const view = await render(<NewTransactionScreen />);
      expect(view.queryByTestId("calc-result")).toBeNull();
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "50000×2+1.000");
      expect(view.getByLabelText("Số tiền").props.value).toBe("50.000×2+1.000");
      expect(view.getByTestId("calc-result").props.children).toBe("= 101.000 ₫");
      expect(view.getByText("Sau khoản này Ăn uống còn 499.000 ₫")).toBeTruthy();

      await fireEvent.press(view.getByText("Lưu giao dịch"));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ amount: 101_000 });
    });

    it("the operator keys append to the amount and '=' settles it into one number", async () => {
      const view = await render(<NewTransactionScreen />);
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "1000");
      await fireEvent.press(view.getByRole("button", { name: "Dấu +" }));
      expect(view.getByLabelText("Số tiền").props.value).toBe("1.000+");
      expect(view.getByTestId("calc-result").props.children).toBe("Phép tính chưa hoàn chỉnh");

      await fireEvent.changeText(view.getByLabelText("Số tiền"), "1.000+500");
      await fireEvent.press(view.getByRole("button", { name: "Dấu =" }));
      expect(view.getByLabelText("Số tiền").props.value).toBe("1.500");
      expect(view.queryByTestId("calc-result")).toBeNull();
    });

    it("reads 50k and 2tr5 as nghìn and triệu, from typing or from the k / tr keys", async () => {
      const view = await render(<NewTransactionScreen />);
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "50");
      await fireEvent.press(view.getByRole("button", { name: "Nghìn (k)" }));
      expect(view.getByLabelText("Số tiền").props.value).toBe("50k");
      expect(view.getByTestId("calc-result").props.children).toBe("= 50.000 ₫");

      await fireEvent.changeText(view.getByLabelText("Số tiền"), "2");
      await fireEvent.press(view.getByRole("button", { name: "Triệu (tr)" }));
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "2tr5");
      expect(view.getByTestId("calc-result").props.children).toBe("= 2.500.000 ₫");

      await fireEvent.changeText(view.getByLabelText("Số tiền"), "1,5TR + 200k");
      expect(view.getByLabelText("Số tiền").props.value).toBe("1,5tr+200k");
      expect(view.getByTestId("calc-result").props.children).toBe("= 1.700.000 ₫");
      await fireEvent.press(view.getByText("Lưu giao dịch"));
      expect(mockMutate.mock.calls[0][0]).toMatchObject({ amount: 1_700_000 });
    });

    it("will not save an unfinished or non-positive calculation", async () => {
      const view = await render(<NewTransactionScreen />);
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "1000+");
      await fireEvent.press(view.getByText("Lưu giao dịch"));
      expect(view.getByText("Số tiền phải lớn hơn 0.")).toBeTruthy();

      await fireEvent.changeText(view.getByLabelText("Số tiền"), "1000-5000");
      expect(view.getByTestId("calc-result").props.children).toBe("Kết quả phải lớn hơn 0");
      await fireEvent.press(view.getByText("Lưu giao dịch"));
      expect(mockMutate).not.toHaveBeenCalled();
    });

    it("clears the expression when the form is reset for the next entry", async () => {
      mockMutate.mockImplementation((_input: unknown, options: { onSuccess(): void }) => options.onSuccess());
      const view = await render(<NewTransactionScreen />);
      await fireEvent.changeText(view.getByLabelText("Số tiền"), "1000+500");
      await fireEvent.press(view.getByText("Lưu giao dịch"));
      await fireEvent.press(view.getByText("Nhập tiếp"));
      expect(view.getByLabelText("Số tiền").props.value).toBe("");
      expect(view.queryByTestId("calc-result")).toBeNull();
    });
  });
});
