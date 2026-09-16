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
import {
  ARTWORK_MAX_DATA_URL_CHARS,
  ARTWORK_MAX_UPLOAD_BYTES,
  ARTWORK_MAX_URL_CHARS,
  parseIntentArtwork,
} from "../src/lib/intent-artwork";

/**
 * Slice 13.26 — art size cap documented (max bytes in RULES.md).
 */
const RULES = join(process.cwd(), "RULES.md");

test.describe("slice 13.26: RULES.md art size cap", () => {
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
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const cfg = JSON.parse(raw) as {
      git?: { deploymentEnabled?: boolean | Record<string, boolean> };
    };
    expect(cfg.git?.deploymentEnabled).toBe(false);
  });

  test("RULES.md documents max upload bytes matching ARTWORK_MAX_UPLOAD_BYTES", () => {
    expect(ARTWORK_MAX_UPLOAD_BYTES).toBe(90_000);
    expect(ARTWORK_MAX_DATA_URL_CHARS).toBe(120_000);
    expect(ARTWORK_MAX_URL_CHARS).toBe(2_000);

    expect(existsSync(RULES)).toBe(true);
    const text = readFileSync(RULES, "utf8");
    expect(text).toContain("13.26");
    expect(text).toMatch(/90,?000\s*bytes/i);
    expect(text).toContain("ARTWORK_MAX_UPLOAD_BYTES");
    expect(text).toContain("120,000");
    expect(text).toContain("2,000 characters");
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
  });

  test("parseIntentArtwork rejects oversize data URL uploads", () => {
    const tooBig =
      "data:image/png;base64," + "A".repeat(ARTWORK_MAX_DATA_URL_CHARS);
    const rejected = parseIntentArtwork({ artworkUpload: tooBig });
    expect(rejected.ok).toBe(false);
    if (rejected.ok) return;
    expect(rejected.error).toMatch(/too large/i);
    expect(rejected.error).toMatch(/90KB/i);

    const okUrl = parseIntentArtwork({
      artworkUrl: "https://cdn.example.com/mark.svg",
    });
    expect(okUrl.ok).toBe(true);
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
