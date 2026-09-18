import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
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
 * Slice 14.20 — Press kit folder: avi, header, one stainless still,
 * one-paragraph fact sheet. No wrap-as-delivered. CLOSE_AT null. No Stripe.
 * No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();
const PRESS = join(ROOT, "press-kit");

const REQUIRED = [
  "avi.png",
  "header.png",
  "stainless-still.jpg",
  "FACT-SHEET.md",
  "README.md",
] as const;

test.describe("slice 14.20: press kit folder", () => {
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

  test("press-kit holds avi, header, stainless still, and fact sheet", () => {
    expect(existsSync(PRESS)).toBe(true);
    const names = readdirSync(PRESS);
    for (const file of REQUIRED) {
      expect(names, `missing ${file}`).toContain(file);
      expect(statSync(join(PRESS, file)).size).toBeGreaterThan(32);
    }
    // PNG / JPEG magic
    expect(readFileSync(join(PRESS, "avi.png")).subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(readFileSync(join(PRESS, "header.png")).subarray(0, 8)).toEqual(
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    );
    expect(readFileSync(join(PRESS, "stainless-still.jpg")).subarray(0, 2)).toEqual(
      Buffer.from([0xff, 0xd8]),
    );
  });

  test("fact sheet is one campaign paragraph without wrap-as-delivered", () => {
    const text = readFileSync(join(PRESS, "FACT-SHEET.md"), "utf8");
    expect(text).toContain("BrandMyBeast");
    expect(text).toContain("@BrandMyBeast");
    expect(text).toContain("hello@brandmybeast.com");
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text.toLowerCase()).toContain("twelve");
    expect(text.toLowerCase()).not.toMatch(/wrap-as-delivered/);
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(text).not.toMatch(/@gmail\.com/);
    // One campaign paragraph. Slice 16.19 adds the 1–12 board list after it.
    const body = text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith("#"));
    const paragraphs = body.filter((line) => !/^\d+\.\s+\S/.test(line));
    expect(paragraphs.length).toBe(1);
    expect(paragraphs[0]!.length).toBeGreaterThan(120);

    const readme = readFileSync(join(PRESS, "README.md"), "utf8");
    expect(readme.toLowerCase()).toContain("no wrap-as-delivered");
    expect(readme).toContain("stainless-still.jpg");
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
