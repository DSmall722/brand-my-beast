import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import {
  truckViewsCopyIsSafe,
  truckViewsLeadIsSafe,
} from "../src/lib/truck-views";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 17.2 — truckViewsCopyIsSafe() requires floor + buyout + no lease / no CLOSE_AT.
 * Does not set CLOSE_AT. No Stripe.
 */

const SOURCE = join(process.cwd(), "src/lib/truck-views.ts");

test.describe("slice 17.2: truck views copy requires floor and buyout", () => {
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

  test("helper requires floor, buyout, and rejects lease or CLOSE_AT", () => {
    const floor = formatUsd(FLOOR_USD);
    const buyout = formatUsd(GOAL_USD);
    const ok = `Same stainless preview. Floor ${floor}. Buyout ${buyout}.`;
    expect(truckViewsLeadIsSafe(ok)).toBe(true);
    expect(truckViewsLeadIsSafe(`Buyout ${buyout}.`)).toBe(false);
    expect(truckViewsLeadIsSafe(`Floor ${floor}.`)).toBe(false);
    expect(truckViewsLeadIsSafe(`${ok} This is a lease.`)).toBe(false);
    expect(truckViewsLeadIsSafe(`${ok} CLOSE_AT is unset.`)).toBe(false);
    expect(truckViewsCopyIsSafe()).toBe(true);

    const source = readFileSync(SOURCE, "utf8");
    expect(source).toContain("formatUsd(FLOOR_USD)");
    expect(source).toContain("formatUsd(GOAL_USD)");
    expect(source).toMatch(/\\blease\\b/);
    expect(source).toContain('!lead.includes("CLOSE_AT")');
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
