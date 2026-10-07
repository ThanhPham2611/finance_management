import { expect, test } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("login", async ({ page }) => {
  await page.goto("/login");
  await expect(page).toHaveScreenshot("login.png", { fullPage: true });
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", await page.locator("html").evaluate((node) => node.clientWidth));
});
