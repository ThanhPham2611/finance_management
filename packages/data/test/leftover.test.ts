import { describe, expect, it } from "vitest";
import { applyAutoRollovers, getPendingLeftovers, previousMonthLabel, previousMonthStart, resolveLeftovers } from "../src/index";

type Row = Record<string, unknown>;

/** Client Supabase giả trong bộ nhớ, đủ cho các truy vấn của leftover.ts. `jar_leftover_events` có unique (jar_id, period_month). */
function fakeClient(tables: Record<string, Row[]>, options: { rejectEvents?: boolean } = {}) {
  let nextId = 1;
  const from = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    const matching = () => (tables[table] ??= []).filter((row) => filters.every((keep) => keep(row)));
    const q = {
      select: () => q,
      eq: (column: string, value: unknown) => (filters.push((row) => row[column] === value), q),
      lt: (column: string, value: unknown) => (filters.push((row) => (row[column] as string) < (value as string)), q),
      gte: (column: string, value: unknown) => (filters.push((row) => (row[column] as string) >= (value as string)), q),
      in: (column: string, values: unknown[]) => (filters.push((row) => values.includes(row[column])), q),
      maybeSingle: async () => ({ data: matching()[0] ?? null, error: null }),
      single: async () => (matching()[0] ? { data: matching()[0], error: null } : { data: null, error: { message: "not found" } }),
      then: (resolve: (value: unknown) => void) => resolve({ data: matching(), error: null }),
      insert: (input: Row | Row[]) => {
        const list = Array.isArray(input) ? input : [input];
        const rows = (tables[table] ??= []);
        let error: { message: string } | null = null;
        const duplicate = table === "jar_leftover_events" && list.some((item) => rows.some((row) => row.jar_id === item.jar_id && row.period_month === item.period_month));
        if ((table === "jar_leftover_events" && options.rejectEvents) || duplicate) error = { message: "duplicate key" };
        else for (const item of list) rows.push({ id: `new-${nextId++}`, ...item });
        const chain = { select: () => chain, single: async () => ({ data: error ? null : rows[rows.length - 1], error }), then: (resolve: (value: unknown) => void) => resolve({ error }) };
        return chain;
      },
      update: (patch: Row) => {
        const targets: ((row: Row) => boolean)[] = [];
        const chain = {
          eq: (column: string, value: unknown) => (targets.push((row) => row[column] === value), chain),
          then: (resolve: (value: unknown) => void) => {
            for (const row of tables[table] ?? []) if (targets.every((hit) => hit(row))) Object.assign(row, patch);
            resolve({ error: null });
          },
        };
        return chain;
      },
    };
    return q;
  };
  return { from } as never;
}

const NOW = new Date(2026, 9, 5); // 5/10/2026 → tháng trước = 2026-09-01
const jar = (over: Row): Row => ({ user_id: "u", name: "Hũ", icon: null, color: "#174C3C", monthly_budget: 1_000_000, is_shared: false, is_active: true, is_default_savings: false, rollover: false, created_at: "2026-08-15", ...over });
const sept = (jar_id: string, amount: number, type = "expense"): Row => ({ jar_id, amount, type, transaction_date: "2026-09-12" });

function db(): Record<string, Row[]> {
  return {
    jars: [
      jar({ id: "a", name: "Ăn uống", color: "oklch(0.55 0.12 40)" }),
      jar({ id: "b", name: "Đi lại", rollover: true, monthly_budget: 500_000 }),
      jar({ id: "new", created_at: "2026-10-02" }), // tạo trong tháng này → chưa có "tháng trước"
      jar({ id: "family", is_shared: true }),
      jar({ id: "savings", is_default_savings: true }),
    ],
    transactions: [sept("a", 300_000), sept("a", 100_000, "deposit"), sept("b", 100_000), { jar_id: "a", amount: 50_000, type: "expense", transaction_date: "2026-10-03" }],
    jar_leftover_events: [],
    incomes: [],
    jar_allocations: [],
  };
}

describe("month helpers", () => {
  it("steps back across the new year", () => {
    expect(previousMonthStart(NOW)).toBe("2026-09-01");
    expect(previousMonthStart(new Date(2027, 0, 15))).toBe("2026-12-01");
    expect(previousMonthLabel(new Date(2027, 0, 15))).toBe("Tháng 12, 2026");
  });
});

describe("getPendingLeftovers", () => {
  it("lists only personal, non-rollover jars that existed last month, netting deposits against spending", async () => {
    const result = await getPendingLeftovers(fakeClient(db()), "u", NOW);
    // a: ngân sách 1tr, chi 300k, nạp 100k → spent 200k, dư 800k. Giao dịch tháng 10 không tính.
    expect(result).toEqual([{ jarId: "a", jarName: "Ăn uống", jarIcon: "wallet", jarColor: "#9A5B13", budget: 1_000_000, spent: 200_000, leftover: 800_000 }]);
  });

  it("prefers the exact budget applied last month over the jar's current budget", async () => {
    const tables = db();
    tables.incomes.push({ id: "i1", user_id: "u", period_month: "2026-09-01" });
    tables.jar_allocations.push({ income_id: "i1", jar_id: "a", amount: 600_000 });
    const [only] = await getPendingLeftovers(fakeClient(tables), "u", NOW);
    expect(only).toMatchObject({ budget: 600_000, leftover: 400_000 });
  });

  it("skips jars already handled and jars with nothing left", async () => {
    const handled = db();
    handled.jar_leftover_events.push({ jar_id: "a", period_month: "2026-09-01", user_id: "u" });
    expect(await getPendingLeftovers(fakeClient(handled), "u", NOW)).toEqual([]);

    const overspent = db();
    overspent.transactions.push(sept("a", 900_000));
    expect(await getPendingLeftovers(fakeClient(overspent), "u", NOW)).toEqual([]);
  });
});

describe("applyAutoRollovers", () => {
  it("adds last month's leftover to rollover jars once, and is a no-op the second time", async () => {
    const tables = db();
    const client = fakeClient(tables);
    expect(await applyAutoRollovers(client, "u", NOW)).toBe(1);
    expect(tables.jars.find((row) => row.id === "b")?.monthly_budget).toBe(900_000); // 500k + (500k - 100k)
    expect(tables.jars.find((row) => row.id === "a")?.monthly_budget).toBe(1_000_000); // hũ không bật rollover: không đụng tới
    expect(tables.jar_leftover_events).toEqual([expect.objectContaining({ jar_id: "b", status: "rolled_over", leftover: 400_000, period_month: "2026-09-01" })]);

    expect(await applyAutoRollovers(client, "u", NOW)).toBe(0);
    expect(tables.jars.find((row) => row.id === "b")?.monthly_budget).toBe(900_000);
  });

  it("does not credit the budget when another request already holds the lock", async () => {
    const tables = db();
    expect(await applyAutoRollovers(fakeClient(tables, { rejectEvents: true }), "u", NOW)).toBe(0);
    expect(tables.jars.find((row) => row.id === "b")?.monthly_budget).toBe(500_000);
  });
});

describe("resolveLeftovers", () => {
  it("confirm: records the events and adds the total to a newly created Quỹ dư jar", async () => {
    const tables = db();
    tables.jars = tables.jars.filter((row) => row.id !== "savings"); // user chưa có hũ tiết kiệm mặc định
    const result = await resolveLeftovers(fakeClient(tables), "u", "confirm", NOW);
    expect(result).toEqual({ data: undefined, error: null });
    expect(tables.jar_leftover_events).toEqual([expect.objectContaining({ jar_id: "a", status: "confirmed", leftover: 800_000 })]);
    const created = tables.jars.find((row) => row.name === "Quỹ dư");
    expect(created).toMatchObject({ is_default_savings: true, is_savings: true, rollover: true, monthly_budget: 800_000 });
  });

  it("confirm: credits the existing default savings jar (even if renamed) instead of creating another", async () => {
    const tables = db(); // đã có hũ is_default_savings tên "Hũ", ngân sách 1tr
    await resolveLeftovers(fakeClient(tables), "u", "confirm", NOW);
    expect(tables.jars.find((row) => row.id === "savings")?.monthly_budget).toBe(1_800_000);
    expect(tables.jars.filter((row) => row.is_default_savings === true)).toHaveLength(1);
    expect(tables.jars.some((row) => row.name === "Quỹ dư")).toBe(false);
  });

  it("decline: records the decision and leaves budgets alone", async () => {
    const tables = db();
    await resolveLeftovers(fakeClient(tables), "u", "decline", NOW);
    expect(tables.jar_leftover_events).toEqual([expect.objectContaining({ jar_id: "a", status: "declined" })]);
    expect(tables.jars.some((row) => row.name === "Quỹ dư")).toBe(false);
  });

  it("returns the error and does not credit Quỹ dư when the lock insert fails", async () => {
    const tables = db();
    const result = await resolveLeftovers(fakeClient(tables, { rejectEvents: true }), "u", "confirm", NOW);
    expect(result).toEqual({ data: null, error: { code: "SUPABASE", message: "duplicate key" } });
    expect(tables.jars.some((row) => row.name === "Quỹ dư")).toBe(false);
  });

  it("does nothing when there is nothing pending", async () => {
    const tables = db();
    tables.jars = tables.jars.filter((row) => row.id !== "a");
    expect(await resolveLeftovers(fakeClient(tables), "u", "confirm", NOW)).toEqual({ data: undefined, error: null });
    expect(tables.jar_leftover_events).toEqual([]);
  });
});
