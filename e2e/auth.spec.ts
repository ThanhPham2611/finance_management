import { test, expect } from "@playwright/test";

test.use({ storageState: { cookies: [], origins: [] } });

test("chưa đăng nhập vào / bị chuyển về /login", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/login$/);
});

test("chưa đăng nhập vào route con trong (app) cũng bị chuyển về /login", async ({ page }) => {
  await page.goto("/transactions");
  await expect(page).toHaveURL(/\/login$/);
});

test("nút Đăng nhập hiện trạng thái pending khi bấm, rồi vào dashboard", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) throw new Error("Thiếu E2E_TEST_EMAIL / E2E_TEST_PASSWORD trong .env.local");

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);

  const button = page.getByRole("button", { name: "Đăng nhập" });
  await button.click();
  await expect(button).toBeDisabled();

  await expect(page).toHaveURL("/");
});
