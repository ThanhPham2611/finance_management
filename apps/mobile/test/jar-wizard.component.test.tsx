import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import NewJarScreen from "@/app/jars/new";

const mockReplace = jest.fn();
const mockMutate = jest.fn();
const state: { error: Error | null; pending: boolean } = { error: null, pending: false };

jest.mock("expo-router", () => ({ router: { replace: (...args: unknown[]) => mockReplace(...args) }, Stack: { Screen: () => null } }));
jest.mock("@/features/finance/hooks", () => ({ useCreateJars: () => ({ mutate: mockMutate, isPending: state.pending, error: state.error }) }));

beforeEach(() => {
  jest.clearAllMocks();
  state.error = null;
  state.pending = false;
});

describe("NewJarScreen wizard", () => {
  it("cannot continue until something is picked", async () => {
    const view = await render(<NewJarScreen />);
    expect(view.getByText("Đã chọn 0 hũ")).toBeTruthy();
    await fireEvent.press(view.getByText("Tiếp tục"));
    expect(view.queryByText("Bước 2/2")).toBeNull();
  });

  it("creates several jars at once from presets and a custom one", async () => {
    const view = await render(<NewJarScreen />);
    await fireEvent.press(view.getByRole("checkbox", { name: "Ăn uống" }));
    await fireEvent.press(view.getByRole("checkbox", { name: "Tiết kiệm" }));
    await fireEvent.press(view.getByRole("button", { name: /Tự đặt tên/ }));
    expect(view.getByText("Đã chọn 3 hũ")).toBeTruthy();
    await fireEvent.press(view.getByText("Tiếp tục"));
    expect(view.getByText("Bước 2/2")).toBeTruthy();

    // Mẫu "Tiết kiệm" đã bật sẵn cờ hũ tiết kiệm; hũ tự đặt tên chưa có tên nên chưa lưu được.
    const toggles = view.getAllByLabelText("Đánh dấu là hũ tiết kiệm");
    expect(toggles.map((toggle) => toggle.props.value)).toEqual([false, true, false]);
    expect(view.getByRole("button", { name: "Lưu 3 hũ" }).props.accessibilityState.disabled).toBe(true);

    await fireEvent.press(view.getAllByText("1.000.000")[0]); // chip ngân sách nhanh của hũ 1
    await fireEvent.changeText(view.getByLabelText("Tên hũ 3"), " Quà tặng ");
    await fireEvent(view.getByLabelText("Cảnh báo khi dùng hết 80%"), "valueChange", false);

    await fireEvent.press(view.getByText("Lưu 3 hũ"));
    expect(mockMutate).toHaveBeenCalledTimes(1);
    expect(mockMutate.mock.calls[0][0]).toEqual([
      { name: "Ăn uống", icon: "utensils", color: "#AB5637", monthlyBudget: 1_000_000, alertAt80: false, rollover: false, isSavings: false },
      { name: "Tiết kiệm", icon: "piggy-bank", color: "#307A4F", monthlyBudget: 0, alertAt80: false, rollover: false, isSavings: true },
      { name: "Quà tặng", icon: "wallet", color: "#9A5B13", monthlyBudget: 0, alertAt80: false, rollover: false, isSavings: false },
    ]);
  });

  it("adds a budget up from smaller items", async () => {
    const view = await render(<NewJarScreen />);
    await fireEvent.press(view.getByRole("checkbox", { name: "Ăn uống" }));
    await fireEvent.press(view.getByText("Tiếp tục"));
    await fireEvent.press(view.getByText("Chưa biết rõ tổng? Cộng từ từng khoản nhỏ"));
    await fireEvent.changeText(view.getByLabelText("Số tiền khoản này"), "500000");
    await fireEvent.press(view.getByText("Thêm khoản"));
    await fireEvent.changeText(view.getAllByLabelText("Số tiền khoản này")[1], "300000");
    expect(view.getByText("800.000 ₫")).toBeTruthy();
    expect(view.getByText("Tổng 2 khoản")).toBeTruthy();

    await fireEvent.press(view.getByText("Lưu 1 hũ"));
    expect(mockMutate.mock.calls[0][0][0]).toMatchObject({ name: "Ăn uống", monthlyBudget: 800_000 });
  });

  it("can drop a draft and go back to step 1 without losing the others", async () => {
    const view = await render(<NewJarScreen />);
    await fireEvent.press(view.getByRole("checkbox", { name: "Ăn uống" }));
    await fireEvent.press(view.getByRole("checkbox", { name: "Đi lại" }));
    await fireEvent.press(view.getByText("Tiếp tục"));
    await fireEvent.press(view.getByLabelText("Bỏ hũ Đi lại"));
    expect(view.queryByLabelText("Tên hũ 2")).toBeNull();
    expect(view.getByText("Lưu 1 hũ")).toBeTruthy();

    await fireEvent.press(view.getByText("Quay lại chọn hũ"));
    expect(view.getByText("Đã chọn 1 hũ")).toBeTruthy();
  });

  it("shows the result and goes back to the jar list after saving", async () => {
    mockMutate.mockImplementation((_inputs: unknown, options: { onSuccess(): void }) => options.onSuccess());
    const view = await render(<NewJarScreen />);
    await fireEvent.press(view.getByRole("checkbox", { name: "Sinh hoạt" }));
    await fireEvent.press(view.getByText("Tiếp tục"));
    await fireEvent.press(view.getByText("Lưu 1 hũ"));
    expect(view.getByText("Đã tạo 1 hũ")).toBeTruthy();
    await fireEvent.press(view.getByText("Về danh sách hũ"));
    expect(mockReplace).toHaveBeenCalledWith("/jars");
  });

  it("keeps the drafts and shows the server error when saving fails", async () => {
    state.error = new Error("Kiểm tra lại tên và ngân sách của từng hũ.");
    const view = await render(<NewJarScreen />);
    await fireEvent.press(view.getByRole("checkbox", { name: "Sinh hoạt" }));
    await fireEvent.press(view.getByText("Tiếp tục"));
    expect(view.getByText("Kiểm tra lại tên và ngân sách của từng hũ.")).toBeTruthy();
    expect(view.getByLabelText("Tên hũ 1").props.value).toBe("Sinh hoạt");
  });
});
