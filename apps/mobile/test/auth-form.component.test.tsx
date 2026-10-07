import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { AuthField } from "@/components/auth-form";

describe("AuthField", () => {
  it("names the input for screen readers and hides the visible label from the accessibility tree", async () => {
    const onChangeText = jest.fn();
    const view = await render(<AuthField label="Email" value="" onChangeText={onChangeText} autoComplete="email" />);
    await fireEvent.changeText(view.getByLabelText("Email"), "a@b.vn");
    expect(onChangeText).toHaveBeenCalledWith("a@b.vn");
    // Nhãn hiển thị bị ẩn: nếu không, VoiceOver đọc "Email" hai lần và Maestro/XCUITest bấm nhầm nhãn thay vì ô nhập.
    expect(view.queryByText("Email")).toBeNull();
    expect(view.getByText("Email", { includeHiddenElements: true })).toBeTruthy();
  });
});
