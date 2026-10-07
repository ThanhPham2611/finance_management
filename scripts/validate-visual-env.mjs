/** Visual tests are read-only, but they must still target an explicitly named test project. */
export function validateVisualEnvironment(environment = process.env) {
  const testUrl = environment.E2E_SUPABASE_URL;
  const appUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  if (!testUrl || !appUrl || testUrl !== appUrl) {
    throw new Error("E2E_SUPABASE_URL must be set and match NEXT_PUBLIC_SUPABASE_URL.");
  }
  const missing = ["E2E_TEST_EMAIL", "E2E_TEST_PASSWORD"].filter((name) => !environment[name]);
  if (missing.length) throw new Error(`Missing visual-test credentials: ${missing.join(", ")}`);
}
