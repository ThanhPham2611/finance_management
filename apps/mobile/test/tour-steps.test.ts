import { describe, expect, it } from "vitest";
import { tourSteps } from "../src/features/tour/steps";

describe("tourSteps", () => {
  it("has the full walkthrough once there are jars, and ends with the replay hint", () => {
    const steps = tourSteps(true);
    expect(steps.map((step) => step.title)).toEqual(["Chào mừng đến với Hũ", "Ghi giao dịch nhanh", "Số tiền còn lại", "Các hũ ngân sách", "Giao dịch gần nhất", "Xong rồi!"]);
    expect(steps.at(-1)?.body).toContain("tab Thêm");
  });

  it("only guides creating the first jar when there are none", () => {
    expect(tourSteps(false).map((step) => step.title)).toEqual(["Chào mừng đến với Hũ", "Tạo hũ đầu tiên", "Xong rồi!"]);
  });

  it("never refers to web-only UI such as the icon next to the user's name", () => {
    for (const step of [...tourSteps(true), ...tourSteps(false)]) expect(step.body).not.toContain("biểu tượng cạnh tên");
  });
});
