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
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 7.9 — /privacy and /terms stubs from CAMPAIGN + PUBLIC_COPY only.
 * Footer links them. No invented legal terms.
 */
test.describe("slice 7.9: privacy and terms stubs", () => {
  test("campaign money fences stay locked", () => {
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

  test("footer links privacy and terms; keeps PUBLIC_COPY strings", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("site-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    await expect(page.getByTestId("site-footer-independent")).toHaveCount(0);
    await expect(page.getByTestId("footer-privacy-link")).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(page.getByTestId("footer-terms-link")).toHaveAttribute(
      "href",
      "/terms",
    );
  });

  test("privacy stub uses hello@ and PUBLIC_COPY lines only", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toContainText(
      BRAND.email,
    );
    await expect(page.getByTestId("privacy-waitlist")).toContainText(
      PUBLIC_COPY.waitlist.idleNote,
    );
    // Slice 13.39 — waitlist retention locked on the privacy stub.
    await expect(page.getByTestId("privacy-waitlist-retention")).toHaveText(
      PUBLIC_COPY.waitlist.retention,
    );
    await expect(page.getByTestId("privacy-independent")).toContainText(
      PUBLIC_COPY.footer.independent,
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
    expect(html).not.toMatch(/gdpr|ccpa|liability|indemnif|arbitration/);
  });

  test("terms stub uses floor refund and intent copy", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByTestId("terms-page")).toBeVisible();
    await expect(page.getByTestId("terms-floor")).toContainText("$58,000");
    await expect(page.getByTestId("terms-floor")).toContainText(
      "Full refund. No order. No wrap. No Immortal Etch.",
    );
    await expect(page.getByTestId("terms-intent")).toContainText(
      "Cards are not charged until the money path is live",
    );
    // Slice 13.38 — exact phrase locked on the terms stub.
    await expect(page.getByTestId("terms-intent-not-charge")).toHaveText(
      PUBLIC_COPY.footer.intentNotACharge,
    );
    await expect(page.getByTestId("terms-clock")).toHaveText(
      "When seats open. There is no date on this page yet.",
    );
    await expect(page.getByTestId("terms-contact")).toContainText(BRAND.email);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/gdpr|ccpa|liability|indemnif|arbitration/);
  });
});
