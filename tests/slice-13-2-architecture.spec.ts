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
 * Slice 13.2 — ARCHITECTURE.md: Postgres + Blob + Resend mock; no Stripe box.
 * CLOSE_AT null. No Stripe dependency.
 */
const ARCH = join(process.cwd(), "ARCHITECTURE.md");

test.describe("slice 13.2: ARCHITECTURE.md stack without Stripe box", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
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

  test("ARCHITECTURE.md names Postgres, Blob, Resend mock; Stripe not wired", () => {
    expect(existsSync(ARCH)).toBe(true);
    const text = readFileSync(ARCH, "utf8");
    expect(text).toContain("13.2");
    expect(text).toMatch(/Postgres/i);
    expect(text).toMatch(/Blob/i);
    expect(text).toMatch(/Resend mock|mailer double/i);
    // Slice 14.2 adds an explicit Stripe row; it must stay "not wired".
    expect(text).toMatch(/not wired/i);
    const stackSection = text.split("## Phases")[0] ?? text;
    expect(stackSection).toMatch(/^\| Stripe \|.*not wired/m);
    expect(stackSection).not.toMatch(/^\| Money \| Stripe/m);
    expect(text).toMatch(/\$58,000|FLOOR_USD/);
    expect(text).toMatch(/\$120,000|GOAL_USD/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
  });
});