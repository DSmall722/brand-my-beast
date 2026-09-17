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
import {
  findPersonalGmailHits,
  listPersonalGmailScanTargets,
  personalGmailMatchesInText,
} from "../src/lib/no-personal-gmail";

/**
 * Slice 13.40 — no personal Gmail in git grep of src/ + *.md.
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.40: no personal Gmail in src + md", () => {
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

  test("unit: personal address matches; bare domain guard does not", () => {
    expect(
      personalGmailMatchesInText('contact ops@gmail.com please'),
    ).toEqual(["ops@gmail.com"]);
    expect(
      personalGmailMatchesInText('if (raw.includes("@gmail.com")) return false;'),
    ).toEqual([]);
    expect(
      personalGmailMatchesInText("Never emit the operator’s personal Gmail."),
    ).toEqual([]);
  });

  test("git-grep surface: src/ + *.md have zero personal Gmail addresses", () => {
    const targets = listPersonalGmailScanTargets();
    expect(targets.some((p) => p.includes(`${"src"}/`))).toBe(true);
    expect(targets.some((p) => p.endsWith(".md"))).toBe(true);
    const hits = findPersonalGmailHits();
    expect(hits).toEqual([]);
  });

  test("homepage still public-only — no gmail address in HTML", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("hello@brandmybeast.com");
    expect(html).not.toMatch(/[A-Za-z0-9._%+-]+@gmail\.com/i);
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
