import { describe, expect, it } from "vitest";
import { financeInvalidationKeys, financeKeys } from "../src/features/finance/query-keys";

describe("finance query keys", () => {
  it("exposes stable prefixes", () => {
    expect(financeKeys.jars).toEqual(["finance", "jars"]);
    expect(financeKeys.transactions).toEqual(["finance", "transactions"]);
    expect(financeKeys.reports).toEqual(["finance", "reports"]);
    expect(financeKeys.shares).toEqual(["finance", "shares"]);
  });

  it("invalidates every prefix exactly once", () => {
    expect(financeInvalidationKeys).toEqual([financeKeys.jars, financeKeys.transactions, financeKeys.reports]);
    expect(new Set(financeInvalidationKeys.map((key) => key.join("/"))).size).toBe(3);
    expect(financeInvalidationKeys).not.toContain(financeKeys.shares);
  });
});
