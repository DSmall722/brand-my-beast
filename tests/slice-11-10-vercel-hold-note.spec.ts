import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD } from "../src/lib/campaign";

/**
 * Slice 11.10 — repo note only while the Vercel usage hold is on.
 * “Redeploy when the hold lifts.” No app change. No Stripe. No close clock.
 */
const NOTE = join(process.cwd(), "docs/VERCEL-HOLD.md");

test.describe("slice 11.10: Vercel hold redeploy note", () => {
  test("campaign constants stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
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

  test("hold note exists and forbids app / Stripe / close-clock changes", () => {
    expect(existsSync(NOTE)).toBe(true);
    const text = readFileSync(NOTE, "utf8");
    expect(text).toMatch(/Redeploy when the hold lifts/i);
    expect(text).toMatch(/No app change/i);
    expect(text).toMatch(/No Stripe/i);
    expect(text).toMatch(/Auction clock stays unset|close clock/i);
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).not.toContain("CLOSE_AT=");
  });
});
