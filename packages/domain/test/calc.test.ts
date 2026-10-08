import { describe, expect, it } from "vitest";
import { amountFromExpression, evaluateExpression, formatExpression, isCalculation, sanitizeExpression } from "../src/index";

describe("evaluateExpression", () => {
  it("adds, subtracts, multiplies and divides with the usual precedence", () => {
    expect(evaluateExpression("1+2+3")).toBe(6);
    expect(evaluateExpression("50000*2-1000")).toBe(99_000);
    expect(evaluateExpression("2+3*4")).toBe(14);
    expect(evaluateExpression("(2+3)*4")).toBe(20);
    expect(evaluateExpression("100/4")).toBe(25);
    expect(evaluateExpression("20000/3*3")).toBe(20_000);
  });

  it("accepts the thousand separators and operator spellings people actually type", () => {
    expect(evaluateExpression("1.000 + 2.000")).toBe(3_000);
    expect(evaluateExpression("2x3")).toBe(6);
    expect(evaluateExpression("2×3")).toBe(6);
    expect(evaluateExpression("100÷4")).toBe(25);
    expect(evaluateExpression("100:4")).toBe(25);
    expect(evaluateExpression("5−2")).toBe(3);
    expect(evaluateExpression("1.600.000")).toBe(1_600_000);
  });

  it("rounds to whole đồng", () => {
    expect(evaluateExpression("10/4")).toBe(3);
    expect(evaluateExpression("10/3")).toBe(3);
  });

  it("supports unary minus and keeps negatives for the caller to reject", () => {
    expect(evaluateExpression("-5+2")).toBe(-3);
    expect(evaluateExpression("3*-2")).toBe(-6);
    expect(evaluateExpression("+7")).toBe(7);
  });

  it("returns null for anything unfinished, malformed, undefined or absurdly large", () => {
    for (const bad of ["", " ", "abc", "1+", "*3", "1++", "(1+2", "1+2)", "()", "2(3)", "1/0", "5/(2-2)", "999999999999+1", "99999999999*99999999999"]) {
      expect(evaluateExpression(bad), bad).toBeNull();
    }
  });
});

describe("Vietnamese shorthand", () => {
  it("k is nghìn and tr is triệu, in any case and inside calculations", () => {
    expect(evaluateExpression("50k")).toBe(50_000);
    expect(evaluateExpression("2tr")).toBe(2_000_000);
    expect(evaluateExpression("2TR")).toBe(2_000_000);
    expect(evaluateExpression("50K+30k")).toBe(80_000);
    expect(evaluateExpression("2tr*3")).toBe(6_000_000);
    expect(evaluateExpression("(1tr-200k)/2")).toBe(400_000);
    expect(evaluateExpression("1.000k")).toBe(1_000_000);
  });

  it("digits right after the unit are the fraction: 2tr5 = 2,5 triệu, 1k5 = 1.500", () => {
    expect(evaluateExpression("2tr5")).toBe(2_500_000);
    expect(evaluateExpression("2tr05")).toBe(2_050_000);
    expect(evaluateExpression("2tr500")).toBe(2_500_000);
    expect(evaluateExpression("1k5")).toBe(1_500);
    expect(evaluateExpression("1k25")).toBe(1_250);
    expect(evaluateExpression("1k500")).toBe(1_500);
  });

  it("comma is the decimal mark, dot stays a thousand separator", () => {
    expect(evaluateExpression("1,5tr")).toBe(1_500_000);
    expect(evaluateExpression("2,25tr")).toBe(2_250_000);
    expect(evaluateExpression("0,5k")).toBe(500);
    expect(evaluateExpression("10,5*2")).toBe(21);
    // Quy ước của app: dấu chấm là hàng nghìn nên `1.5tr` là 15tr; dòng kết quả luôn hiện giá trị đã hiểu.
    expect(evaluateExpression("1.5tr")).toBe(15_000_000);
  });

  it("understands 'triệu' typed out and rejects ambiguous or broken shorthand", () => {
    expect(sanitizeExpression("5 triệu")).toBe("5tr");
    expect(evaluateExpression("5 triệu")).toBe(5_000_000);
    for (const bad of ["k", "tr", "5kk", "5k5k", "2t", "3r", "1,5tr5", "1,000,000", "1,", ",5", "1000000tr"]) {
      expect(evaluateExpression(bad), bad).toBeNull();
    }
  });
});

describe("amountFromExpression", () => {
  it("is the result when positive, otherwise 0 so Save stays disabled", () => {
    expect(amountFromExpression("2+3")).toBe(5);
    expect(amountFromExpression("50k")).toBe(50_000);
    expect(amountFromExpression("1-5")).toBe(0);
    expect(amountFromExpression("0")).toBe(0);
    expect(amountFromExpression("1+")).toBe(0);
    expect(amountFromExpression("")).toBe(0);
  });
});

describe("formatExpression / sanitizeExpression / isCalculation", () => {
  it("groups each number and prints × ÷, and round-trips through sanitize", () => {
    expect(formatExpression("1000+2000*3")).toBe("1.000+2.000×3");
    expect(formatExpression("007")).toBe("7");
    expect(formatExpression("1600000")).toBe("1.600.000");
    expect(formatExpression("")).toBe("");
    const shown = formatExpression("1000000/4-2500");
    expect(sanitizeExpression(shown)).toBe("1000000/4-2500");
    expect(evaluateExpression(shown)).toBe(247_500);
  });

  it("keeps the comma decimal and the units readable", () => {
    expect(formatExpression("1000,5k")).toBe("1.000,5k");
    expect(formatExpression("2tr500+1500k")).toBe("2tr500+1.500k");
    expect(formatExpression("1,")).toBe("1,");
    expect(formatExpression("007,50")).toBe("7,50");
    expect(evaluateExpression(formatExpression("2tr5+1.000k"))).toBe(3_500_000);
  });

  it("tells a plain number from a calculation or shorthand", () => {
    expect(isCalculation("1.600.000")).toBe(false);
    expect(isCalculation("")).toBe(false);
    expect(isCalculation("1+2")).toBe(true);
    expect(isCalculation("2x3")).toBe(true);
    expect(isCalculation("50k")).toBe(true);
    expect(isCalculation("1,5")).toBe(true);
  });
});
