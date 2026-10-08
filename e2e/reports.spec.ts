import { test, expect } from "@playwright/test";

test("báo cáo: thẻ tổng chi đổi theo kỳ, tab theo hũ có thanh tỷ trọng, không tràn ngang ở 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/reports");
  await page.waitForLoadState("networkidle");

  const summary = page.getByRole("region", { name: "Tổng chi kỳ này" });
  await expect(summary).toContainText("Đã chi");
  await page.getByRole("button", { name: "Tuần này", exact: true }).click();
  await expect(summary).toContainText(/Đã chi tuần này/i);
  await expect(page.getByRole("button", { name: "Tuần này", exact: true })).toHaveAttribute("aria-pressed", "true");

  await page.getByRole("button", { name: "Theo hũ" }).click();
  const rows = page.locator("a[href^='/jars/']");
  expect(await rows.count()).toBeGreaterThan(0);
  await expect(rows.first()).toContainText("% tổng chi");

  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  // Nút xuất CSV không bị gãy chữ thành 2 dòng.
  const csv = page.getByRole("button", { name: "Xuất CSV" });
  expect(((await csv.boundingBox())?.height ?? 0)).toBeLessThan(56);
});
