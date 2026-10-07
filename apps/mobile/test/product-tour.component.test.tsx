import React from "react";
import { fireEvent, render } from "@testing-library/react-native";
import { ProductTour } from "@/features/tour/product-tour";

describe("ProductTour", () => {
  it("steps forward and back, hiding Back on the first step and Skip on the last", async () => {
    const onClose = jest.fn();
    const view = await render(<ProductTour hasJars onClose={onClose} />);
    expect(view.getByText("Bước 1/6")).toBeTruthy();
    expect(view.queryByText("Quay lại")).toBeNull();

    await fireEvent.press(view.getByText("Tiếp"));
    expect(view.getByText("Bước 2/6")).toBeTruthy();
    await fireEvent.press(view.getByText("Quay lại"));
    expect(view.getByText("Bước 1/6")).toBeTruthy();

    for (let i = 0; i < 5; i++) await fireEvent.press(view.getByText("Tiếp"));
    expect(view.getByText("Xong rồi!")).toBeTruthy();
    expect(view.queryByText("Bỏ qua")).toBeNull();
    expect(onClose).not.toHaveBeenCalled();

    await fireEvent.press(view.getByText("Xong"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("can be skipped at any step before the end", async () => {
    const onClose = jest.fn();
    const view = await render(<ProductTour hasJars onClose={onClose} />);
    await fireEvent.press(view.getByText("Tiếp"));
    await fireEvent.press(view.getByText("Bỏ qua"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("has just three steps for someone without jars", async () => {
    const view = await render(<ProductTour hasJars={false} onClose={jest.fn()} />);
    expect(view.getByText("Bước 1/3")).toBeTruthy();
  });
});
