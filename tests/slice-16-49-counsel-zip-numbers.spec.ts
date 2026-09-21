import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  COUNSEL_STANDING_HEADERS,
  buildCounselStandingCsv,
  counselStandingHasEmailLeak,
} from "../src/lib/counsel-export";
import type { IntentBid } from "../src/lib/intent";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.49 — counsel ZIP standing table lists seats by number.
 * No emails. CLOSE_AT null. No Stripe.
 */

function bid(panelId: "hood" | "driver-door", brand: string): IntentBid {
  return {
    id: `bid-${panelId}`,
    panelId,
    userId: "hidden-user",
    brandLabel: brand,
    tradeLabel: "counsel trade",
    standingUsd: panelId === "driver-door" ? 4500 : 2500,
    depositUsd: panelId === "driver-door" ? 900 : 500,
    status: "approved",
    createdAt: "2026-09-19T00:00:00.000Z",
    updatedAt: "2026-09-19T00:00:00.000Z",
    idempotencyKey: null,
    artworkUrl: null,
    proxyMaxUsd: null,
    floorSaveUsd: null,
    deletedAt: null,
  };
}

test.describe("slice 16.49: counsel ZIP lists seats by number", () => {
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

  test("standing CSV leads with panel_number for seats 1 and 4", () => {
    expect(COUNSEL_STANDING_HEADERS[0]).toBe("panel_number");
    const csv = buildCounselStandingCsv([
      bid("hood", "Hood Brand"),
      bid("driver-door", "Door Brand"),
    ]);
    expect(csv.split("\n")[0]).toBe(COUNSEL_STANDING_HEADERS.join(","));
    expect(csv).toContain("1,hood,Hood Brand");
    expect(csv).toContain("4,driver-door,Door Brand");
    expect(counselStandingHasEmailLeak(csv)).toBe(false);
    expect(csv).not.toContain("hidden-user");
    expect(csv).not.toContain("@");
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
