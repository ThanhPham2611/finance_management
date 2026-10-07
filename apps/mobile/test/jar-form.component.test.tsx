import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { JarForm } from "@/features/finance/jar-form";

describe("JarForm", () => {
  it("retains user input when a server error is rendered", async () => {
    const onSubmit = jest.fn();
    const view = await render(<JarForm submitLabel="Tạo hũ" busy={false} onSubmit={onSubmit} />);
    await fireEvent.changeText(view.getByLabelText("Ngân sách mỗi tháng"), "125000");
    await view.rerender(<JarForm submitLabel="Tạo hũ" busy={false} serverError="Mất kết nối" onSubmit={onSubmit} />);
    expect(view.getByLabelText("Ngân sách mỗi tháng").props.value).toBe("125.000");
    expect(view.getByText("Mất kết nối")).toBeTruthy();
  });
});

describe("JarForm for a family jar", () => {
  const initial = { name: "Nhà ở", monthlyBudget: 5_000_000, icon: "home", color: "#174C3C", alertAt80: true, rollover: false, isSavings: false };

  it("shows the pooled budget read-only and cannot be turned into a savings jar", async () => {
    const view = await render(<JarForm shared initial={initial} submitLabel="Lưu thay đổi" busy={false} onSubmit={jest.fn()} />);
    expect(view.getByText("5.000.000 ₫")).toBeTruthy();
    expect(view.queryByLabelText("Ngân sách mỗi tháng")).toBeNull();
    expect(view.queryByLabelText("Hũ tiết kiệm")).toBeNull();
    expect(view.getByText(/chỉnh ở mục Gia đình/)).toBeTruthy();
  });

  it("explains savings jars and hides the alert/rollover options when switched on", async () => {
    const view = await render(<JarForm initial={initial} submitLabel="Lưu thay đổi" busy={false} onSubmit={jest.fn()} />);
    expect(view.getByLabelText("Cảnh báo ở 80%")).toBeTruthy();
    await fireEvent(view.getByLabelText("Hũ tiết kiệm"), "valueChange", true);
    expect(view.getByText(/sẽ luôn được hỏi xác nhận/)).toBeTruthy();
    expect(view.queryByLabelText("Cảnh báo ở 80%")).toBeNull();
  });
});
