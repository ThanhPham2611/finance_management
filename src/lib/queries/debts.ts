import type { SupabaseClient } from "@supabase/supabase-js";

export type Debt = {
  id: string;
  name: string;
  principal: number;
  /** Lai suat NAM, don vi %. */
  interestRate: number;
  minPayment: number;
};

/** Doc bang public.debts (migration_009) — bao loi neu bang chua ton tai
 * (chua chay migration) de trang goi ham nay tu bat (catch) ma khong sap. */
export async function listDebts(supabase: SupabaseClient): Promise<Debt[]> {
  const { data, error } = await supabase
    .from("debts")
    .select("id, name, principal, interest_rate, min_payment")
    .eq("is_active", true)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((d) => ({
    id: d.id as string,
    name: d.name as string,
    principal: Number(d.principal),
    interestRate: Number(d.interest_rate),
    minPayment: Number(d.min_payment),
  }));
}
