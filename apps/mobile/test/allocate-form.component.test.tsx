import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import type { Jar } from "@hu/domain";
import { AllocateForm } from "@/features/allocate/allocate-form";

const jar = (id: string, name: string, monthlyBudget: number): Jar => ({ id, name, icon: "wallet", color: "#174C3C", monthlyBudget, spent: 0, isShared: false, alertAt80: true, rollover: false, isSavings: false });
const jars = [jar("a", "Ăn uống", 6_000_000), jar("b", "Đi lại", 4_000_000)];
const now = new Date(2026, 9, 5);

const setup = (props: Partial<React.ComponentProps<typeof AllocateForm>> = {}) => {
  const onApply = jest.fn();
  const onEdit = jest.fn();
  const element = <AllocateForm jars={jars} familyContribution={0} familyJarCount={0} now={now} busy={false} applied={false} onApply={onApply} onEdit={onEdit} {...props} />;
  return { onApply, onEdit, element };
};

describe("AllocateForm", () => {
  it("starts from the current budgets, fully allocated", async () => {
    const { element } = setup();
    const view = await render(element);
    expect(view.getByText("Tháng 10, 2026")).toBeTruthy();
    expect(view.getByLabelText("Nhập tổng thu nhập").props.value).toBe("10.000.000");
    expect(view.getByLabelText("Sửa số tiền cho Ăn uống").props.value).toBe("6.000.000");
    expect(view.getByLabelText("Tỷ lệ phần trăm cho Ăn uống").props.value).toBe("60");
    expect(view.getByText("Đã chia hết thu nhập.")).toBeTruthy();
  });

  it("editing one amount rebalances the others to keep 100%", async () => {
    const { element, onEdit } = setup();
    const view = await render(element);
    await fireEvent.changeText(view.getByLabelText("Sửa số tiền cho Ăn uống"), "8000000");
    expect(view.getByLabelText("Sửa số tiền cho Đi lại").props.value).toBe("2.000.000");
    expect(view.getByText("Đã chia hết thu nhập.")).toBeTruthy();
    expect(onEdit).toHaveBeenCalled();
  });

  it("splits equally", async () => {
    const { element } = setup();
    const view = await render(element);
    await fireEvent.press(view.getByText("Chia đều"));
    expect(view.getByLabelText("Sửa số tiền cho Ăn uống").props.value).toBe("5.000.000");
    expect(view.getByLabelText("Sửa số tiền cho Đi lại").props.value).toBe("5.000.000");
  });

  it("warns when over-allocated and pulls the excess back off the last jar", async () => {
    const { element } = setup();
    const view = await render(element);
    await fireEvent.changeText(view.getByLabelText("Tỷ lệ phần trăm cho Ăn uống"), "70");
    expect(view.getByText("Vượt thu nhập 1.000.000 ₫. Giảm một hũ nào đó.")).toBeTruthy();
    expect(view.getByText("−1.000.000 ₫")).toBeTruthy();

    await fireEvent.press(view.getByText("Chia hết phần dư vào hũ cuối"));
    expect(view.getByLabelText("Sửa số tiền cho Đi lại").props.value).toBe("3.000.000");
    expect(view.getByText("Đã chia hết thu nhập.")).toBeTruthy();
  });

  it("accepts a decimal percentage typed with a comma and clamps to 0–100", async () => {
    const { element } = setup();
    const view = await render(element);
    await fireEvent.changeText(view.getByLabelText("Tỷ lệ phần trăm cho Ăn uống"), "12,5");
    expect(view.getByLabelText("Sửa số tiền cho Ăn uống").props.value).toBe("1.250.000");
    await fireEvent.changeText(view.getByLabelText("Tỷ lệ phần trăm cho Ăn uống"), "250");
    expect(view.getByLabelText("Sửa số tiền cho Ăn uống").props.value).toBe("10.000.000");
  });

  it("nudges a percentage with the plus and minus buttons", async () => {
    const { element } = setup();
    const view = await render(element);
    await fireEvent.press(view.getByRole("button", { name: "Tăng tỷ lệ Đi lại" }));
    expect(view.getByLabelText("Tỷ lệ phần trăm cho Đi lại").props.value).toBe("41");
    await fireEvent.press(view.getByRole("button", { name: "Giảm tỷ lệ Ăn uống" }));
    expect(view.getByLabelText("Tỷ lệ phần trăm cho Ăn uống").props.value).toBe("59");
  });

  it("subtracts the family pledge and blocks applying when income is below it", async () => {
    const { element, onApply } = setup({ familyContribution: 2_000_000, familyJarCount: 1 });
    const view = await render(element);
    expect(view.getByLabelText("Nhập tổng thu nhập").props.value).toBe("12.000.000");
    expect(view.getByText("Đã trừ 2.000.000 ₫ đóng góp hũ gia đình, còn 10.000.000 ₫ để chia cho hũ cá nhân.")).toBeTruthy();

    await fireEvent.changeText(view.getByLabelText("Nhập tổng thu nhập"), "1000000");
    expect(view.getByText(/nhỏ hơn phần đã cam kết góp hũ gia đình/)).toBeTruthy();
    await fireEvent.press(view.getByText("Áp dụng cho tháng 10"));
    expect(onApply).not.toHaveBeenCalled();
  });

  it("applies the monthly budgets of the personal income, not counting the family pledge", async () => {
    const { element, onApply } = setup({ familyContribution: 2_000_000 });
    const view = await render(element);
    await fireEvent.press(view.getByText("Áp dụng cho tháng 10"));
    expect(onApply).toHaveBeenCalledWith({
      income: 12_000_000,
      allocations: [{ jarId: "a", monthlyBudget: 6_000_000, pct: 60 }, { jarId: "b", monthlyBudget: 4_000_000, pct: 40 }],
    });
  });

  it("locks the button while applying, and shows the result or the error", async () => {
    const busy = await render(setup({ busy: true }).element);
    expect(busy.getByRole("button", { name: "Đang áp dụng…" }).props.accessibilityState.disabled).toBe(true);

    const done = await render(setup({ applied: true }).element);
    expect(done.getByText("Đã cập nhật ngân sách tháng 10 cho các hũ.")).toBeTruthy();

    const failed = await render(setup({ error: "permission denied" }).element);
    expect(failed.getByText("permission denied")).toBeTruthy();
  });

  it("explains there is nothing to allocate without personal jars", async () => {
    const view = await render(setup({ jars: [], familyJarCount: 1 }).element);
    expect(view.getByText("Chưa có hũ cá nhân nào để chia lương")).toBeTruthy();
    expect(view.getByText(/Phần đóng góp cho hũ gia đình được quản lý riêng ở mục Gia đình/)).toBeTruthy();
  });
});
