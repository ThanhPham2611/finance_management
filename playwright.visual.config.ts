import { defineConfig } from "@playwright/test";
import { validateVisualEnvironment } from "./scripts/validate-visual-env.mjs";

process.loadEnvFile(".env.local");
validateVisualEnvironment();

const PORT = 4301;
const sizes = [
  { name: "phone-320", width: 320, height: 720 },
  { name: "phone-375", width: 375, height: 812 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1024", width: 1024, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

export default defineConfig({
  testDir: "./e2e/visual",
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [["list"], ["html", { outputFolder: "playwright-visual-report", open: "never" }]],
  expect: { toHaveScreenshot: { animations: "disabled", maxDiffPixelRatio: 0.015 } },
  use: { baseURL: `http://localhost:${PORT}`, colorScheme: "light", locale: "vi-VN", reducedMotion: "reduce", storageState: "e2e/.auth/visual-user.json" },
  webServer: { command: `next build && next start -p ${PORT}`, url: `http://localhost:${PORT}`, reuseExistingServer: !process.env.CI, timeout: 120_000 },
  projects: [
    { name: "visual-setup", testMatch: /auth\.setup\.ts/ },
    ...sizes.map((size) => ({ name: size.name, testIgnore: /auth\.setup\.ts/, use: { viewport: { width: size.width, height: size.height } }, dependencies: ["visual-setup"] })),
  ],
  snapshotPathTemplate: "{testDir}/__snapshots__/{testFilePath}/{arg}-{projectName}{ext}",
});
