/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;
export type Tables = Record<string, Row[]>;

const get = (row: Row, column: string) => column.split(".").reduce<any>((value, key) => value?.[key], row);

/** Client Supabase giả trong bộ nhớ cho test: select/eq/in/gte/order/limit, insert, upsert (theo onConflict), update, rpc. */
export function fakeClient(tables: Tables, rpcs: Record<string, (args?: any) => { data?: unknown; error?: { message: string } | null }> = {}, failures: Record<string, string> = {}) {
  const from = (table: string) => {
    const filters: ((row: Row) => boolean)[] = [];
    const sorts: { column: string; ascending: boolean }[] = [];
    let max = Infinity;
    const matching = () => {
      let rows = (tables[table] ??= []).filter((row) => filters.every((keep) => keep(row)));
      for (const { column, ascending } of [...sorts].reverse()) rows = [...rows].sort((a, b) => (get(a, column) < get(b, column) ? -1 : get(a, column) > get(b, column) ? 1 : 0) * (ascending ? 1 : -1));
      return rows.slice(0, max);
    };
    const failure = (op: string) => (failures[`${table}.${op}`] ? { message: failures[`${table}.${op}`] } : null);
    const q: any = {
      select: () => q,
      eq: (column: string, value: unknown) => (filters.push((row) => get(row, column) === value), q),
      neq: (column: string, value: unknown) => (filters.push((row) => get(row, column) !== value), q),
      in: (column: string, values: unknown[]) => (filters.push((row) => values.includes(get(row, column))), q),
      gte: (column: string, value: string) => (filters.push((row) => get(row, column) >= value), q),
      order: (column: string, options?: { ascending?: boolean }) => (sorts.push({ column, ascending: options?.ascending ?? true }), q),
      limit: (count: number) => ((max = count), q),
      maybeSingle: async () => ({ data: matching()[0] ?? null, error: failure("select") }),
      single: async () => (matching()[0] ? { data: matching()[0], error: null } : { data: null, error: { message: "not found" } }),
      then: (resolve: (value: unknown) => void) => resolve({ data: failure("select") ? null : matching(), error: failure("select") }),
      insert: async (input: Row | Row[]) => {
        if (failure("insert")) return { error: failure("insert") };
        (tables[table] ??= []).push(...(Array.isArray(input) ? input : [input]));
        return { error: null };
      },
      upsert: async (input: Row, options?: { onConflict?: string }) => {
        if (failure("upsert")) return { error: failure("upsert") };
        const keys = options?.onConflict?.split(",") ?? [];
        const rows = (tables[table] ??= []);
        const existing = rows.find((row) => keys.every((key) => row[key] === input[key]));
        if (existing) Object.assign(existing, input);
        else rows.push({ ...input });
        return { error: null };
      },
      update: (patch: Row) => {
        const targets: ((row: Row) => boolean)[] = [];
        const chain: any = {
          eq: (column: string, value: unknown) => (targets.push((row) => get(row, column) === value), chain),
          then: (resolve: (value: unknown) => void) => {
            if (failure("update")) return resolve({ error: failure("update") });
            for (const row of tables[table] ?? []) if (targets.every((hit) => hit(row))) Object.assign(row, patch);
            resolve({ error: null });
          },
        };
        return chain;
      },
    };
    return q;
  };
  const rpc = async (name: string, args?: unknown) => ({ data: null, error: null, ...(rpcs[name]?.(args) ?? {}) });
  return { from, rpc } as never;
}
