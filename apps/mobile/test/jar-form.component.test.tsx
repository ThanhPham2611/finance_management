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
