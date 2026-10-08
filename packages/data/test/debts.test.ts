import { describe, expect, it } from "vitest";
import { addDebtPayment, archiveDebt, createDebt, deleteDebtPayment, listDebts, mapDebt } from "../src/index";
import { fakeClient } from "./fake-client";

const USER = "22222222-2222-4222-8222-222222222222";
const DEBT = "11111111-1111-4111-8111-111111111111";

describe("mapDebt", () => {
  it("maps columns to the domain shape with payments newest first and numbers as numbers", () => {
    const debt = mapDebt({
      id: DEBT,
      name: "iPhone",
      principal: "12000000" as never,
      term_months: 12,
      start_date: "2026-01-15",
      debt_payments: [
        { id: "p1", debt_id: DEBT, amount: "1000000" as never, paid_on: "2026-02-15" },
        { id: "p2", debt_id: DEBT, amount: 1_000_000, paid_on: "2026-03-15" },
      ],
    });
    expect(debt).toMatchObject({ principal: 12_000_000, termMonths: 12, startDate: "2026-01-15" });
    expect(debt.payments.map((payment) => payment.id)).toEqual(["p2", "p1"]);
    expect(debt.payments[1]?.amount).toBe(1_000_000);
  });
});

describe("debt mutations", () => {
  it("rejects bad input before touching Supabase", async () => {
    const client = new Proxy({}, { get: () => { throw new Error("client should not be read"); } }) as never;
    expect((await createDebt(client, { name: "", principal: 1, termMonths: 1 }, USER)).error?.code).toBe("VALIDATION");
    expect((await createDebt(client, { name: "A", principal: 1, termMonths: 0 }, USER)).error?.code).toBe("VALIDATION");
    expect((await addDebtPayment(client, { debtId: DEBT, amount: 0 }, USER)).error?.code).toBe("VALIDATION");
  });

  it("creates a debt starting today and records payments dated today unless given", async () => {
    const tables: Record<string, Record<string, unknown>[]> = {};
    const client = fakeClient(tables);
    expect(await createDebt(client, { name: " Nợ anh A ", principal: 5_000_000, termMonths: 5 }, USER, "2026-10-07")).toEqual({ data: undefined, error: null });
    expect(tables.debts?.[0]).toEqual({ user_id: USER, name: "Nợ anh A", principal: 5_000_000, term_months: 5, start_date: "2026-10-07" });

    await addDebtPayment(client, { debtId: DEBT, amount: 1_000_000 }, USER, "2026-10-07");
    await addDebtPayment(client, { debtId: DEBT, amount: 500_000, paidOn: "2026-09-30" }, USER, "2026-10-07");
    expect(tables.debt_payments?.map((row) => [row.amount, row.paid_on, row.user_id])).toEqual([[1_000_000, "2026-10-07", USER], [500_000, "2026-09-30", USER]]);
  });

  it("reports an unauthenticated user", async () => {
    const client = { auth: { getUser: async () => ({ data: { user: null }, error: null }) } } as never;
    expect((await createDebt(client, { name: "A", principal: 1, termMonths: 1 })).error?.code).toBe("UNAUTHENTICATED");
  });

  it("archives a debt (soft delete) and surfaces a failed payment delete", async () => {
    const tables = { debts: [{ id: DEBT, is_active: true }], debt_payments: [{ id: "p1" }, { id: "p2" }] };
    expect(await archiveDebt(fakeClient(tables), DEBT)).toEqual({ data: undefined, error: null });
    expect(tables.debts[0]?.is_active).toBe(false);
    const failing = { from: () => ({ delete: () => ({ eq: async () => ({ error: { message: "boom" } }) }) }) } as never;
    expect((await deleteDebtPayment(failing, "p1")).error).toEqual({ code: "SUPABASE", message: "boom" });
  });

  it("lists active debts oldest first and surfaces errors", async () => {
    const rows = [{ id: DEBT, name: "A", principal: 1, term_months: 1, start_date: "2026-10-01", debt_payments: null }];
    const chain: Record<string, unknown> = {};
    for (const name of ["select", "eq"]) chain[name] = () => chain;
    chain.order = async () => ({ data: rows, error: null });
    expect(await listDebts({ from: () => chain } as never)).toEqual([{ id: DEBT, name: "A", principal: 1, termMonths: 1, startDate: "2026-10-01", payments: [] }]);
    chain.order = async () => ({ data: null, error: new Error("boom") });
    await expect(listDebts({ from: () => chain } as never)).rejects.toThrow("boom");
  });
});
