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
 * Slice 17.8 — Front / Rear hide the side-body SVG schematic.
 * Each view uses its own stainless still. CLOSE_AT null. No Stripe.
 */

const SIDE = "/truck-view-side.jpg";
const FRONT = "/truck-view-front.jpg";
const REAR = "/truck-view-rear.jpg";
const COMPONENT = join(process.cwd(), "src/components/TruckViewHotspots.tsx");

test.describe("slice 17.8: front and rear hide the side schematic", () => {
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

  test("component uses a dedicated still per view", () => {
    const src = readFileSync(COMPONENT, "utf8");
    expect(src).toContain("truckViewStillSrc");
    expect(src).toContain('view === "side"');
  });

  test("front and rear drop the side body; each view has its still", async ({
    page,
  }) => {
    await page.goto("/");
    const photo = page.locator(".truck-view-photo");
    await expect(photo).toHaveAttribute("src", SIDE);
    await expect(page.locator(".truck-view-body")).toHaveCount(1);
    await expect(page.locator(".truck-view-cab")).toHaveCount(1);

    await page.getByTestId("truck-view-front").click();
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-view",
      "front",
    );
    await expect(page.locator(".truck-view-body")).toHaveCount(0);
    await expect(page.locator(".truck-view-cab")).toHaveCount(0);
    await expect(photo).toHaveAttribute("src", FRONT);
    await expect(page.getByTestId("truck-seat-front-fascia")).toBeVisible();

    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-view",
      "rear",
    );
    await expect(page.locator(".truck-view-body")).toHaveCount(0);
    await expect(page.locator(".truck-view-cab")).toHaveCount(0);
    await expect(photo).toHaveAttribute("src", REAR);
    await expect(page.getByTestId("truck-seat-tailgate")).toBeVisible();
  });
});
