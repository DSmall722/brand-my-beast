import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";

/**
 * Slice 12.43 — Drizzle migrate runbook markdown in repo.
 * CLOSE_AT null. No Stripe. No agent dashboard clicks.
 */
const RUNBOOK = join(process.cwd(), "docs/DRIZZLE-MIGRATE.md");

test.describe("slice 12.43: Drizzle migrate runbook", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
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

  test("runbook exists with fences and human-only apply rules", () => {
    expect(existsSync(RUNBOOK)).toBe(true);
    const text = readFileSync(RUNBOOK, "utf8");
    expect(text).toContain("12.43");
    expect(text).toMatch(/\$58,000|FLOOR_USD=58000/);
    expect(text).toMatch(/\$120,000|GOAL_USD=120000/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/drizzle\//i);
    expect(text).toMatch(/No dashboard clicks/i);
    expect(text).toMatch(/human only|Human only|human operator/i);
    expect(text).toMatch(/db:push|drizzle-kit push/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).toMatch(/No lease/i);
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
  });
});
