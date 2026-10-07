import assert from "node:assert/strict";
import test from "node:test";
import { validateVisualEnvironment } from "./validate-visual-env.mjs";

const valid = {
  E2E_SUPABASE_URL: "https://visual-test.supabase.co",
  NEXT_PUBLIC_SUPABASE_URL: "https://visual-test.supabase.co",
  E2E_TEST_EMAIL: "visual@example.com",
  E2E_TEST_PASSWORD: "safe-password",
};

test("visual tests require the declared isolated Supabase project", () => {
  assert.throws(() => validateVisualEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "https://personal.supabase.co" }), /must.*match/);
});

test("visual tests do not require mutation consent", () => {
  assert.doesNotThrow(() => validateVisualEnvironment(valid));
});
