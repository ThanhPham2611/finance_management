import { test, expect, type Browser, type BrowserContext, type Page } from "@playwright/test";

async function openAs(browser: Browser, storageStatePath: string): Promise<{ context: BrowserContext; page: Page }> {
  const context = await browser.newContext({ storageState: storageStatePath });
  const page = await context.newPage();
  return { context, page };
}

test("A mời B, B từ chối, A mời lại, B chấp nhận và xem được chi tiêu của A", async ({ browser }) => {
  // Nhieu buoc tuan tu tren 2 browser context that (goto + networkidle + server
  // action round-trip moi buoc) — timeout mac dinh 30s qua sat.
  test.setTimeout(60_000);

  const a = await openAs(browser, "e2e/.auth/user.json");
  const b = await openAs(browser, "e2e/.auth/user2.json");
  const emailB = process.env.E2E_TEST_EMAIL_2!;

  try {
    await test.step("cleanup: don dep dong active tu lan chay truoc", async () => {
      await a.page.goto("/shared");
      await a.page.waitForLoadState("networkidle");
      const existingRevoke = a.page.getByRole("button", { name: "Huỷ chia sẻ" }).first();
      if (await existingRevoke.isVisible().catch(() => false)) {
        await existingRevoke.click();
        await a.page.waitForLoadState("networkidle");
      }
    });

    await test.step("1) A moi B", async () => {
      await a.page.getByLabel("Email người bạn muốn chia sẻ").fill(emailB);
      await a.page.getByRole("button", { name: "Gửi lời mời" }).click();
      await expect(a.page.getByText("Đang chờ")).toBeVisible();
    });

    await test.step("2) B thay loi moi va tu choi", async () => {
      await b.page.goto("/shared");
      await b.page.waitForLoadState("networkidle");
      await expect(b.page.getByText("Lời mời đang chờ bạn")).toBeVisible();
      await b.page.getByRole("button", { name: "Từ chối" }).click();
      await expect(b.page.getByRole("button", { name: "Từ chối" })).toHaveCount(0);
    });

    await test.step("3) A moi lai (dong cu duoc reset ve pending, khong loi unique)", async () => {
      await a.page.goto("/shared");
      await a.page.waitForLoadState("networkidle");
      await a.page.getByLabel("Email người bạn muốn chia sẻ").fill(emailB);
      await a.page.getByRole("button", { name: "Gửi lời mời" }).click();
      await expect(a.page.getByText("Đang chờ")).toBeVisible();
    });

    await test.step("4) B chap nhan", async () => {
      await b.page.goto("/shared");
      await b.page.waitForLoadState("networkidle");
      await b.page.getByRole("button", { name: "Chấp nhận" }).click();
      await expect(b.page.getByText("Đang chia sẻ với tôi")).toBeVisible();
    });

    await test.step("5) B bam vao ten A, xem trang chi tieu read-only", async () => {
      // Reload day du (khong chi router.refresh phia client) de xac nhan
      // trang thai accepted da thuc su luu vao DB, khong chi la optimistic
      // UI state. Doi khi co do tre lan truyen ngan (1 nhip) giua luc ghi
      // va luc doc lai qua PostgREST — thu lai vai lan thay vi that bai ngay.
      const ownerLink = b.page.locator('a[href^="/shared/"]').first();
      for (let attempt = 0; attempt < 5 && !(await ownerLink.isVisible().catch(() => false)); attempt++) {
        await b.page.goto("/shared");
        await b.page.waitForLoadState("networkidle");
      }

      // Loc theo href="/shared/..." cu the — getByRole("link") suong se bat
      // trung link "Tong quan" (href="/") o sidebar, dung truoc trong DOM.
      await expect(ownerLink).toBeVisible();
      await ownerLink.click();
      await expect(b.page).toHaveURL(/\/shared\/[0-9a-f-]+/);
      await expect(b.page.getByText(/Chi tiêu của/)).toBeVisible();
    });

    await test.step("cleanup: A huy chia se", async () => {
      await a.page.goto("/shared");
      await a.page.waitForLoadState("networkidle");
      await a.page.getByRole("button", { name: "Huỷ chia sẻ" }).first().click();
    });
  } finally {
    await a.context.close();
    await b.context.close();
  }
});
