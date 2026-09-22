import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  SEATS_OPEN,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 19.1 — public seats are waitlist-only while SEATS_OPEN is false.
 * Hide IntentBidForm and intent-signin-needed. Only the waitlist CTA.
 * Do not flip campaign.ts SEATS_OPEN. CLOSE_AT null. No Stripe.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 19.1: public seats waitlist-only while closed", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    await request.post("/api/test/seats-open", { data: { reset: true } });
    await request.post("/api/test/reset-intents");
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("SEATS_OPEN is not flipped in campaign.ts", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/SEATS_OPEN !== "false"/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
  });

  test("SEATS_OPEN=false hides list CTAs; waitlist CTA stays; waitlist 201", async ({
    page,
    request,
  }) => {
    const closed = await request.post("/api/test/seats-open", {
      data: { open: false },
    });
    expect(closed.ok()).toBeTruthy();
    const closedBody = (await closed.json()) as {
      ok?: boolean;
      seatsOpen?: boolean;
      closeAt?: null;
    };
    expect(closedBody.ok).toBe(true);
    expect(closedBody.seatsOpen).toBe(false);
    expect(closedBody.closeAt).toBeNull();

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    await expect(page.getByTestId("public-seat-waitlist-cta")).toBeVisible();
    await expect(page.getByTestId("public-seat-waitlist-cta")).toContainText(
      "Get on the list",
    );
    await expect(page.getByTestId("intent-signin-needed")).toHaveCount(0);
    await expect(page.getByTestId("intent-bid-form")).toHaveCount(0);
    await expect(page.getByTestId("intent-waitlist-only")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "List an intent mark" })).toHaveCount(
      0,
    );

    const visible = await page.locator("body").innerText();
    expect(visible).not.toContain("Sign in to list an intent");
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);

    await signIn(page, "slice-19-1@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-bid-form")).toHaveCount(0);
    await expect(page.getByTestId("intent-signin-needed")).toHaveCount(0);
    await expect(page.getByTestId("public-seat-waitlist-cta")).toBeVisible();
    const signedVisible = await page.locator("body").innerText();
    expect(signedVisible).not.toContain("Sign in to list an intent");

    const waitlist = await request.post("/api/waitlist", {
      data: { email: "slice-191-waitlist@example.com" },
    });
    expect(waitlist.status()).toBe(201);
  });

  test("homepage H1 is unchanged and Notify me stays", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    const html = (await page.content()).toLowerCase();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("features.md");
  });
});
