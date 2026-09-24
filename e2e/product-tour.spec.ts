import { test, expect } from "@playwright/test";

test("bước 1 của tour hiện thẻ ở giữa màn hình, không dồn về góc trên-trái", async ({ page }) => {
  await page.goto("/?tour=1");

  const card = page.getByText("Chào mừng đến với Hũ");
  await expect(card).toBeVisible();

  const box = await card.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();

  const centerX = box!.x + box!.width / 2;
  const centerY = box!.y + box!.height / 2;

  // Neu bug quay lai (style={rect ? tooltipStyle : undefined}), the se dong
  // o goc tren-trai (gan 0,0) thay vi giua man hinh.
  expect(centerX).toBeGreaterThan(viewport!.width * 0.25);
  expect(centerY).toBeGreaterThan(viewport!.height * 0.25);
});

test("bấm Esc đóng tour", async ({ page }) => {
  await page.goto("/?tour=1");
  await expect(page.getByText("Chào mừng đến với Hũ")).toBeVisible();
  // Chu Escape ngay sau goto() de rieng cho hydration: chu "Chao mung" da co
  // san trong HTML server-render nen toBeVisible() qua ngay, nhung useEffect
  // gan window keydown listener trong ProductTour chi chay SAU khi React
  // hydrate xong. Bam phim truoc thoi diem do se bi "roi" vinh vien (phim
  // rieng le, khong co listener nao bat). Doi mang ranh (hydration + cac
  // request prefetch cua app-shell da xong) truoc khi bam de test dung.
  await page.waitForLoadState("networkidle");
  await page.keyboard.press("Escape");
  await expect(page.getByText("Chào mừng đến với Hũ")).not.toBeVisible();
});

test("có thể bước hết tour bằng nút Tiếp theo/Bắt đầu dùng Hũ", async ({ page }) => {
  await page.goto("/?tour=1");
  const dialog = page.getByRole("dialog", { name: "Hướng dẫn sử dụng" });
  await expect(dialog).toBeVisible();

  for (let i = 0; i < 6 && (await dialog.isVisible()); i++) {
    await dialog.getByRole("button", { name: /Tiếp theo|Bắt đầu dùng Hũ/ }).click();
  }

  await expect(dialog).not.toBeVisible();
});
