import { describe, expect, it } from "vitest";
import { JAR_COLORS } from "@hu/domain";
import { fakeClient } from "./fake-client";
import { buildJarPatch, createJars, createTransaction, listTransactionsForJar, mapJarsWithSpent, mapTransactionWithJar, normalizeJarForWrite } from "../src/index";

const USER_ID = "22222222-2222-4222-8222-222222222222";
const JAR_ID = "11111111-1111-4111-8111-111111111111";

describe("jar data mapping", () => {
  it("subtracts deposits from monthly spending", () => {
    const jars = mapJarsWithSpent(
      [
        {
          id: JAR_ID,
          name: "Mua nhà",
          icon: "house",
          color: "#174C3C",
          monthly_budget: 5_000_000,
          is_shared: false,
          alert_at_80: false,
          rollover: true,
          is_savings: true,
        },
      ],
      [
        { jar_id: JAR_ID, amount: 300_000, type: "expense" },
        { jar_id: JAR_ID, amount: 1_000_000, type: "deposit" },
      ],
    );

    expect(jars[0]?.spent).toBe(-700_000);
  });

  it("forces rollover and disables threshold alerts for savings jars", () => {
    expect(
      normalizeJarForWrite({
        name: "Mua nhà",
        icon: "house",
        color: "#174C3C",
        monthlyBudget: 5_000_000,
        alertAt80: true,
        rollover: false,
        isSavings: true,
      }),
    ).toMatchObject({ alert_at_80: false, rollover: true, is_savings: true });
  });

  it("does not overwrite a shared jar budget or turn it into savings", () => {
    expect(
      buildJarPatch(
        {
          id: JAR_ID,
          name: "  Gia đình  ",
          monthlyBudget: 9_000_000,
          alertAt80: true,
          rollover: true,
          isSavings: true,
        },
        true,
      ),
    ).toEqual({ name: "Gia đình", alert_at_80: true, rollover: true, is_savings: false });
  });
});

describe("transaction mutations", () => {
  it("rejects invalid input before touching Supabase", async () => {
    const client = new Proxy({}, { get: () => { throw new Error("client should not be read"); } });
    const result = await createTransaction(client as never, { jarId: JAR_ID, amount: 0, note: "", type: "expense" });
    expect(result).toEqual({ data: null, error: { code: "VALIDATION", message: "Số tiền phải lớn hơn 0." } });
  });

  it("writes the authenticated user and explicit Vietnam date", async () => {
    let inserted: Record<string, unknown> | undefined;
    const client = {
      auth: { getUser: async () => ({ data: { user: { id: USER_ID } }, error: null }) },
      from(table: string) {
        if (table === "jars") {
          return {
            select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: JAR_ID }, error: null }) }) }),
          };
        }
        return {
          insert: async (row: Record<string, unknown>) => {
            inserted = row;
            return { error: null };
          },
        };
      },
    };

    const result = await createTransaction(
      client as never,
      { jarId: JAR_ID, amount: 125_000, note: "  Ăn trưa  ", type: "expense" },
      "2026-09-30",
    );

    expect(result).toEqual({ data: undefined, error: null });
    expect(inserted).toEqual({
      user_id: USER_ID,
      jar_id: JAR_ID,
      amount: 125_000,
      note: "Ăn trưa",
      type: "expense",
      transaction_date: "2026-09-30",
    });
  });
});

describe("color safety on read", () => {
  it("replaces colors React Native cannot draw (web used to store oklch)", () => {
    const [jar] = mapJarsWithSpent(
      [{ id: JAR_ID, name: "Ăn uống", icon: "utensils", color: "oklch(0.55 0.12 40)", monthly_budget: 1, is_shared: false, alert_at_80: true, rollover: false, is_savings: false }],
      [],
    );
    expect(jar?.color).toBe("#9A5B13");

    const tx = mapTransactionWithJar({ id: "t", jar_id: JAR_ID, amount: 1, note: null, transaction_date: "2026-10-01", user_id: USER_ID, type: "expense", jars: { name: "Ăn uống", icon: null, color: "var(--color-accent)" } });
    expect(tx.jarColor).toBe("#9A5B13");
  });
});

describe("listTransactionsForJar", () => {
  it("returns the newest transactions of one jar, mapped to the domain shape", async () => {
    const calls: Record<string, unknown[]> = {};
    const chain = {
      select: (cols: string) => ((calls.select = [cols]), chain),
      eq: (col: string, value: string) => ((calls.eq = [col, value]), chain),
      order: (col: string, opts: object) => ((calls.order = [...(calls.order ?? []), col, opts]), chain),
      limit: async (n: number) => ((calls.limit = [n]), { data: [{ id: "t1", jar_id: JAR_ID, amount: "50000", note: "Phở", transaction_date: "2026-10-05", user_id: USER_ID, type: "expense" }], error: null }),
    };
    const rows = await listTransactionsForJar({ from: () => chain } as never, JAR_ID);

    expect(rows).toEqual([{ id: "t1", jarId: JAR_ID, amount: 50_000, note: "Phở", transactionDate: "2026-10-05", userId: USER_ID, type: "expense" }]);
    expect(calls.eq).toEqual(["jar_id", JAR_ID]);
    expect(calls.limit).toEqual([30]);
    expect(calls.order?.filter((value) => typeof value === "string")).toEqual(["transaction_date", "created_at"]);
  });

  it("surfaces Supabase errors instead of returning an empty list", async () => {
    const chain: Record<string, unknown> = {};
    for (const name of ["select", "eq", "order"]) chain[name] = () => chain;
    chain.limit = async () => ({ data: null, error: new Error("boom") });
    await expect(listTransactionsForJar({ from: () => chain } as never, JAR_ID)).rejects.toThrow("boom");
  });
});

describe("createJars colors", () => {
  const input = (name: string, color?: string) => ({ name, monthlyBudget: 1_000_000, icon: "wallet", ...(color ? { color } : {}) });

  it("gives every new jar its own color: keeps a free one, replaces taken or missing ones", async () => {
    const tables = { jars: [{ id: "old", color: JAR_COLORS[0], is_active: true }] };
    const result = await createJars(fakeClient(tables), [input("A", JAR_COLORS[0]), input("B", JAR_COLORS[5]), input("C"), input("D")], USER_ID);

    expect(result).toEqual({ data: undefined, error: null });
    const colors = tables.jars.slice(1).map((row) => row.color);
    expect(colors[1]).toBe(JAR_COLORS[5]);
    expect(new Set([JAR_COLORS[0], ...colors]).size).toBe(5);
  });

  it("does not hand out a color that an inactive jar used", async () => {
    const tables = { jars: [{ id: "gone", color: JAR_COLORS[0], is_active: false }] };
    await createJars(fakeClient(tables), [input("A")], USER_ID);
    expect(tables.jars[1]?.color).toBe(JAR_COLORS[0]);
  });
});
