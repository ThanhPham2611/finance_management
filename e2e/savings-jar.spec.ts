import { test, expect } from "@playwright/test";

test("hũ tiết kiệm: hướng dẫn khi tạo, không tính vào tổng còn lại, cảnh báo khi rút, nạp tiền tăng số dư", async ({ page }) => {
  const jarName = `[e2e-temp] Tiết kiệm ${Date.now()}`;

  // So sanh tong truoc/sau khi tao hu tiet kiem — phai KHONG doi, vi hu
  // tiet kiem khong duoc tinh vao "Tong ngan sach/tháng" (/jars) hay "Con
  // lai" (trang chu).
  await page.goto("/jars");
  await page.waitForLoadState("networkidle");
  const budgetBefore = await page.getByText("Tổng ngân sách/tháng").locator("..").innerText();

  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const remainingAmount = page.getByText("Còn lại", { exact: true }).locator("xpath=following-sibling::*[1]");
  const remainingBefore = await remainingAmount.innerText();

  // --- Tao hu, danh dau tiet kiem, thay banner huong dan ---
  await page.goto("/jars/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Tự đặt tên" }).click();
  await page.getByRole("button", { name: "Tiếp tục" }).click();

  await page.getByPlaceholder("Tên hũ 1").fill(jarName);
  await page.getByRole("button", { name: /Đánh dấu là hũ tiết kiệm/ }).click();
  await expect(page.getByText(/cộng dồn qua các tháng/).first()).toBeVisible();

  await page.getByRole("button", { name: /^Lưu 1 hũ$/ }).click();
  await expect(page.getByText("Đã tạo 1 hũ")).toBeVisible();
  await page.getByRole("link", { name: "Về danh sách hũ" }).click();

  // --- Danh sach hu: nhan "(tiết kiệm)", tong khong doi ---
  await page.waitForLoadState("networkidle");
  const row = page.locator('a[href^="/jars/"]').filter({ hasText: jarName }).first();
  await expect(row).toContainText("tiết kiệm");
  const budgetAfter = await page.getByText("Tổng ngân sách/tháng").locator("..").innerText();
  expect(budgetAfter).toBe(budgetBefore);

  await row.click();
  await expect(page).toHaveURL(/\/jars\/[0-9a-f-]+$/);
  const jarId = page.url().split("/jars/")[1];

  // --- Trang chi tiet: khung "Đã tiết kiệm được", 2 nut Nhập chi/Nạp tiền ---
  await expect(page.getByText("Đã tiết kiệm được")).toBeVisible();
  await expect(page.getByText("Còn được chi")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Nhập chi" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Nhập thu" })).toBeVisible();

  // --- Ghi 1 khoan chi (rut) — phai hoi xac nhan truoc khi luu ---
  await page.goto(`/transactions/new?jar=${jarId}`);
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Nhập số tiền").fill("10000");
  await page.getByRole("button", { name: /^Lưu/ }).click();
  await expect(page.getByText(/sắp rút tiền từ hũ tiết kiệm/)).toBeVisible();
  await expect(page.getByText("Đã lưu")).toHaveCount(0);
  await page.getByRole("button", { name: /^Xác nhận rút/ }).click();
  await expect(page.getByText("Đã lưu")).toBeVisible();

  // --- Nap tien — khong can xac nhan gi ---
  await page.goto(`/jars/${jarId}`);
  await page.waitForLoadState("networkidle");
  await page.getByRole("link", { name: "Nhập thu" }).click();
  await expect(page).toHaveURL(new RegExp(`/transactions/new\\?jar=${jarId}&type=deposit`));
  await page.getByLabel("Nhập số tiền").fill("20000");
  await page.getByRole("button", { name: /Thu .+ vào/ }).click();
  await expect(page.getByText("Đã thu")).toBeVisible();

  // --- Quay lai trang chi tiet: so du tang dung, dong giao dich nap co dau + ---
  await page.goto(`/jars/${jarId}`);
  await page.waitForLoadState("networkidle");
  // Chi 10.000 - nap 20.000 = da tiet kiem duoc 10.000 (tinh tu 0).
  await expect(page.getByText("10.000").first()).toBeVisible();
  await expect(page.getByText(/\+20\.000/)).toBeVisible();

  // --- Trang chu: xuat hien dong "Đã tiết kiệm được ... qua", "Còn lại" khong doi ---
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  const remainingAfter = await page.getByText("Còn lại", { exact: true }).locator("xpath=following-sibling::*[1]").innerText();
  expect(remainingAfter).toBe(remainingBefore);
  await expect(page.getByText(/Đã tiết kiệm được .* qua/)).toBeVisible();

  // --- Don dep: xoa hu tam ---
  await page.goto(`/jars/${jarId}/edit`);
  await page.waitForLoadState("networkidle");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Xoá hũ" }).click();
  await expect(page).toHaveURL("/jars");
});
