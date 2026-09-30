import { test as setup, expect } from "@playwright/test";

const authFile = "e2e/.auth/user2.json";

setup("authenticate as second user", async ({ page }) => {
  const email = process.env.E2E_TEST_EMAIL_2;
  const password = process.env.E2E_TEST_PASSWORD_2;
  if (!email || !password) {
    throw new Error("Thiếu E2E_TEST_EMAIL_2 / E2E_TEST_PASSWORD_2 trong .env.local");
  }

  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Mật khẩu").fill(password);
  await page.getByRole("button", { name: "Đăng nhập" }).click();
  await page.waitForLoadState("networkidle");

  // Lan chay dau tien tai khoan thu 2 co the chua ton tai — dang nhap that
  // bai se redirect ve /login?error=..., luc do tu dang ky roi vao lai.
  if (new URL(page.url()).searchParams.has("error")) {
    await page.goto("/signup");
    await page.getByLabel("Họ tên").fill("Người dùng thử 2");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Mật khẩu").fill(password);
    await page.getByRole("button", { name: "Đăng ký" }).click();
  }

  await expect(page).toHaveURL("/");
  await page.context().storageState({ path: authFile });
});
