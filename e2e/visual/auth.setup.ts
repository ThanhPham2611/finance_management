import { expect, test as setup } from "@playwright/test";

setup("authenticate visual-test user", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill(process.env.E2E_TEST_EMAIL!);
  await page.getByLabel("Mật khẩu").fill(process.env.E2E_TEST_PASSWORD!);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: "e2e/.auth/visual-user.json" });
});
