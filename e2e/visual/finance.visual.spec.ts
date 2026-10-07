import { expect, test } from "@playwright/test";

const pages = [
  { path: "/", name: "dashboard" },
  { path: "/transactions", name: "transactions" },
  { path: "/jars", name: "jars" },
  { path: "/reports", name: "reports" },
];

for (const route of pages) {
  test(route.name, async ({ page }) => {
    await page.goto(route.path);
    await page.waitForLoadState("networkidle");
    await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((node) => node.clientWidth));
    await expect(page).toHaveScreenshot(`${route.name}.png`, { fullPage: true });
  });
}
