import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.PORT ?? 3000);
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests",
  // INTENT_MODE=memory is one process-global ledger. Parallel workers race
  // resets vs creates (leftover panel-minimum, wiped exclusivity). CI stays
  // single-worker; local can parallelize.
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
    command: "npm run dev",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    env: {
      ...process.env,
      WAITLIST_MODE: "memory",
      INTENT_MODE: "memory",
      AUTH_MODE: "test",
      AUTH_SECRET: "playwright-auth-secret-min-32-chars!!",
      AUTH_TEST_PASSWORD: "test",
      PORT: String(PORT),
    },
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
