import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@hu/database";
import { createJarInputSchema, safeColor, updateJarInputSchema, type CreateJarInput, type Jar, type UpdateJarInput } from "@hu/domain";
import { dataFailure, dataSuccess, type DataResult } from "./result";

type JarRow = Pick<
  Database["public"]["Tables"]["jars"]["Row"],
  "id" | "name" | "icon" | "color" | "monthly_budget" | "is_shared" | "alert_at_80" | "rollover" | "is_savings"
>;

type SpendRow = Pick<Database["public"]["Tables"]["transactions"]["Row"], "jar_id" | "amount" | "type">;

export function mapJarsWithSpent(jars: JarRow[], transactions: SpendRow[]): Jar[] {
  const spentByJar = new Map<string, number>();
  for (const transaction of transactions) {
    const delta = transaction.type === "deposit" ? -Number(transaction.amount) : Number(transaction.amount);
    spentByJar.set(transaction.jar_id, (spentByJar.get(transaction.jar_id) ?? 0) + delta);
  }

  return jars.map((jar) => ({
    id: jar.id,
    name: jar.name,
    icon: jar.icon ?? "wallet",
    color: safeColor(jar.color),
    monthlyBudget: Number(jar.monthly_budget),
    spent: spentByJar.get(jar.id) ?? 0,
    isShared: jar.is_shared,
    alertAt80: jar.alert_at_80,
    rollover: jar.rollover,
    isSavings: jar.is_savings,
  }));
}

export function normalizeJarForWrite(input: CreateJarInput) {
  const candidate = {
    ...input,
    alertAt80: input.isSavings ? false : input.alertAt80,
    rollover: input.isSavings ? true : input.rollover,
  };
  const parsed = createJarInputSchema.parse(candidate);
  return {
    name: parsed.name,
    icon: parsed.icon,
    color: parsed.color,
    monthly_budget: parsed.monthlyBudget,
    alert_at_80: parsed.alertAt80,
    rollover: parsed.rollover,
    is_savings: parsed.isSavings,
  };
}

export function buildJarPatch(input: UpdateJarInput, isShared: boolean) {
  const candidate = {
    ...input,
    isSavings: isShared ? false : input.isSavings,
    alertAt80: isShared || !input.isSavings ? input.alertAt80 : false,
    rollover: !isShared && input.isSavings ? true : input.rollover,
  };
  const parsed = updateJarInputSchema.parse(candidate);
  return {
    name: parsed.name,
    ...(parsed.icon ? { icon: parsed.icon } : {}),
    ...(parsed.color ? { color: parsed.color } : {}),
    ...(!isShared ? { monthly_budget: parsed.monthlyBudget } : {}),
    alert_at_80: parsed.alertAt80,
    rollover: parsed.rollover,
    is_savings: parsed.isSavings,
  };
}

export async function listJarsWithSpent(
  client: SupabaseClient<Database>,
  monthStart: string,
): Promise<Jar[]> {
  const [{ data: jars, error: jarsError }, { data: transactions, error: transactionsError }] = await Promise.all([
    client
      .from("jars")
      .select("id, name, icon, color, monthly_budget, is_shared, alert_at_80, rollover, is_savings")
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
    client.from("transactions").select("jar_id, amount, type").gte("transaction_date", monthStart),
  ]);

  if (jarsError) throw jarsError;
  if (transactionsError) throw transactionsError;
  return mapJarsWithSpent(jars ?? [], transactions ?? []);
}

export async function createJars(
  client: SupabaseClient<Database>,
  inputs: CreateJarInput[],
  authenticatedUserId?: string,
): Promise<DataResult<void>> {
  if (inputs.length === 0) return dataFailure("VALIDATION", "Chưa chọn hũ nào.");

  let normalized: ReturnType<typeof normalizeJarForWrite>[];
  try {
    normalized = inputs.map(normalizeJarForWrite);
  } catch {
    return dataFailure("VALIDATION", "Kiểm tra lại tên và ngân sách của từng hũ.");
  }

  let userId = authenticatedUserId;
  if (!userId) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");
    userId = authData.user.id;
  }

  const rows = normalized.map((jar) => ({
    ...jar,
    user_id: userId,
    is_shared: false,
    household_id: null,
  }));
  const { error } = await client.from("jars").insert(rows);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

export async function updateJar(
  client: SupabaseClient<Database>,
  input: UpdateJarInput,
  authenticatedUserId?: string,
): Promise<DataResult<void>> {
  if (!authenticatedUserId) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");
  }

  const { data: existing, error: existingError } = await client.from("jars").select("is_shared").eq("id", input.id).maybeSingle();
  if (existingError) return dataFailure("SUPABASE", existingError.message);
  if (!existing) return dataFailure("NOT_FOUND", "Không tìm thấy hũ này.");

  let patch: ReturnType<typeof buildJarPatch>;
  try {
    patch = buildJarPatch(input, existing.is_shared);
  } catch {
    return dataFailure("VALIDATION", "Kiểm tra lại tên và ngân sách của hũ.");
  }

  const { error } = await client.from("jars").update(patch).eq("id", input.id);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}

export async function deactivateJar(
  client: SupabaseClient<Database>,
  jarId: string,
  authenticatedUserId?: string,
): Promise<DataResult<void>> {
  if (!authenticatedUserId) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return dataFailure("UNAUTHENTICATED", "Bạn cần đăng nhập lại.");
  }
  const { error } = await client.from("jars").update({ is_active: false }).eq("id", jarId);
  return error ? dataFailure("SUPABASE", error.message) : dataSuccess(undefined);
}
