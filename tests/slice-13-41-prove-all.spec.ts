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
 * Slice 13.41 — prove-all.sh includes 9.6–9.10 and 12.45–12.46.
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

const PROVE_ALL = join(
  process.cwd(),
  ".cursor/skills/verify-brandmybeast/scripts/prove-all.sh",
);

const REQUIRED_SPECS = [
  "tests/slice-9-6-failed-winner-offer.spec.ts",
  "tests/slice-9-7-withdraw-pending.spec.ts",
  "tests/slice-9-8-edit-pending.spec.ts",
  "tests/slice-9-9-public-seat-log.spec.ts",
  "tests/slice-9-10-pledged-approved-only.spec.ts",
  "tests/slice-12-45-concurrent-hood.spec.ts",
  "tests/slice-12-46-reject-note.spec.ts",
] as const;

const REQUIRED_SLICE_IDS = [
  "9.6",
  "9.7",
  "9.8",
  "9.9",
  "9.10",
  "12.45",
  "12.46",
] as const;

test.describe("slice 13.41: prove-all includes 9.6–9.10 and 12.45–12.46", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("prove-all.sh lists and runs the required Playwright specs", () => {
    expect(existsSync(PROVE_ALL)).toBe(true);
    const body = readFileSync(PROVE_ALL, "utf8");
    expect(body).toContain("PROVE_ALL_PLAYWRIGHT_SPECS");
    expect(body).toContain("npx playwright test");
    expect(body).toContain("13.41");
    for (const id of REQUIRED_SLICE_IDS) {
      expect(body).toContain(id);
    }
    for (const spec of REQUIRED_SPECS) {
      expect(body).toContain(spec);
      expect(existsSync(join(process.cwd(), spec))).toBe(true);
    }
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body).not.toMatch(/stripe/i);
    expect(body).not.toContain("CLOSE_AT=");
  });

  test("homepage still locked while prove-all gains suites", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
