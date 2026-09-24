import { defineConfig, devices } from "@playwright/test";

process.loadEnvFile(".env.local");

const PORT = 4300;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Tat ca test dung chung 1 tai khoan Supabase that (khong co tai khoan
  // rieng cho tung worker) — chay song song se gay race khi nhieu test cung
  // sua profile (vd markTourSeen). Chay tuan tu cho on dinh.
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `next build && next start -p ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.auth/user.json" },
      dependencies: ["setup"],
    },
  ],
});
