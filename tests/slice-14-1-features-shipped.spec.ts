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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.1 — FEATURES.md shipped rows marked with slice id; P3/P5 stay Catalog.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. Not on the public homepage.
 */

const FEATURES = join(process.cwd(), "FEATURES.md");

/** Ranked-backlog lines that must stay Catalog (P3 = 26–35, P5 = 46–50). */
const P3_P5_CATALOG_IDS = [
  26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 46, 47, 48, 49, 50,
] as const;

const MUST_SHIPPED = [
  { id: 3, slice: "3.1" },
  { id: 4, slice: "4.2" },
  { id: 5, slice: "4.4" },
  { id: 6, slice: "4.3" },
  { id: 7, slice: "2.4" },
  { id: 9, slice: "9.1" },
  { id: 15, slice: "1.4" },
  { id: 17, slice: "3.3" },
  { id: 18, slice: "3.4" },
  { id: 24, slice: "1.7" },
] as const;

function backlogLine(text: string, n: number): string {
  const line = text.split("\n").find((l) => new RegExp(`^${n} P`).test(l));
  expect(line, `missing FEATURES row ${n}`).toBeTruthy();
  return line!;
}

test.describe("slice 14.1: FEATURES shipped markers; P3/P5 Catalog", () => {
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("FEATURES.md marks shipped rows and keeps P3/P5 Catalog", () => {
    expect(existsSync(FEATURES)).toBe(true);
    const text = readFileSync(FEATURES, "utf8");
    expect(text).toContain("14.1");
    expect(text).toMatch(/not the build order/i);
    expect(text).toMatch(/SLICES\.md/);
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/P3 and P5 stay Catalog/i);
    expect(text).toMatch(/shipped \(14\.0 \/ 16\.x\)/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
    expect(text).toMatch(/No Stripe without a separate human message/i);

    for (const row of MUST_SHIPPED) {
      const line = backlogLine(text, row.id);
      expect(line).toMatch(/\*\*shipped \(/i);
      expect(line).toContain(row.slice);
      expect(line).not.toMatch(/\*\*Catalog\*\*\s*$/);
    }

    for (const id of P3_P5_CATALOG_IDS) {
      const line = backlogLine(text, id);
      expect(line).toMatch(/\*\*Catalog\*\*/);
      expect(line).not.toMatch(/\*\*shipped \(/i);
    }

    // Escrow stays Catalog — Stripe is Wave 15.
    expect(backlogLine(text, 1)).toMatch(/\*\*Catalog\*\*/);
    expect(backlogLine(text, 1)).not.toMatch(/\*\*shipped \(/i);
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
