import { test, expect } from "@playwright/test";

test("tổng quan: thẻ tốc độ chi tiêu mỗi ngày và tỉ trọng % của từng hũ", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const pace = page.getByTestId("spending-pace");
  await expect(pace).toBeVisible();
  await expect(pace).toHaveAttribute("data-status", /^(early|good|watch|over)$/);
  await expect(pace).toContainText("/ngày");

  const tiles = page.locator("a[href^='/jars/']").filter({ hasText: "% tổng" });
  expect(await tiles.count()).toBeGreaterThan(0);
});

test("danh sách hũ: mỗi hũ có tỉ trọng % và bảng màu sửa hũ có đủ màu", async ({ page }) => {
  await page.goto("/jars");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(/Tỉ trọng mỗi hũ tính trên tổng/)).toBeVisible();
  const row = page.locator("a[href^='/jars/']").filter({ hasText: "% tổng" }).first();
  await expect(row).toBeVisible();

  await row.click();
  await page.getByRole("link", { name: "Sửa hũ" }).click();
  await expect(page.getByRole("radio", { name: /^Màu #/ })).toHaveCount(32);
});

test("tổng quan: donut ngân sách mỗi hũ một màu riêng", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Dạng donut" }).click();

  const sectors = page.locator("path.recharts-sector");
  await expect(sectors.first()).toBeAttached();
  const colors = await sectors.evaluateAll((els) => els.map((el) => el.getAttribute("fill")));
  expect(new Set(colors).size).toBe(colors.length);
});
