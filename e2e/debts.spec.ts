import { test, expect } from "@playwright/test";

// Can chay supabase/migrations/013_debts.sql tren project test truoc khi chay file nay.
test("trả nợ: thêm khoản nợ, ghi nhận và xoá lần trả, rồi bỏ khoản nợ", async ({ page }) => {
  const name = `[e2e-debt] ${Date.now()}`;

  await page.goto("/debts");
  await page.waitForLoadState("networkidle");
  await expect(page.getByRole("navigation", { name: "Điều hướng chính" }).getByRole("link", { name: "Trả nợ" })).toBeVisible();

  const toggle = page.getByRole("button", { name: "Thêm khoản nợ" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByLabel("Tên khoản nợ").fill(name);
  await page.getByLabel(/Tổng số tiền phải trả/).fill("1200000");
  await page.getByLabel("Dự kiến trả trong (tháng)").fill("12");
  await expect(page.getByText("Trả đều khoảng 100.000đ mỗi tháng.")).toBeVisible();
  await page.getByRole("button", { name: "Lưu khoản nợ" }).click();

  const card = page.getByTestId("debt-card").filter({ hasText: name });
  await expect(card).toBeVisible();
  await expect(card.getByTestId("debt-monthly")).toContainText("100.000đ");

  await card.getByLabel(/Số tiền vừa trả/).fill("300000");
  await card.getByRole("button", { name: "Ghi nhận trả nợ" }).click();
  await expect(card.getByText(/Đã trả 300\.000đ \(25%\)/)).toBeVisible();
  await expect(card.getByText("Còn 900.000đ")).toBeVisible();

  // Tải lại từ server để chắc chắn đã ghi vào DB, không chỉ là state client.
  await page.reload();
  await page.waitForLoadState("networkidle");
  await expect(card.getByText(/Đã trả 300\.000đ \(25%\)/)).toBeVisible();

  await card.getByText(/Lịch sử trả \(1\)/).click();
  await card.getByRole("button", { name: /^Xoá lần trả 300\.000đ/ }).click();
  await expect(card.getByText(/Đã trả 0đ \(0%\)/)).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Bỏ khoản này" }).click();
  await expect(card).toBeHidden();
});

test("nhắc hạn trả nợ: kỳ đã trễ hiện đỏ ở trang Trả nợ và ở Tổng quan, trả đủ thì hết trễ", async ({ page }) => {
  const name = `[e2e-debt-late] ${Date.now()}`;
  // Bắt đầu cách đây 3 tháng 10 ngày, 12 tháng, 1,2tr => 3 kỳ (300.000đ) đã đến hạn mà chưa trả.
  const start = new Date();
  start.setMonth(start.getMonth() - 3);
  start.setDate(start.getDate() - 10);
  const startYmd = start.toLocaleDateString("en-CA");

  await page.goto("/debts");
  await page.waitForLoadState("networkidle");
  const toggle = page.getByRole("button", { name: "Thêm khoản nợ" });
  if (await toggle.isVisible()) await toggle.click();
  await page.getByLabel("Tên khoản nợ").fill(name);
  await page.getByLabel(/Tổng số tiền phải trả/).fill("1200000");
  await page.getByLabel("Bắt đầu từ").fill(startYmd);
  await page.getByRole("button", { name: "Lưu khoản nợ" }).click();

  const card = page.getByTestId("debt-card").filter({ hasText: name });
  await expect(card.getByTestId("debt-reminder")).toHaveAttribute("data-state", "overdue");
  await expect(card.getByTestId("debt-reminder")).toContainText("cần trả 300.000đ");

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const overview = page.getByTestId("debts-overview");
  await expect(overview).toBeVisible();
  await expect(overview).toHaveAttribute("data-urgency", "overdue");
  await expect(overview.getByText(name)).toBeVisible();
  await expect(overview.locator("li").filter({ hasText: name })).toContainText("Trễ");

  await page.goto("/debts");
  await page.waitForLoadState("networkidle");
  await card.getByLabel(/Số tiền vừa trả/).fill("300000");
  await card.getByRole("button", { name: "Ghi nhận trả nợ" }).click();
  await expect(card.getByTestId("debt-reminder")).not.toHaveAttribute("data-state", "overdue");

  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Bỏ khoản này" }).click();
  await expect(card).toBeHidden();
});
