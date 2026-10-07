import { test, expect } from "@playwright/test";

test("lịch chi tiêu: ô hôm nay hiện số tiền, bấm vào xem đúng giao dịch trong ngày", async ({ page }) => {
  const note = `[e2e-cal] ${Date.now()}`;

  await page.goto("/transactions/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^Ăn uống/ }).click();
  await page.getByLabel("Nhập số tiền").fill("12000");
  await page.getByLabel("Ghi chú (không bắt buộc)").fill(note);
  await page.getByRole("button", { name: /^Lưu/ }).click();
  await expect(page.getByText("Đã lưu")).toBeVisible();

  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Lịch" }).click();

  const today = page.locator('[aria-current="date"]');
  await expect(today).toBeVisible();
  await expect(today).toHaveAttribute("aria-label", /đã chi/);

  await today.click();
  const panel = page.getByRole("region", { name: "Giao dịch trong ngày" });
  await expect(panel.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note })).toBeVisible();

  // Chọn ngày khác thì panel đổi theo; chọn lại hôm nay thì giao dịch quay về.
  await page.locator("[data-date]").first().click();
  await expect(panel.getByText(note)).toHaveCount(0);
  await today.click();

  // Dọn dữ liệu: xoá giao dịch vừa tạo.
  await panel.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note }).click();
  const deleteButton = page.getByRole("button", { name: "Xoá giao dịch" });
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(deleteButton).toBeHidden();
});

test("lịch chi tiêu: giữ chế độ Lịch khi đổi tháng và không tràn ngang trên điện thoại", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  const calendarToggle = page.getByRole("button", { name: "Lịch" });
  await calendarToggle.click();
  await expect(calendarToggle).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("link", { name: "Tháng trước" }).click();
  await page.waitForURL(/month=\d{4}-\d{2}/);
  await expect(calendarToggle).toHaveAttribute("aria-pressed", "true");
  const ym = new URL(page.url()).searchParams.get("month")!;
  await expect(page.locator(`[data-date^="${ym}-"]`).first()).toBeVisible();

  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((node) => node.clientWidth));
});
