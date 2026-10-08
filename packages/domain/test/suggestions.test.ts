import { describe, expect, it } from "vitest";
import { suggestTransactions } from "../src/index";

const tx = (over: Partial<Parameters<typeof suggestTransactions>[0][number]> = {}) => ({ jarId: "move", amount: 3_000, note: "Gửi xe", type: "expense" as const, transactionDate: "2026-10-01", ...over });

describe("suggestTransactions", () => {
  it("suggests transactions entered at least twice, and ignores one-offs", () => {
    const out = suggestTransactions([tx(), tx({ transactionDate: "2026-10-02" }), tx({ amount: 45_000, note: "Phở" })]);
    expect(out).toEqual([{ jarId: "move", amount: 3_000, type: "expense", note: "Gửi xe", count: 2, lastDate: "2026-10-02" }]);
  });

  it("treats notes case- and space-insensitively but keeps different amounts, jars and types apart", () => {
    const out = suggestTransactions([
      tx({ note: "gửi xe" }), tx({ note: "  Gửi   xe " }),
      tx({ amount: 5_000 }), tx({ amount: 5_000 }),
      tx({ jarId: "food" }), tx({ jarId: "food" }),
      tx({ type: "deposit" }), tx({ type: "deposit" }),
    ]);
    expect(out).toHaveLength(4);
    expect(out.every((s) => s.count === 2)).toBe(true);
  });

  it("ranks by how often, then by most recent, and shows the latest spelling of the note", () => {
    const out = suggestTransactions([
      tx({ note: "cà phê", amount: 30_000, transactionDate: "2026-10-05" }), tx({ note: "cà phê", amount: 30_000, transactionDate: "2026-10-06" }),
      tx({ note: "gửi xe", transactionDate: "2026-09-01" }), tx({ note: "Gửi xe", transactionDate: "2026-09-02" }), tx({ note: "GỬI XE", transactionDate: "2026-09-03" }),
      tx({ note: "xăng", amount: 50_000, transactionDate: "2026-10-07" }), tx({ note: "xăng", amount: 50_000, transactionDate: "2026-10-01" }),
    ]);
    expect(out.map((s) => s.note)).toEqual(["GỬI XE", "xăng", "cà phê"]);
  });

  it("works for notes left empty, skips non-positive amounts, and respects limit/minCount", () => {
    expect(suggestTransactions([tx({ note: null }), tx({ note: "" })])[0]).toMatchObject({ note: "", count: 2 });
    expect(suggestTransactions([tx({ amount: 0 }), tx({ amount: 0 })])).toEqual([]);
    const many = ["a", "b", "c"].flatMap((note) => [tx({ note }), tx({ note })]);
    expect(suggestTransactions(many, { limit: 2 })).toHaveLength(2);
    expect(suggestTransactions([tx(), tx()], { minCount: 3 })).toEqual([]);
    expect(suggestTransactions([tx()], { minCount: 1 })).toHaveLength(1);
  });
});
