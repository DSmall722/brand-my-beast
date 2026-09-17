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
 * Slice 14.2 — ARCHITECTURE.md: Postgres + Blob + Resend mock.
 * Stripe box = “not wired.” CLOSE_AT null. No Stripe package. No clock.
 */

const ARCH = join(process.cwd(), "ARCHITECTURE.md");

test.describe("slice 14.2: ARCHITECTURE Stripe box not wired", () => {
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

  test("ARCHITECTURE.md stack: Postgres, Blob, Resend mock, Stripe not wired", () => {
    expect(existsSync(ARCH)).toBe(true);
    const text = readFileSync(ARCH, "utf8");
    expect(text).toContain("14.2");
    expect(text).toMatch(/Postgres/i);
    expect(text).toMatch(/Blob/i);
    expect(text).toMatch(/Resend mock|mailer double/i);

    const stackSection = text.split("## Phases")[0] ?? text;
    expect(stackSection).toMatch(/^\| Data \|.*Postgres/m);
    expect(stackSection).toMatch(/^\| Blobs \|/m);
    expect(stackSection).toMatch(/^\| Mail \|.*Resend/m);
    expect(stackSection).toMatch(/^\| Stripe \| \*\*not wired\.\*\*/m);
    expect(stackSection).not.toMatch(/SetupIntent.*(wired|live|enabled)/i);
    expect(text).toMatch(/Do not start the 30-day clock/i);
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/Wave 15/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
  });
});
