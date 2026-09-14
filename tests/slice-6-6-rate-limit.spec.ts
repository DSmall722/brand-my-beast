import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

const SUCCESS_CLAIM = /\b(you are on the list|joined|intent listed)\b/i;

async function configureLimits(
  request: APIRequestContext,
  waitlistMax: number,
  intentMax: number,
) {
  const res = await request.post("/api/test/rate-limit", {
    data: { configure: { waitlistMax, intentMax, windowMs: 60_000 } },
  });
  expect(res.ok()).toBeTruthy();
}

async function resetLimits(request: APIRequestContext) {
  const res = await request.post("/api/test/rate-limit", {
    data: { reset: true },
  });
  expect(res.ok()).toBeTruthy();
}

async function signIn(page: Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 6.6 — rate-limit waitlist + intent POSTs.
 * Clear 429 / error copy that never claims joined or listed.
 */
test.describe("slice 6.6: rate-limit waitlist + intent POSTs", () => {
  // Shared process-local limiter on the Next server — keep this file serial
  // so parallel workers cannot reset buckets mid-burst.
  test.describe.configure({ mode: "serial" });

  test.afterEach(async ({ request }) => {
    await resetLimits(request);
    await request.post("/api/test/reset-intents");
  });

  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("rate-limit copy never claims joined or listed", () => {
    expect(PUBLIC_COPY.waitlist.rateLimited.toLowerCase()).toContain(
      "not on the list",
    );
    expect(PUBLIC_COPY.waitlist.rateLimited.toLowerCase()).not.toMatch(
      /\bjoined\b/,
    );
    expect(PUBLIC_COPY.waitlist.rateLimited).not.toMatch(/you are on the list/i);
    expect(PUBLIC_COPY.intent.rateLimited.toLowerCase()).toMatch(
      /no new intent was listed|no new intent/,
    );
    expect(PUBLIC_COPY.intent.rateLimited.toLowerCase()).not.toMatch(
      /\bintent listed\b/,
    );
    expect(SUCCESS_CLAIM.test(PUBLIC_COPY.waitlist.rateLimited)).toBe(false);
    expect(SUCCESS_CLAIM.test(PUBLIC_COPY.intent.rateLimited)).toBe(false);
  });

  test("waitlist POST bursts return 429 without claiming join", async ({
    request,
  }) => {
    await configureLimits(request, 2, 60);
    const email = "slice66-waitlist@example.com";

    const first = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(first.status()).toBeLessThan(300);
    const firstBody = (await first.json()) as { ok?: boolean };
    expect(firstBody.ok).toBe(true);

    const second = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(second.status()).toBeLessThan(300);

    const limited = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(limited.status()).toBe(429);
    const body = (await limited.json()) as {
      ok?: boolean;
      error?: string;
      code?: string;
    };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("rate_limited");
    expect(body.error).toBe(PUBLIC_COPY.waitlist.rateLimited);
    expect(body.error?.toLowerCase()).not.toMatch(/\bjoined\b/);
    expect(body.error?.toLowerCase()).not.toMatch(/you are on the list/);
    expect(body.error?.toLowerCase()).toContain("not on the list");
  });

  test("waitlist UI on 429 never shows waitlist-next / joined", async ({
    page,
  }) => {
    await page.route("**/api/waitlist", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 429,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: PUBLIC_COPY.waitlist.rateLimited,
          code: "rate_limited",
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("waitlist-email").fill("slice66-ui@example.com");
    await page.getByTestId("waitlist-submit").click();

    const status = page.getByTestId("waitlist-status");
    await expect(status).toHaveText(PUBLIC_COPY.waitlist.rateLimited);
    await expect(status).toHaveClass(/is-error/);
    await expect(page.getByTestId("waitlist-next")).toHaveCount(0);

    const text = (await status.innerText()).toLowerCase();
    expect(text).not.toMatch(/\bjoined\b/);
    expect(text).not.toMatch(/you are on the list/);
  });

  test("intent submits trip rate limit without listing success", async ({
    page,
    request,
  }) => {
    await request.post("/api/test/reset-intents");
    await configureLimits(request, 60, 1);

    await signIn(page, "slice66-intent@example.com");
    await page.goto("/panels/hood");

    await page.getByTestId("intent-brand").fill("Slice Sixty Six Rate");
    await page.getByTestId("intent-trade").fill("Rate Limit Tools");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 15_000 },
    );

    await page.getByTestId("intent-brand").fill("Slice Sixty Six Rate Two");
    await page.getByTestId("intent-trade").fill("Rate Limit Vinyl");
    await page.getByTestId("intent-standing").fill("2750");
    await page.getByTestId("intent-submit").click();

    const error = page.getByTestId("intent-error");
    await expect(error).toHaveText(PUBLIC_COPY.intent.rateLimited);
    const errText = (await error.innerText()).toLowerCase();
    expect(errText).not.toMatch(/\bintent listed\b/);
    expect(errText).not.toMatch(/\bjoined\b/);
    await expect(page.getByTestId("intent-success")).toHaveCount(0);
  });
});
