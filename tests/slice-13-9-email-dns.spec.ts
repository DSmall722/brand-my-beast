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

/**
 * Slice 13.9 — docs/EMAIL-DNS.md SPF/DKIM/DMARC checklist for hello@.
 * CLOSE_AT null. No Stripe. No live send from agents.
 */
const DOC = join(process.cwd(), "docs/EMAIL-DNS.md");

test.describe("slice 13.9: EMAIL-DNS checklist", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
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

  test("EMAIL-DNS.md covers SPF/DKIM/DMARC for hello@", () => {
    expect(existsSync(DOC)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("13.9");
    expect(text).toMatch(/SPF/);
    expect(text).toMatch(/DKIM/);
    expect(text).toMatch(/DMARC/);
    expect(text).toMatch(/- \[ \]/);
    expect(text).toContain("hello@brandmybeast.com");
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/Does not set|do not set/i);
    expect(text).toMatch(/No lease|no lease/i);
    expect(text).toMatch(/Resend/);
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
    // Personal inbox as From is banned; checklist may say "not a personal Gmail"
    expect(text).not.toMatch(/@[a-z0-9.-]*gmail\.com/i);
  });
});
