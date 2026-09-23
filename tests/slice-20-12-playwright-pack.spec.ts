import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  SEATS_OPEN,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 20.12 — Wave 20 Playwright pack.
 * 20.1–20.11 + locked H1 + Notify me + $58,000 / $120,000 + no lease.
 */

const ROOT = process.cwd();
const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";

test.describe("slice 20.12: Wave 20 Playwright pack", () => {
  test.describe.configure({ mode: "serial" });

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

  test("SEATS_OPEN is not flipped in campaign.ts", () => {
    const src = readFileSync(join(ROOT, "src/lib/campaign.ts"), "utf8");
    expect(src).toMatch(/export const SEATS_OPEN/);
    expect(src).toMatch(/export const CLOSE_AT:\s*string\s*\|\s*null\s*=\s*null/);
    expect(process.env.SEATS_OPEN ?? "").not.toMatch(/^(false|0)$/i);
    expect(SEATS_OPEN).toBe(true);
  });

  test("homepage pack: H1, Notify me, money, copy, no lease", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");
    await expect(
      page.locator(".site-header").getByRole("link", { name: PUBLIC_COPY.header.nav }),
    ).toHaveText("Contact BMB");
    await expect(page.getByTestId("panel-open-seat-once")).toHaveCount(0);
    await expect(page.getByTestId("shortfall-floor")).toHaveCount(0);
    await expect(page.getByTestId("shortfall-goal")).toHaveCount(0);
    await expect(page.getByTestId("truck-view-legend")).toHaveCount(0);
    await expect(page.getByTestId("want-all-panels")).toHaveText(
      PUBLIC_COPY.board.wantAllPanels,
    );
    await expect(page.getByTestId("faq-campaign-miss")).toContainText(
      "Every hold is released. Nobody is charged.",
    );
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      PUBLIC_COPY.meta.description,
    );
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("Held = standing intent");
    expect(html).not.toContain("The package is 1 Hood");
    expect(html).not.toContain("Bid on a panel");
    expect(html).not.toContain("Short of floor");
    expect(html).not.toContain("Short of buyout");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });

  test("404 is back-to-board; hood PNG sign-in hides while closed", async ({
    page,
    request,
  }) => {
    const notFound = await page.goto("/this-is-not-a-panel-route");
    expect(notFound?.status()).toBe(404);
    await expect(page.getByTestId("not-found-home")).toHaveText(
      PUBLIC_COPY.chrome.backToBoard,
    );

    const closed = await request.post("/api/test/seats-open", {
      data: { open: false },
    });
    expect(closed.ok()).toBeTruthy();
    try {
      await page.goto("/panels/hood");
      await expect(page.getByTestId("panel-intent-page")).toBeVisible();
      await expect(page.getByTestId("seat-export-png-signin")).toHaveCount(0);
      const visible = await page.locator("body").innerText();
      expect(visible).not.toContain("Sign in to download a seat PNG");
      expect(visible).not.toContain("Sign in to list an intent");
    } finally {
      await request.post("/api/test/seats-open", { data: { reset: true } });
    }
  });

  test("mobile board stays off the cab glass", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByTestId("hero-panel-board")).toHaveCount(0);
    for (let n = 1; n <= 11; n += 1) {
      await expect(page.getByTestId(`hero-panel-board-${n}`)).toHaveCount(0);
    }
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
  });
});
