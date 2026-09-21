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
 * Slice 17.17 — seat 2 active polygon sits on the front bumper.
 * Same preview still. No new photos. CLOSE_AT null. No Stripe.
 */

const FRONT = "/truck-view-front.jpg";

function inside(
  inner: { x: number; y: number; width: number; height: number },
  outer: { x: number; y: number; width: number; height: number },
  pad = 2,
): boolean {
  return (
    inner.x >= outer.x - pad &&
    inner.y >= outer.y - pad &&
    inner.x + inner.width <= outer.x + outer.width + pad &&
    inner.y + inner.height <= outer.y + outer.height + pad
  );
}

test.describe("slice 17.17: seat 2 polygon on the bumper", () => {
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

  test("front fascia polygon stays on the owning front still", async ({
    page,
  }) => {
    await page.goto("/panels/front-fascia");
    const photo = page.locator(".truck-view-photo");
    await expect(photo).toHaveAttribute("src", FRONT);
    const photoBox = await photo.boundingBox();
    if (!photoBox) throw new Error("photo missing");

    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-polygons",
      "outline",
    );
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-single-seat",
      "true",
    );
    const seat = page.getByTestId("truck-seat-front-fascia");
    await expect(seat).toHaveAttribute("data-active", "true");
    await expect(seat).toHaveAttribute("data-seat-label", "(2) Front fascia");
    const seatBox = await seat.boundingBox();
    if (!seatBox) throw new Error("seat missing");
    expect(inside(seatBox, photoBox, 8)).toBe(true);
    await expect(page.getByTestId("truck-seat-label-front-fascia")).toHaveText(
      "(2) Front fascia",
    );
  });
});
