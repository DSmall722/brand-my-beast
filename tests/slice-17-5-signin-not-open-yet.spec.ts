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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 17.5 — PUBLIC_COPY.signIn.notOpenYet + matching PUBLIC_COPY.md line.
 * CLOSE_AT null. No Stripe. No env key names in the buyer line.
 */

const LINE = "Sign-in is not open yet. Join the list. Nothing is charged.";
const PAGE = join(process.cwd(), "src/app/signin/page.tsx");
const MD = join(process.cwd(), "PUBLIC_COPY.md");

test.describe("slice 17.5: sign-in notOpenYet copy", () => {
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

  test("notOpenYet matches PUBLIC_COPY.md and the live block uses it", () => {
    expect(PUBLIC_COPY.signIn.notOpenYet).toBe(LINE);
    expect(readFileSync(MD, "utf8")).toContain(LINE);
    const src = readFileSync(PAGE, "utf8");
    expect(src).toContain("copy.notOpenYet");
    const live =
      src.split('data-testid="signin-not-open"')[1]?.split('mode !== "live"')[0] ??
      "";
    expect(live).toContain("copy.notOpenYet");
    expect(live).not.toMatch(/AUTH_|RESEND_|DATABASE_URL/);
    expect(LINE.toLowerCase()).not.toMatch(/\blease\b/);
    expect(LINE).not.toContain("CLOSE_AT");
  });
});
