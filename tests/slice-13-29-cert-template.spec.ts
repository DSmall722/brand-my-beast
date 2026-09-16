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
 * Slice 13.29 — docs/VAULT-CERTIFICATE.md template only.
 * No issued date until etch exists. CLOSE_AT null. No Stripe.
 */
const DOC = join(process.cwd(), "docs/VAULT-CERTIFICATE.md");

test.describe("slice 13.29: vault certificate markdown template", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("VAULT-CERTIFICATE.md is template-only with blank issued date", () => {
    expect(existsSync(DOC)).toBe(true);
    const text = readFileSync(DOC, "utf8");
    expect(text).toContain("13.29");
    expect(text).toMatch(/template only|markdown template/i);
    expect(text).toMatch(/Not issued|blank until/i);
    expect(text).toContain(
      "Issued date: (blank until Immortal etch exists on the panel)",
    );
    // No filled calendar issued date
    expect(text).not.toMatch(
      /Issued date:\s*\d{4}-\d{2}-\d{2}/i,
    );
    expect(text).not.toMatch(
      /Issued date:\s*(January|February|March|April|May|June|July|August|September|October|November|December)\b/i,
    );
    expect(text).toContain("$58,000");
    expect(text).toContain("$120,000");
    expect(text).toMatch(/\$58,001|\$119,999/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/Do not set `CLOSE_AT`|do not set/i);
    expect(text).toContain("hello@brandmybeast.com");
    expect(text).toMatch(/No lease|no lease/i);
    expect(text).toMatch(/until that piece of steel is gone/i);
    expect(text).toMatch(/Not a cash refund|no cash refund/i);
    expect(text).toMatch(/physical fragment/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
    expect(text.toLowerCase()).not.toContain("docusign");
  });

  test("homepage does not publish an issued vault certificate date", async ({
    page,
  }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html).not.toMatch(/Issued date:\s*\d{4}-\d{2}-\d{2}/i);
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
  });
});
