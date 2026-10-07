import { describe, expect, it } from "vitest";
import { applyAllocation, getMyFamilyContributionTotal } from "../src/index";

type Op = { table: string; op: string; payload?: unknown; filters?: unknown[] };

/** Client giả ghi lại các thao tác; `errors` ép một thao tác (theo "bảng.thao tác") trả lỗi. */
function recorder(errors: Record<string, string> = {}, contributions: { amount: number | string }[] = []) {
  const ops: Op[] = [];
  const result = (table: string, op: string) => ({ error: errors[`${table}.${op}`] ? { message: errors[`${table}.${op}`] } : null });
  const client = {
    from: (table: string) => ({
      update: (payload: unknown) => {
        const filters: unknown[] = [];
        const chain = { eq: (column: string, value: unknown) => (filters.push([column, value]), chain), then: (resolve: (v: unknown) => void) => (ops.push({ table, op: "update", payload, filters }), resolve(result(table, "update"))) };
        return chain;
      },
      upsert: (payload: unknown, options: unknown) => ({ select: () => ({ single: async () => (ops.push({ table, op: "upsert", payload, filters: [options] }), errors["incomes.upsert"] ? { data: null, error: { message: errors["incomes.upsert"] } } : { data: { id: "income-1" }, error: null }) }) }),
      delete: () => ({ eq: async (column: string, value: unknown) => (ops.push({ table, op: "delete", filters: [[column, value]] }), result(table, "delete")) }),
      insert: async (payload: unknown) => (ops.push({ table, op: "insert", payload }), result(table, "insert")),
      select: () => ({ eq: () => ({ eq: async () => ({ data: contributions, error: null }) }) }),
    }),
  };
  return { ops, client: client as never };
}

const NOW = new Date(2026, 9, 5);
const input = { income: 20_000_000, allocations: [{ jarId: "a", monthlyBudget: 12_000_000, pct: 60 }, { jarId: "b", monthlyBudget: 8_000_000, pct: 40 }] };

describe("applyAllocation", () => {
  it("updates each jar's budget for this user, then records the month's income and breakdown", async () => {
    const { ops, client } = recorder();
    expect(await applyAllocation(client, "u", input, NOW)).toEqual({ data: undefined, error: null });

    expect(ops.filter((op) => op.table === "jars").map((op) => [op.payload, op.filters])).toEqual([
      [{ monthly_budget: 12_000_000 }, [["id", "a"], ["user_id", "u"]]],
      [{ monthly_budget: 8_000_000 }, [["id", "b"], ["user_id", "u"]]],
    ]);
    expect(ops.find((op) => op.op === "upsert")).toMatchObject({ table: "incomes", payload: { user_id: "u", period_month: "2026-10-01", amount: 20_000_000 }, filters: [{ onConflict: "user_id,period_month" }] });
    // Xóa breakdown cũ TRƯỚC khi ghi lại để áp dụng nhiều lần không cộng dồn.
    const history = ops.filter((op) => op.table === "jar_allocations").map((op) => op.op);
    expect(history).toEqual(["delete", "insert"]);
    expect(ops.find((op) => op.op === "insert")?.payload).toEqual([
      { income_id: "income-1", jar_id: "a", user_id: "u", percent: 60, amount: 12_000_000 },
      { income_id: "income-1", jar_id: "b", user_id: "u", percent: 40, amount: 8_000_000 },
    ]);
  });

  it("fails without touching the history when a budget update fails", async () => {
    const { ops, client } = recorder({ "jars.update": "permission denied" });
    expect(await applyAllocation(client, "u", input, NOW)).toEqual({ data: null, error: { code: "SUPABASE", message: "permission denied" } });
    expect(ops.some((op) => op.table === "incomes")).toBe(false);
  });

  it("still succeeds when only the history cannot be saved (budgets are already applied)", async () => {
    const { ops, client } = recorder({ "incomes.upsert": "no table" });
    expect(await applyAllocation(client, "u", input, NOW)).toEqual({ data: undefined, error: null });
    expect(ops.some((op) => op.table === "jar_allocations")).toBe(false);
  });

  it("rejects negative or non-finite amounts before writing anything", async () => {
    for (const bad of [{ ...input, income: -1 }, { ...input, allocations: [{ jarId: "a", monthlyBudget: Number.NaN, pct: 1 }] }, { ...input, allocations: [{ jarId: "a", monthlyBudget: -5, pct: 1 }] }]) {
      const { ops, client } = recorder();
      expect(await applyAllocation(client, "u", bad, NOW)).toEqual({ data: null, error: { code: "VALIDATION", message: "Số tiền phân bổ không hợp lệ." } });
      expect(ops).toEqual([]);
    }
  });

  it("skips the breakdown insert when there are no allocations", async () => {
    const { ops, client } = recorder();
    await applyAllocation(client, "u", { income: 1, allocations: [] }, NOW);
    expect(ops.some((op) => op.op === "insert")).toBe(false);
  });
});

describe("getMyFamilyContributionTotal", () => {
  it("sums what the user pledged to all family jars this month", async () => {
    const { client } = recorder({}, [{ amount: 1_500_000 }, { amount: "500000" }]);
    expect(await getMyFamilyContributionTotal(client, "u", "2026-10-01")).toBe(2_000_000);
  });

  it("is zero when the user has not pledged anything", async () => {
    expect(await getMyFamilyContributionTotal(recorder().client, "u", "2026-10-01")).toBe(0);
  });
});
