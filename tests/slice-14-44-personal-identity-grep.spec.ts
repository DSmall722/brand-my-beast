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
import {
  PERSONAL_HANDLE_NEEDLE,
  findPersonalHandleHits,
  findPersonalIdentityHits,
  isAllowlistedPersonalHandleLine,
  personalHandleMatchesInText,
} from "../src/lib/no-personal-identity";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.44 — CI grep: fail on personal Gmail and personal handle.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();

test.describe("slice 14.44: CI grep personal Gmail + personal handle", () => {
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

  test("unit: handle needle matches; allowlist only SLICES 16.40 doc line", () => {
    expect(PERSONAL_HANDLE_NEEDLE.startsWith("@")).toBe(true);
    expect(personalHandleMatchesInText(`see ${PERSONAL_HANDLE_NEEDLE} once`)).toEqual([
      PERSONAL_HANDLE_NEEDLE,
    ]);
    expect(
      isAllowlistedPersonalHandleLine(
        "SLICES.md",
        `- [ ] 16.40 No personal Gmail / ${PERSONAL_HANDLE_NEEDLE} regression grep (ties 14.44).`,
      ),
    ).toBe(true);
    expect(
      isAllowlistedPersonalHandleLine(
        "README.md",
        `Contact ${PERSONAL_HANDLE_NEEDLE}`,
      ),
    ).toBe(false);
  });

  test("CI grep: src/ + *.md have zero personal Gmail and zero personal handle", () => {
    const hits = findPersonalIdentityHits();
    expect(hits.gmail).toEqual([]);
    expect(hits.handle).toEqual([]);
    expect(findPersonalHandleHits()).toEqual([]);
  });

  test("package.json grep:identity script is pinned", () => {
    const pkg = JSON.parse(
      readFileSync(join(ROOT, "package.json"), "utf8"),
    ) as { scripts?: Record<string, string> };
    expect(pkg.scripts?.["grep:identity"]).toBe(
      "node scripts/grep-personal-identity.mjs",
    );
  });

  test("homepage HTML has no personal Gmail or personal handle", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("hello@brandmybeast.com");
    expect(html).toContain("@BrandMyBeast");
    expect(html).not.toMatch(/[A-Za-z0-9._%+-]+@gmail\.com/i);
    expect(personalHandleMatchesInText(html)).toEqual([]);
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
