import { test, expect } from "@playwright/test";

test("mời email không tồn tại báo lỗi", async ({ page }) => {
  await page.goto("/shared");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email người bạn muốn chia sẻ").fill("khong-ton-tai-xyz@example.com");
  await page.getByRole("button", { name: "Gửi lời mời" }).click();
  await expect(page.getByText("Khong tim thay nguoi dung voi email nay.")).toBeVisible();
});

test("tự mời chính mình báo lỗi", async ({ page }) => {
  await page.goto("/shared");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Email người bạn muốn chia sẻ").fill(process.env.E2E_TEST_EMAIL!);
  await page.getByRole("button", { name: "Gửi lời mời" }).click();
  await expect(page.getByText("Ban khong the tu chia se cho chinh minh.")).toBeVisible();
});
