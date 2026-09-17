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
import {
  intentFormMode,
  intentWaitlistOnlyCopy,
  seatsOpenIsSeparateFromCloseAt,
} from "../src/lib/seats-open";

/**
 * Slice 14.17 — SEATS_OPEN flag, separate from CLOSE_AT. When false, intent
 * form says waitlist only. Default open when unset. No clock. No Stripe.
 * Hold-mode untouched. API 403 is 14.32.
 */

const ROOT = process.cwd();

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.17: SEATS_OPEN flag waitlist-only intent form", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("SEATS_OPEN is separate from CLOSE_AT; default open when unset", () => {
    expect(CLOSE_AT).toBeNull();
    expect(seatsOpenIsSeparateFromCloseAt()).toBe(true);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
    expect(intentFormMode(true)).toBe("list");
    expect(intentFormMode(false)).toBe("waitlist-only");
    expect(intentFormMode()).toBe("list");
    expect(intentWaitlistOnlyCopy()).toBe(
      PUBLIC_COPY.intent.seatsClosedWaitlistOnly,
    );
    expect(intentWaitlistOnlyCopy().toLowerCase()).toContain("waitlist only");
    expect(intentWaitlistOnlyCopy()).not.toMatch(/close.?at/i);
  });

  test("campaign.ts defines SEATS_OPEN from env without touching CLOSE_AT", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/SEATS_OPEN !== "false"/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
  });

  test("IntentBidForm gates waitlist-only when seatsOpen is false", () => {
    const src = readFileSync(
      join(ROOT, "src/components/IntentBidForm.tsx"),
      "utf8",
    );
    expect(src).toContain("seatsOpen");
    expect(src).toContain("intent-waitlist-only");
    expect(src).toContain("intentFormMode");
    expect(src).toContain("intentWaitlistOnlyCopy");
  });

  test("signed-in panel shows intent form while SEATS_OPEN default true", async ({
    page,
  }) => {
    expect(SEATS_OPEN).toBe(true);
    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-bid-form")).toBeVisible();
    await expect(page.getByTestId("intent-bid-form")).toHaveAttribute(
      "data-seats-open",
      "true",
    );
    await expect(page.getByTestId("intent-waitlist-only")).toHaveCount(0);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
