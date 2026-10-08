import { test, expect } from "@playwright/test";

test("2 tính năng đã bỏ không còn trong menu và trả 404 khi vào thẳng URL", async ({ page }) => {
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  for (const label of ["Thành tích", "What-if"]) {
    await expect(page.getByRole("link", { name: label })).toHaveCount(0);
  }

  for (const path of ["/achievements", "/simulator"]) {
    const response = await page.goto(path);
    expect(response?.status(), `${path} phải trả 404`).toBe(404);
  }
});

test("hũ gia đình hiện riêng kèm nhãn (gia đình) và click vào mở đúng trang chi tiết hũ", async ({ page }) => {
  await page.goto("/jars");
  await page.waitForLoadState("networkidle");

  // Hu gia dinh phai la 1 dong rieng, ten co hau to "(gia đình)" — khong con
  // bi gop thanh 1 dong ao "Hũ gia đình" nhu truoc.
  const familyJarRow = page.locator('a[href^="/jars/"]').filter({ hasText: "(gia đình)" }).first();
  await expect(familyJarRow).toBeVisible();
  const familyJarName = (await familyJarRow.innerText()).split("\n")[0];

  await familyJarRow.click();
  // Phai vao trang chi tiet hu that (/jars/<uuid>), khong nhay sang /household.
  await expect(page).toHaveURL(/\/jars\/[0-9a-f-]+$/);
  await expect(page.getByText("Quỹ chung")).toBeVisible();
  await expect(page.getByText("Giao dịch trong hũ")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(familyJarName.replace(" (gia đình)", ""));
});

test("trang giao dịch tách riêng đã chi cá nhân và gia đình", async ({ page }) => {
  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  const main = page.locator("main");
  await expect(main.getByText("Đã chi tháng này")).toBeVisible();
  // Scope vao <main> vi sidebar desktop cung co link "Gia đình" trung chu.
  await expect(main.getByText("Cá nhân", { exact: true })).toBeVisible();
  await expect(main.getByText("Gia đình", { exact: true })).toBeVisible();
});

test("trang gia đình: thành viên là mình hiện 'Bạn', khối mời/tham gia thu gọn mặc định", async ({ page }) => {
  await page.goto("/household");
  await page.waitForLoadState("networkidle");

  await expect(page.locator("main").getByText("Bạn", { exact: true }).first()).toBeVisible();

  const inviteToggle = page.getByText("Mời hoặc tham gia gia đình");
  await expect(inviteToggle).toBeVisible();
  const inviteButton = page.getByRole("button", { name: "Tạo mã mời" });
  await expect(inviteButton).not.toBeVisible();
  await inviteToggle.click();
  await expect(inviteButton).toBeVisible();
});

test("tạo giao dịch rồi xoá — chỉ giao dịch của chính mình mới xoá được", async ({ page }) => {
  const note = `[e2e-temp] ${Date.now()}`;

  await page.goto("/transactions/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^Mua sắm/ }).click();
  await page.getByLabel("Nhập số tiền").fill("1000");
  await page.getByLabel("Ghi chú (không bắt buộc)").fill(note);
  await page.getByRole("button", { name: /^Lưu/ }).click();
  await expect(page.getByText(`Đã lưu`)).toBeVisible();

  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note });
  await expect(row).toBeVisible();
  await row.click();

  const deleteButton = page.getByRole("button", { name: "Xoá giao dịch" });
  await expect(deleteButton).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  // Dong nay dang o che do sua (note nam trong value cua <input>, khong con
  // la text node) nen khong the cho no bien mat khoi text — phai cho chinh
  // nut Xoá bien mat, dau hieu that su cho biet router.refresh() sau khi
  // server action xoa xong da ve va React da go ca dong nay khoi danh sach.
  await expect(deleteButton).toBeHidden();

  // Load lai tu server (khong chi dua vao client state) de xac nhan da xoa
  // that trong DB, khong phai chi optimistic UI.
  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText(note)).toHaveCount(0);
});

test("tìm giao dịch theo ghi chú, xoá lọc khi không khớp, và xem tháng trước", async ({ page }) => {
  const note = `[e2e-search] ${Date.now()}`;

  await page.goto("/transactions/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: /^Mua sắm/ }).click();
  await page.getByLabel("Nhập số tiền").fill("1000");
  await page.getByLabel("Ghi chú (không bắt buộc)").fill(note);
  await page.getByRole("button", { name: /^Lưu/ }).click();
  await expect(page.getByText("Đã lưu")).toBeVisible();

  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  const search = page.getByLabel("Tìm giao dịch");
  const row = page.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note });
  await search.fill(note);
  await expect(row).toBeVisible();

  await search.fill("zzzz-khong-khop");
  await expect(page.getByText("Không có giao dịch khớp")).toBeVisible();
  await expect(row).toHaveCount(0);

  await page.getByRole("button", { name: "Xoá lọc" }).click();
  await expect(row).toBeVisible();

  const heading = page.getByRole("heading", { level: 1 });
  const before = await heading.innerText();
  await page.getByRole("link", { name: "Tháng trước" }).click();
  await expect(heading).not.toHaveText(before);
  await expect(page).toHaveURL(/month=\d{4}-\d{2}/);

  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  await page.getByLabel("Tìm giao dịch").fill(note);
  await row.click();
  const deleteButton = page.getByRole("button", { name: "Xoá giao dịch" });
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(deleteButton).toBeHidden();
});

test("khoản thu cộng vào hũ chi tiêu thường và hiện dấu cộng", async ({ page }) => {
  const note = `[e2e-thu] ${Date.now()}`;

  await page.goto("/transactions/new");
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "Thu", exact: true }).click();
  await page.getByRole("button", { name: /^Mua sắm/ }).click();
  await page.getByLabel("Nhập số tiền").fill("1000");
  await page.getByLabel("Ghi chú (không bắt buộc)").fill(note);
  await page.getByRole("button", { name: /Thu .+ vào/ }).click();
  await expect(page.getByText("Đã thu")).toBeVisible();

  await page.goto("/transactions");
  await page.waitForLoadState("networkidle");
  const row = page.getByRole("button", { name: "Sửa giao dịch" }).filter({ hasText: note });
  await expect(row).toBeVisible();
  await expect(row).toContainText("+1.000");

  await row.click();
  await expect(page.getByRole("button", { name: "Thu", exact: true, pressed: true })).toBeVisible();
  const deleteButton = page.getByRole("button", { name: "Xoá giao dịch" });
  page.once("dialog", (dialog) => dialog.accept());
  await deleteButton.click();
  await expect(deleteButton).toBeHidden();
});
