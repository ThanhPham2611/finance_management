import { test, expect, type Page } from "@playwright/test";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function deleteByNote(page: Page, note: string) {
  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note });
  while ((await row.count()) > 0) {
    await row.first().click();
    const deleteButton = page.getByRole("button", { name: "Xoá giao dịch" });
    page.once("dialog", (dialog) => dialog.accept());
    await deleteButton.click();
    await expect(deleteButton).toBeHidden();
  }
}

async function addExpense(page: Page, amount: string, note: string) {
  await page.goto("/transactions/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^Mua sắm/ }).click();
  await page.getByLabel("Nhập số tiền").fill(amount);
  await page.getByLabel("Ghi chú (không bắt buộc)").fill(note);
  await page.getByRole("button", { name: /^Lưu/ }).click();
  await expect(page.getByText("Đã lưu")).toBeVisible();
}

test("gợi ý nhập nhanh: nhập lặp lại 2 lần thì hiện gợi ý, bấm 1 chạm thêm đúng giao dịch", async ({ page }) => {
  const note = `[e2e-quick] ${Date.now()}`;
  try {
    await page.goto("/transactions/new");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: new RegExp(`^Thêm nhanh ${escapeRegExp(note)}`) })).toHaveCount(0);

    await addExpense(page, "3000", note);
    await page.goto("/transactions/new");
    await page.waitForLoadState("networkidle");
    // Mới nhập 1 lần: chưa phải thói quen.
    await expect(page.getByRole("button", { name: new RegExp(`^Thêm nhanh ${escapeRegExp(note)}`) })).toHaveCount(0);

    await addExpense(page, "3000", note);
    await page.goto("/transactions/new");
    await page.waitForLoadState("networkidle");
    const chip = page.getByRole("button", { name: new RegExp(`^Thêm nhanh ${escapeRegExp(note)} 3\\.000 vào`) });
    await expect(chip).toBeVisible();

    await chip.click();
    await expect(page.getByText("Đã lưu")).toBeVisible();

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note })).toHaveCount(3);
  } finally {
    await deleteByNote(page, note);
  }
});

test("ô số tiền kiểu máy tính: 1000+2000*2 ra 5.000, Enter chốt kết quả và lưu đúng số", async ({ page }) => {
  const note = `[e2e-calc] ${Date.now()}`;
  try {
    await page.goto("/transactions/new");
    await page.waitForLoadState("networkidle");
    const amount = page.getByLabel("Nhập số tiền");
    await page.getByRole("button", { name: /^Mua sắm/ }).click();

    await amount.pressSequentially("1000+2000*2");
    await expect(amount).toHaveValue("1.000+2.000×2");
    await expect(page.getByTestId("calc-result")).toHaveText("= 5.000");

    await amount.pressSequentially("-");
    await expect(page.getByTestId("calc-result")).toContainText("chưa hoàn chỉnh");
    await expect(page.getByRole("button", { name: "Lưu", exact: true })).toBeDisabled();
    await amount.press("Backspace");

    await amount.press("Enter");
    await expect(amount).toHaveValue("5.000");
    await expect(page.getByTestId("calc-result")).toHaveCount(0);

    await page.getByLabel("Ghi chú (không bắt buộc)").fill(note);
    await page.getByRole("button", { name: /^Lưu/ }).click();
    await expect(page.getByText("Đã lưu")).toBeVisible();

    await page.goto("/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note })).toContainText("5.000");
  } finally {
    await deleteByNote(page, note);
  }
});

test("viết tắt kiểu Việt trong ô số tiền: 50k, 2tr5, 1,5tr", async ({ page }) => {
  await page.goto("/transactions/new");
  await page.waitForLoadState("networkidle");
  const amount = page.getByLabel("Nhập số tiền");
  const result = page.getByTestId("calc-result");

  await amount.pressSequentially("50k");
  await expect(result).toHaveText("= 50.000");
  await amount.fill("2tr5");
  await expect(result).toHaveText("= 2.500.000");
  await amount.fill("1,5tr+200k");
  await expect(amount).toHaveValue("1,5tr+200k");
  await expect(result).toHaveText("= 1.700.000");
  await expect(page.getByText(/hỗ trợ 50k, 2tr5, 1\+2\+3/)).toHaveCount(0); // đã có số tiền nên gợi ý cách nhập biến mất

  await amount.fill("2tr5k");
  await expect(result).toContainText("chưa hoàn chỉnh");
  await expect(page.getByRole("button", { name: "Lưu", exact: true })).toBeDisabled();

  await page.getByRole("button", { name: "Xoá", exact: true }).click();
  await expect(page.getByText(/hỗ trợ 50k, 2tr5, 1\+2\+3/)).toBeVisible();
});
