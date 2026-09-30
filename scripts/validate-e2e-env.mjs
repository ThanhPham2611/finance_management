const REQUIRED_CREDENTIALS = [
  "E2E_TEST_EMAIL",
  "E2E_TEST_PASSWORD",
  "E2E_TEST_EMAIL_2",
  "E2E_TEST_PASSWORD_2",
];

/**
 * Playwright scenarios create and mutate finance data. Refuse to run unless
 * the operator explicitly points the app at the declared test project.
 */
export function validateE2EEnvironment(environment = process.env) {
  if (environment.E2E_ALLOW_MUTATIONS !== "true") {
    throw new Error("E2E_ALLOW_MUTATIONS=true is required because these tests mutate Supabase data.");
  }

  const testUrl = environment.E2E_SUPABASE_URL;
  const appUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  if (!testUrl || !appUrl || testUrl !== appUrl) {
    throw new Error("E2E_SUPABASE_URL must be set and match NEXT_PUBLIC_SUPABASE_URL.");
  }

  const missing = REQUIRED_CREDENTIALS.filter((name) => !environment[name]);
  if (missing.length > 0) {
    throw new Error(`Missing E2E credentials: ${missing.join(", ")}`);
  }
}
