import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD, formatUsd } from "../src/lib/campaign";

/**
 * Slice 12.44 — Neon PITR restore-drill checklist next to 11.6.
 * CLOSE_AT null. No Stripe. No agent dashboard clicks.
 */
const DRILL = join(process.cwd(), "docs/NEON-PITR-DRILL.md");
const RUNBOOK = join(process.cwd(), "docs/NEON-PITR.md");

test.describe("slice 12.44: Neon PITR restore drill doc", () => {
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

  test("drill checklist exists beside PITR runbook with fences", () => {
    expect(existsSync(RUNBOOK)).toBe(true);
    expect(existsSync(DRILL)).toBe(true);
    const text = readFileSync(DRILL, "utf8");
    expect(text).toContain("12.44");
    expect(text).toContain("NEON-PITR.md");
    expect(text).toMatch(/\$58,000|FLOOR_USD=58000/);
    expect(text).toMatch(/\$120,000|GOAL_USD=120000/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/No dashboard clicks/i);
    expect(text).toMatch(/human only|Human only|human operator/i);
    expect(text).toMatch(/- \[ \]/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text).toMatch(/No lease/i);
    expect(text.toLowerCase()).not.toContain("stripe setupintent");

    const parent = readFileSync(RUNBOOK, "utf8");
    expect(parent).toContain("NEON-PITR-DRILL.md");
  });
});
