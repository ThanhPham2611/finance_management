import React from "react";
import { Alert } from "react-native";
import { fireEvent, render } from "@testing-library/react-native";
import { DebtsView } from "@/features/debts/debts-view";

const mockCreate = jest.fn();
const mockAdd = jest.fn();
const mockRemove = jest.fn();
const mockArchive = jest.fn();
const idle = { isPending: false, error: null };

jest.mock("@/features/finance/hooks", () => ({
  useCreateDebt: () => ({ mutate: (...args: unknown[]) => mockCreate(...args), ...idle }),
  useAddDebtPayment: () => ({ mutate: (...args: unknown[]) => mockAdd(...args), ...idle }),
  useDeleteDebtPayment: () => ({ mutate: (...args: unknown[]) => mockRemove(...args), ...idle }),
  useArchiveDebt: () => ({ mutate: (...args: unknown[]) => mockArchive(...args), ...idle }),
}));
jest.mock("@react-native-community/datetimepicker", () => {
  const { View } = jest.requireActual<typeof import("react-native")>("react-native");
  const Picker = (props: { value: Date; onChange(event: unknown, date?: Date): void }) => <View testID="date-picker" accessibilityLabel="Ngày" {...({ value: props.value, onChange: props.onChange } as object)} />;
  return { __esModule: true, default: Picker, DateTimePickerAndroid: { open: jest.fn() } };
});

const TODAY = "2026-05-15";
const debt = (over: Record<string, unknown> = {}) => ({
  id: "d1", name: "Trả góp iPhone", principal: 12_000_000, termMonths: 12, startDate: "2026-01-15",
  payments: [{ id: "p2", debtId: "d1", amount: 1_000_000, paidOn: "2026-04-15" }, { id: "p1", debtId: "d1", amount: 3_000_000, paidOn: "2026-02-15" }],
  ...over,
});

beforeEach(() => jest.clearAllMocks());

describe("DebtsView", () => {
  it("shows what is owed, what to pay each month and how far along each debt is", async () => {
    const view = await render(<DebtsView debts={[debt() as never]} today={TODAY} />);
    expect(view.getAllByText("8.000.000 ₫").length).toBeGreaterThan(0); // tổng còn nợ
    expect(view.getByText("Tổng 12.000.000 ₫ · 12 tháng · hạn 15/01/2027")).toBeTruthy();
    expect(view.getByText("Đã trả 4.000.000 ₫ (33%)")).toBeTruthy();
    expect(view.getByText("Còn 8.000.000 ₫")).toBeTruthy();
    expect(view.getByText("Mỗi tháng cần trả 1.000.000 ₫ · còn 8 tháng")).toBeTruthy();
  });

  it("reminds of the next installment: when it is due, how much, and how urgent", async () => {
    // Trả được 4tr/12tr, kỳ kế tiếp 15/06 (1tr).
    const later = await render(<DebtsView debts={[debt() as never]} today="2026-05-10" />);
    expect(later.getByText("Kỳ tới 15/06/2026 — 1.000.000 ₫")).toBeTruthy();
    const soon = await render(<DebtsView debts={[debt() as never]} today="2026-06-10" />);
    expect(soon.getByText("Hạn 15/06/2026 (còn 5 ngày) — 1.000.000 ₫")).toBeTruthy();
    const due = await render(<DebtsView debts={[debt() as never]} today="2026-06-15" />);
    expect(due.getByText("Đến hạn hôm nay — cần trả 1.000.000 ₫")).toBeTruthy();
    const missed = await render(<DebtsView debts={[debt() as never]} today="2026-08-20" />);
    expect(missed.getByText("Trễ 66 ngày (hạn 15/06/2026) — cần trả 3.000.000 ₫")).toBeTruthy();
  });

  it("flags a debt that is falling behind its plan, and one past its due date", async () => {
    const behind = debt({ payments: [{ id: "p1", debtId: "d1", amount: 1_000_000, paidOn: "2026-02-15" }] });
    const view = await render(<DebtsView debts={[behind as never]} today="2026-07-15" />);
    expect(view.getByText(/kế hoạch ban đầu 1\.000\.000 ₫ — đang chậm/)).toBeTruthy();

    const late = await render(<DebtsView debts={[debt() as never]} today="2027-02-01" />);
    expect(late.getByText("QUÁ HẠN")).toBeTruthy();
    expect(late.getByText("Trễ 231 ngày (hạn 15/06/2026) — cần trả 8.000.000 ₫")).toBeTruthy();
    expect(late.queryByText(/Mỗi tháng cần trả/)).toBeNull();
  });

  it("marks a fully paid debt and hides the payment form", async () => {
    const paid = debt({ payments: [{ id: "p1", debtId: "d1", amount: 12_000_000, paidOn: "2026-05-01" }] });
    const view = await render(<DebtsView debts={[paid as never]} today={TODAY} />);
    expect(view.getByText("ĐÃ TẤT TOÁN")).toBeTruthy();
    expect(view.queryByText("Ghi nhận trả nợ")).toBeNull();
    expect(view.queryByTestId("debt-reminder")).toBeNull();
  });

  it("records a payment dated today, and 'Trả đủ kỳ này' fills this month's amount", async () => {
    const view = await render(<DebtsView debts={[debt() as never]} today={TODAY} />);
    const amount = view.getByLabelText("Số tiền vừa trả cho Trả góp iPhone");
    expect(view.getByText("Ghi nhận trả nợ")).toBeTruthy();

    await fireEvent.press(view.getByText("Trả đủ kỳ này"));
    expect(amount.props.value).toBe("1.000.000");

    await fireEvent.changeText(amount, "500000");
    await fireEvent.press(view.getByText("Ghi nhận trả nợ"));
    expect(mockAdd).toHaveBeenCalledWith({ debtId: "d1", amount: 500_000, paidOn: TODAY }, expect.anything());
  });

  it("does not record an empty payment", async () => {
    const view = await render(<DebtsView debts={[debt() as never]} today={TODAY} />);
    await fireEvent.press(view.getByText("Ghi nhận trả nợ"));
    expect(mockAdd).not.toHaveBeenCalled();
  });

  it("lists past payments newest first and can delete a mistaken one", async () => {
    const view = await render(<DebtsView debts={[debt() as never]} today={TODAY} />);
    expect(view.queryByText("15/04/2026")).toBeNull();
    await fireEvent.press(view.getByText("Xem lịch sử trả (2)"));
    expect(view.getByText("15/04/2026")).toBeTruthy();
    await fireEvent.press(view.getByLabelText("Xóa lần trả 1.000.000 ₫ ngày 15/04/2026"));
    expect(mockRemove).toHaveBeenCalledWith("p2");
  });

  it("asks before dropping a debt from the list", async () => {
    const alert = jest.spyOn(Alert, "alert").mockImplementation(() => undefined);
    const view = await render(<DebtsView debts={[debt() as never]} today={TODAY} />);
    await fireEvent.press(view.getByLabelText("Bỏ khoản này"));
    expect(mockArchive).not.toHaveBeenCalled();
    const buttons = alert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    buttons.find((button) => button.text === "Bỏ khoản này")?.onPress?.();
    expect(mockArchive).toHaveBeenCalledWith("d1");
  });

  it("opens the add form when there are no debts, previews the monthly amount and saves", async () => {
    const view = await render(<DebtsView debts={[]} today={TODAY} />);
    await fireEvent.changeText(view.getByLabelText("Tên khoản nợ"), "Nợ anh A");
    await fireEvent.changeText(view.getByLabelText("Tổng số tiền phải trả"), "6000000");
    await fireEvent.changeText(view.getByLabelText("Số tháng dự kiến trả"), "6");
    expect(view.getByText("Trả đều khoảng 1.000.000 ₫ mỗi tháng.")).toBeTruthy();

    await fireEvent.press(view.getByText("Lưu khoản nợ"));
    expect(mockCreate).toHaveBeenCalledWith({ name: "Nợ anh A", principal: 6_000_000, termMonths: 6, startDate: TODAY }, expect.anything());
  });

  it("will not save a debt without a name or amount", async () => {
    const view = await render(<DebtsView debts={[]} today={TODAY} />);
    await fireEvent.press(view.getByText("Lưu khoản nợ"));
    expect(mockCreate).not.toHaveBeenCalled();
  });
});
