import { describe, expect, it } from "vitest";
import { buildJarPatch, createTransaction, mapJarsWithSpent, normalizeJarForWrite } from "../src/index";

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
