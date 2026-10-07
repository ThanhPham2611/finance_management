import type { TransactionWithJar } from "@hu/data";

const HEADER = ["Ngày", "Hũ", "Ghi chú", "Số tiền (VND)"];

/** Ô CSV an toàn: bọc trong ngoặc kép khi có dấu phẩy, ngoặc kép hoặc xuống dòng (web chỉ thay dấu phẩy trong ghi chú bằng khoảng trắng). */
const cell = (value: string) => (/[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value);

/** CSV các khoản chi, có BOM để Excel đọc đúng tiếng Việt. */
export function buildCsv(rows: Pick<TransactionWithJar, "transactionDate" | "jarName" | "note" | "amount">[]): string {
  const lines = rows.map((row) => [row.transactionDate, row.jarName, row.note ?? "", String(row.amount)].map(cell).join(","));
  return `﻿${[HEADER.join(","), ...lines].join("\n")}`;
}

export const csvFileName = (today: string) => `giao-dich-${today}.csv`;
