import { test, expect } from "@playwright/test";

const vnDate = (offsetDays = 0) => new Date(Date.now() + offsetDays * 86_400_000).toLocaleDateString("en-CA", { timeZone: "Asia/Ho_Chi_Minh" });

test("nhập giao dịch: ngày mặc định hôm nay, chọn được ngày cũ, không cho ngày tương lai", async ({ page }) => {
  const note = `[e2e-date] ${Date.now()}`;
  const yesterday = vnDate(-1);

  await page.goto("/transactions/new");
  await page.waitForLoadState("networkidle");
  const date = page.getByLabel("Ngày", { exact: true });
  await expect(date).toHaveValue(vnDate());
  await expect(date).toHaveAttribute("max", vnDate());

  // Ngày tương lai bị chặn, không ghi gì.
  await page.getByRole("button", { name: /^Mua sắm/ }).click();
  await page.getByLabel("Nhập số tiền").fill("1000");
  await date.fill(vnDate(1));
  await page.getByRole("button", { name: /^Lưu/ }).click();
  await expect(page.getByText("Ngày giao dịch không hợp lệ")).toBeVisible();

  await date.fill(yesterday);
  await page.getByLabel("Ghi chú (không bắt buộc)").fill(note);
  await page.getByRole("button", { name: /^Lưu/ }).click();
  await expect(page.getByText("Đã lưu")).toBeVisible();

  // Giao dịch nằm đúng ngày hôm qua (có thể thuộc tháng trước nếu hôm nay là mùng 1).
  await page.goto(`/transactions?month=${yesterday.slice(0, 7)}`);
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note });
  await expect(row).toBeVisible();
  await row.click();
  await expect(page.getByLabel("Ngày", { exact: true })).toHaveValue(yesterday);

  const deleteButton = page.getByRole("button", { name: "Xoá giao dịch" });
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(deleteButton).toBeHidden();
});
