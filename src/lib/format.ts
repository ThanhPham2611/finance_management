import { formatMoney, formatSignedMoney, vietnamNow, vietnamToday, VN_TIME_ZONE } from "@hu/domain";

export function formatVND(amount: number): string {
  return formatMoney(amount);
}

export function formatSigned(amount: number): string {
  return formatSignedMoney(amount);
}

/** Moi phep tinh ngay/thang trong app phai neo vao mui gio Viet Nam, KHONG
 * dung gio local cua server: Vercel chay UTC, nen neu dung gio server thi
 * giao dich nhap tu 00:00-07:00 gio VN bi ghi lui 1 ngay, va giao dich
 * ngay mung 1 roi nham vao bucket thang truoc. */
export const VN_TZ = VN_TIME_ZONE;

/** "Bay gio" theo dong ho treo tuong Viet Nam: tra ve 1 Date ma cac truong
 * LOCAL cua no (getFullYear/getMonth/getDate...) da la gio VN. Nho vay moi
 * phep tinh lich san co trong app (new Date(y, m, d), toYMD, parseYMD...)
 * van chay dung nhu cu ma khong phai viet lai. Dung sv-SE vi no cho dinh
 * dang "2026-09-20 15:04:05" — parse lai duoc nhu gio local. */
export function vnNow(): Date {
  return vietnamNow();
}

/** Hom nay theo gio VN, dang "YYYY-MM-DD" (en-CA cho san dinh dang nay).
 * Dung cho cot date trong Postgres — thay cho default `current_date` cua
 * DB, vi DB cung chay UTC. */
export function vnToday(): string {
  return vietnamToday();
}

/** "14:32 13/09" — dung de hien thi thoi diem chi tieu. */
export function formatDateTimeVN(iso: string): string {
  // created_at la timestamptz (UTC) — doi sang gio VN truoc khi doc gio/ngay.
  const d = new Date(new Date(iso).toLocaleString("sv-SE", { timeZone: VN_TZ }));
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  return `${hh}:${mi} ${dd}/${mm}`;
}
