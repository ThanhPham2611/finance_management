import { createClient } from "@supabase/supabase-js";
import { expect, test } from "@playwright/test";
import type { Database } from "@hu/database";

test("RLS prevents an unrelated user from reading, editing, or deleting an owner's jar", async () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const owner = createClient<Database>(url, key, { auth: { persistSession: false } });
  const outsider = createClient<Database>(url, key, { auth: { persistSession: false } });
  const ownerAuth = await owner.auth.signInWithPassword({ email: process.env.E2E_TEST_EMAIL!, password: process.env.E2E_TEST_PASSWORD! });
  const outsiderAuth = await outsider.auth.signInWithPassword({ email: process.env.E2E_TEST_EMAIL_2!, password: process.env.E2E_TEST_PASSWORD_2! });
  expect(ownerAuth.error).toBeNull();
  expect(outsiderAuth.error).toBeNull();
  const userId = ownerAuth.data.user!.id;
  const name = `[rls-e2e] ${Date.now()}`;

  const created = await owner.from("jars").insert({ user_id: userId, name, monthly_budget: 100_000, icon: "shield", color: "#174C3C", is_shared: false }).select("id").single();
  expect(created.error).toBeNull();
  const jarId = created.data!.id;

  try {
    const read = await outsider.from("jars").select("id").eq("id", jarId);
    expect(read.error).toBeNull();
    expect(read.data).toEqual([]);

    const update = await outsider.from("jars").update({ name: "unauthorized" }).eq("id", jarId).select("id");
    expect(update.error).toBeNull();
    expect(update.data).toEqual([]);

    const remove = await outsider.from("jars").delete().eq("id", jarId).select("id");
    expect(remove.error).toBeNull();
    expect(remove.data).toEqual([]);

    const stillOwned = await owner.from("jars").select("name").eq("id", jarId).single();
    expect(stillOwned.data?.name).toBe(name);
  } finally {
    await owner.from("jars").delete().eq("id", jarId);
    await Promise.all([owner.auth.signOut(), outsider.auth.signOut()]);
  }
});
