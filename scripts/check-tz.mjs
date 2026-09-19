// Self-check cho mui gio Viet Nam (src/lib/format.ts).
// Chay: node scripts/check-tz.mjs
// Va chay lai duoi mui gio server khac de chac chan ket qua KHONG doi:
//   TZ=UTC node scripts/check-tz.mjs
//   TZ=America/New_York node scripts/check-tz.mjs
import assert from "node:assert/strict";
import { VN_TZ, vnNow, vnToday, formatDateTimeVN } from "../src/lib/format.ts";

// 1. Doc dung gio VN tu 1 moc UTC co dinh — day la ca bug cu: 18:30Z ngay
//    13/09 la 01:30 SANG NGAY 14/09 o VN, khong phai toi 13/09.
assert.equal(formatDateTimeVN("2026-09-13T18:30:00Z"), "01:30 14/09");
// Va buoi trua thi khong bi nhay ngay.
assert.equal(formatDateTimeVN("2026-09-13T05:00:00Z"), "12:00 13/09");

// 2. vnToday() phai khop voi thu Intl noi ve mui gio VN, bat ke TZ cua server.
const viaIntl = new Intl.DateTimeFormat("en-CA", {
  timeZone: VN_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
assert.equal(vnToday(), viaIntl);

// 3. vnNow() va vnToday() phai noi cung 1 ngay — moi phep tinh lich trong
//    app deu dua tren vnNow(), con ngay ghi vao DB lay tu vnToday().
const n = vnNow();
const fromVnNow = `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
assert.equal(fromVnNow, vnToday());

console.log(`OK — TZ=${process.env.TZ ?? "(he thong)"} -> hom nay o VN la ${vnToday()}`);
