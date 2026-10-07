import assert from "node:assert/strict";
import test from "node:test";
import { validateE2EEnvironment } from "./validate-e2e-env.mjs";

const baseEnvironment = {
  E2E_ALLOW_MUTATIONS: "true",
  E2E_SUPABASE_URL: "https://test-project.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://test-project.supabase.co",
  E2E_TEST_EMAIL: "one@example.com",
  E2E_TEST_PASSWORD: "password-one",
  E2E_TEST_EMAIL_2: "two@example.com",
  E2E_TEST_PASSWORD_2: "password-two",
};

test("rejects E2E runs without explicit mutation consent", () => {
  assert.throws(
    () => validateE2EEnvironment({ ...baseEnvironment, E2E_ALLOW_MUTATIONS: undefined }),
    /E2E_ALLOW_MUTATIONS=true/,
  );
});

test("rejects E2E runs when the app URL is not the declared test project", () => {
  assert.throws(
    () =>
      validateE2EEnvironment({
        ...baseEnvironment,
        NEXT_PUBLIC_SUPABASE_URL: "https://other-project.supabase.co",
      }),
    /E2E_SUPABASE_URL.*NEXT_PUBLIC_SUPABASE_URL/,
  );
});

test("accepts a complete isolated test environment", () => {
  assert.doesNotThrow(() => validateE2EEnvironment(baseEnvironment));
});
