import { describe, expect, it } from "vitest";
import { buildCsv, csvFileName } from "../src/features/reports/export";

const row = (over: Partial<{ transactionDate: string; jarName: string; note: string | null; amount: number }> = {}) => ({ transactionDate: "2026-10-05", jarName: "Ăn uống", note: "Phở", amount: 45_000, ...over });

describe("buildCsv", () => {
  it("starts with a BOM so Excel reads Vietnamese, then the header and one line per expense", () => {
    expect(buildCsv([row(), row({ transactionDate: "2026-10-04", note: null, amount: 1_200_000 })])).toBe(
      "﻿Ngày,Hũ,Ghi chú,Số tiền (VND)\n2026-10-05,Ăn uống,Phở,45000\n2026-10-04,Ăn uống,,1200000",
    );
  });

  it("quotes cells with commas, quotes or line breaks instead of corrupting the columns", () => {
    const csv = buildCsv([row({ note: 'Bún, chả "ngon"', jarName: "Nhà, bếp" }), row({ note: "dòng 1\ndòng 2" })]);
    const lines = csv.split("\n");
    expect(lines[1]).toBe('2026-10-05,"Nhà, bếp","Bún, chả ""ngon""",45000');
    expect(lines.slice(2).join("\n")).toContain('"dòng 1\ndòng 2"');
  });

  it("is only the header when there is nothing to export", () => {
    expect(buildCsv([])).toBe("﻿Ngày,Hũ,Ghi chú,Số tiền (VND)");
  });
});

describe("csvFileName", () => {
  it("is named after the day", () => {
    expect(csvFileName("2026-10-05")).toBe("giao-dich-2026-10-05.csv");
  });
});
