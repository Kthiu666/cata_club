/**
 * Playwright Configuration — Cata Club Admin Frontend
 *
 * Single smoke-test config for the admin flow:
 *   login → dashboard → members page.
 *
 * Uses the production Next.js server via the webServer option.
 * In CI, the workflow builds once before Playwright and this config only starts it.
 * Locally, Playwright builds then starts unless an existing server is reused.
 */
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["html", { outputFolder: "playwright-report" }]],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },

  webServer: {
    command: process.env.CI ? "pnpm start" : "pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
