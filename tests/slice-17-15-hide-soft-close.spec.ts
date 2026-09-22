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
 * Slice 17.15 — hide the soft-close block while CLOSE_AT is null
 * and bidding is not open. Do not set a clock.
 */

test.describe("slice 17.15: hide soft-close while bidding is closed", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("closed bidding hides the extension block; open bidding keeps it", async ({
    page,
    request,
  }) => {
    try {
      const closed = await request.post("/api/test/seats-open", {
        data: { open: false },
      });
      expect(closed.ok()).toBeTruthy();
      await page.goto("/panels/hood");
      await expect(page.getByTestId("panel-extended-until")).toHaveCount(0);
      const html = await page.content();
      expect(html).not.toContain("CLOSE_AT");
      expect(html).not.toContain("Soft-close extension");
      expect(CLOSE_AT).toBeNull();

      const opened = await request.post("/api/test/seats-open", {
        data: { open: true },
      });
      expect(opened.ok()).toBeTruthy();
      await page.goto("/panels/hood");
      await expect(page.getByTestId("panel-extended-until")).toHaveCount(0);
      await expect(page.getByText("Soft-close extension")).toHaveCount(0);
    } finally {
      const reset = await request.post("/api/test/seats-open", {
        data: { reset: true },
      });
      expect(reset.ok()).toBeTruthy();
    }
  });
});
