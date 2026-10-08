import { test, expect } from "@playwright/test";

test("giao dịch: ô chọn hũ có kiểu riêng, lọc theo hũ sáng lên và xoá lọc được, không tràn ngang ở 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");

  const jarSelect = page.getByLabel("Lọc theo hũ");
  // Không dùng mũi tên mặc định của hệ điều hành.
  expect(await jarSelect.evaluate((el) => getComputedStyle(el).appearance)).toBe("none");
  const before = await jarSelect.evaluate((el) => getComputedStyle(el).backgroundColor);

  await jarSelect.selectOption({ index: 1 });
  expect(await jarSelect.evaluate((el) => getComputedStyle(el).backgroundColor)).not.toBe(before);
  await expect(page.getByRole("button", { name: "Xoá lọc" }).first()).toBeVisible();

  await page.getByRole("button", { name: "Xoá lọc" }).first().click();
  await expect(jarSelect).toHaveValue("all");

  // Kiểu xem chỉ có icon nhưng vẫn có tên truy cập và trạng thái nhấn.
  const calendar = page.getByRole("button", { name: "Lịch" });
  await calendar.click();
  await expect(calendar).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("button", { name: "Danh sách" })).toHaveAttribute("aria-pressed", "false");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});
