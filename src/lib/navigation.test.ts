import { describe, expect, it } from "vitest";
import { desktopNavigation, mobileNavigation, moreNavigation } from "./navigation";

describe("responsive information architecture", () => {
  it("keeps the five primary mobile destinations predictable", () => {
    expect(mobileNavigation.map((item) => item.label)).toEqual(["Tổng quan", "Hũ", "Giao dịch", "Báo cáo", "Thêm"]);
  });

  it("moves secondary finance and account destinations into More", () => {
    expect(moreNavigation.map((item) => item.href)).toEqual(["/allocate", "/household", "/shared", "/more#account"]);
  });

  it("keeps every product destination visible on desktop", () => {
    expect(desktopNavigation.map((item) => item.href)).toEqual(["/", "/jars", "/transactions", "/allocate", "/reports", "/household", "/shared"]);
  });
});
