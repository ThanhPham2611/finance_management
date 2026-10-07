import { describe, expect, it } from "vitest";
import { contributionRows, formatDateTimeVN } from "../src/features/household/model";

describe("formatDateTimeVN", () => {
  it("converts a UTC timestamp to Vietnam time (UTC+7)", () => {
    expect(formatDateTimeVN("2026-10-03T10:05:00Z")).toBe("17:05 03/10");
  });

  it("rolls over to the next day when UTC+7 crosses midnight", () => {
    expect(formatDateTimeVN("2026-10-31T20:30:00Z")).toBe("03:30 01/11");
  });
});

describe("contributionRows", () => {
  const people = [{ userId: "me", name: "Bạn", amount: 3_000_000 }, { userId: "wife", name: "vợ", amount: 2_000_000 }];

  it("shows each member's share of the total", () => {
    const { total, rows } = contributionRows(people, "me", 3_000_000);
    expect(total).toBe(5_000_000);
    expect(rows.map((row) => [row.name, row.pct, row.isMe])).toEqual([["Bạn", 60, true], ["vợ", 40, false]]);
  });

  it("uses the amount being typed for my row", () => {
    const { total, rows } = contributionRows(people, "me", 8_000_000);
    expect(total).toBe(10_000_000);
    expect(rows.map((row) => row.pct)).toEqual([80, 20]);
    expect(rows[0].amount).toBe(8_000_000);
  });

  it("does not divide by zero when nobody has pledged", () => {
    const { total, rows } = contributionRows([{ userId: "me", name: "Bạn", amount: 0 }], "me", 0);
    expect(total).toBe(0);
    expect(rows[0].pct).toBe(0);
  });
});
