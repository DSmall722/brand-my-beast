import { existsSync, readFileSync } from "node:fs";
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

/**
 * Slice 14.8 — Delete FEATURES rows that contradict CAMPAIGN
 * (lease, $40k, cheaper trim). CLOSE_AT null. No Stripe. No clock.
 */

const FEATURES = join(process.cwd(), "FEATURES.md");
const STALE = join(process.cwd(), "STALE.md");

test.describe("slice 14.8: FEATURES drops CAMPAIGN contradictions", () => {
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
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("FEATURES has no lease / $40k / cheaper-trim backlog rows", () => {
    expect(existsSync(FEATURES)).toBe(true);
    expect(existsSync(STALE)).toBe(true);
    const text = readFileSync(FEATURES, "utf8");
    expect(text).toContain("14.8");
    expect(text).toMatch(/## Deleted contradictions/);
    expect(text).toMatch(/STALE\.md/);
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");

    // Backlog lines must not sell killed products.
    const backlog = text.split("## Ranked backlog")[1] ?? "";
    expect(backlog.toLowerCase()).not.toMatch(/\blease\b/);
    expect(backlog).not.toMatch(/\$40,?000/);
    expect(backlog).not.toMatch(/Dual Motor/i);
    expect(backlog).not.toMatch(/\bPremium\b/);
    expect(backlog.toLowerCase()).not.toMatch(/cheaper trim|cheaper cybertruck/);

    // Deleted section names the kills without offering them as build items.
    const deleted = text.split("## Deleted contradictions")[1]?.split(
      "## Ranked backlog",
    )[0] ?? "";
    expect(deleted).toMatch(/\$40,?000/);
    expect(deleted.toLowerCase()).toMatch(/\blease\b/);
    expect(deleted).toMatch(/Dual Motor|Premium/);
    expect(deleted).toMatch(/Cyberbeast or refund|No cheaper trim/i);
    expect(deleted).not.toMatch(/^- \[[ xX]\]/m);

    const stale = readFileSync(STALE, "utf8");
    expect(stale).toMatch(/\$40,?000/);
    expect(stale.toLowerCase()).toMatch(/\blease\b/);
  });

  test("homepage still excludes FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
  });
});
