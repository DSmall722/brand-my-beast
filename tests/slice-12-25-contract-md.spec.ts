import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  WRECK_REFUND_RULE_IDS,
  formatUsd,
} from "../src/lib/campaign";
import {
  CONTRACT_NOT_SIGNATURE,
  CONTRACT_WRECK_CLAUSES,
  buildContractMarkdown,
} from "../src/lib/contract-markdown";

/**
 * Slice 12.25 — contract markdown template from CAMPAIGN wreck rules.
 * Not a signature product. CLOSE_AT null. No lease.
 */
test.describe("slice 12.25: contract markdown template", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
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

  test("buildContractMarkdown covers wreck rules and is not a signature product", () => {
    expect(CONTRACT_WRECK_CLAUSES.map((c) => c.id)).toEqual([
      ...WRECK_REFUND_RULE_IDS,
    ]);

    const md = buildContractMarkdown();
    expect(md).toContain("# BrandMyBeast — seat contract template");
    expect(md).toContain(CONTRACT_NOT_SIGNATURE);
    expect(md).toContain("Not a signature product");
    expect(md.toLowerCase()).not.toContain("docusign");
    expect(md.toLowerCase()).not.toContain("e-sign vendor");
    expect(md).toContain("## Wreck and refund");
    expect(md).toContain("Campaign miss");
    expect(md).toContain("Wrap year cut short");
    expect(md).toContain("Immortal etch already installed");
    expect(md).toContain("pro-rata");
    expect(md).toContain("vault certificate");
    expect(md).toContain("$58,000");
    expect(md).toContain("$120,000");
    expect(md).toContain("$119,999");
    expect(md).toContain("12 months from install day");
    expect(md).toContain("CLOSE_AT unset");
    expect(md).toContain(BRAND.email);
    expect(md.toLowerCase()).not.toMatch(/\blease\b/);
    expect(md).not.toContain("Stripe");
  });

  test("CONTRACT.md on disk matches wreck fences and not-signature line", () => {
    const disk = readFileSync(join(process.cwd(), "CONTRACT.md"), "utf8");
    expect(disk).toContain("Not a signature product");
    expect(disk).toContain("$58,000");
    expect(disk).toContain("$120,000");
    expect(disk).toContain("$119,999");
    expect(disk).toContain("Campaign miss");
    expect(disk).toContain("pro-rata");
    expect(disk).toContain("vault certificate");
    expect(disk).toContain("CLOSE_AT unset");
    expect(disk.toLowerCase()).not.toMatch(/\blease\b/);
    expect(disk).not.toContain("Stripe");
    expect(disk.toLowerCase()).not.toContain("docusign");

    const built = buildContractMarkdown();
    expect(disk.trim()).toBe(built.trim());
  });

  test("homepage does not render CONTRACT.md as a signature product", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("wreck-refund-faq")).toHaveCount(0);
    await expect(page.getByTestId("faq-campaign-miss")).toBeVisible();
    const html = await page.content();
    expect(html).not.toContain("DocuSign");
    expect(html).not.toContain("signature product");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
