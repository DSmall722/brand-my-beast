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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.16 — docs/STATUS.md last-slice line follows SLICES **Now**.
 * Floor and buyout rows are not hand-edited. FEATURES.md stays off /.
 */

const STATUS = join(process.cwd(), "docs/STATUS.md");
const SLICES = join(process.cwd(), "SLICES.md");

function slicesNowId(text: string): string {
  const match = text.match(/^\*\*Now:\*\*\s+(\d+\.\d+)/m);
  expect(match, "SLICES **Now** id").not.toBeNull();
  return match?.[1] ?? "";
}

test.describe("slice 16.16: STATUS last-slice line follows SLICES Now", () => {
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

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("last-slice line copies SLICES Now; money rows stay", () => {
    const slices = readFileSync(SLICES, "utf8");
    const status = readFileSync(STATUS, "utf8");
    const nowId = slicesNowId(slices);

    expect(status).toContain("14.9");
    expect(status).toContain(
      `| Last slice id | **${nowId}** — copied from \`SLICES.md\` **Now**. Money rows are not hand-edited. |`,
    );
    expect(status).toContain(`| Floor | **${formatUsd(FLOOR_USD)}** |`);
    expect(status).toContain(
      `| Buyout / goal | **${formatUsd(GOAL_USD)}** |`,
    );
    expect(status).toMatch(/\*\*null\*\*/);
    expect(status).toMatch(/not wired/i);
    expect(status.toLowerCase()).not.toContain("gmail.com");
    expect(status.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
