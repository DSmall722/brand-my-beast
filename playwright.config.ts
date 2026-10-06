import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: process.env.PLAYWRIGHT_OUTPUT_DIR ?? "test-results",
  // INTENT_MODE=memory is one process-global ledger. Parallel workers on the
  // same server race resets vs creates. CI keeps one worker per server.
  // scripts/ci-playwright-shards.mjs starts a second server on its own port
  // so two files can run at once without sharing a ledger.
  fullyParallel: !process.env.CI,
  workers: process.env.CI ? 1 : undefined,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
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
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
