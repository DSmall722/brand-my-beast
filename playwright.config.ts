import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;
const SCORE = process.env.SCORE === "1";

export default defineConfig({
  testDir: "./tests",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results",
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: SCORE
    ? [
        ["line"],
        ["json", { outputFile: "score/playwright.json" }],
      ]
    : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}${SCORE ? " --webpack" : ""}`,
    url: baseURL,
    timeout: 120 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      WAITLIST_MODE: "memory",
      INTENT_MODE: "memory",
      AUTH_MODE: "test",
      AUTH_SECRET: "playwright-auth-secret-min-32-chars!!",
      AUTH_TEST_PASSWORD: "test",
      CRON_SECRET: "playwright-cron-secret",
      INTERNAL_MAIL_TOKEN: "playwright-internal-mail-token-min-32!!",
      IMPROVMX_SMTP_USER: "playwright-smtp-user",
      IMPROVMX_SMTP_PASS: "playwright-smtp-pass",
      INTERNAL_MAIL_TRANSPORT: "json",
      PORT: String(PORT),
      NEXT_DIST_DIR: process.env.NEXT_DIST_DIR || ".next",
    },
  },
  projects: [
    {
      name: "chromium",
      testIgnore: ["score/**"],
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "score",
      testDir: "./tests/score",
      fullyParallel: false,
      workers: 1,
      retries: 0,
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
