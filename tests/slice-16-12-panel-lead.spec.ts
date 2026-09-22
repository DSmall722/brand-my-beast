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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * QA 1047PM — Bid on a Panel lead is the select-a-panel line.
 * Unlock copy lives under Immortal Etch. CLOSE_AT null. No Stripe.
 */

const LOCKED_H1 = "Advertise your brand on the truck that people already photograph";
const PANEL_SELECT = "Select a panel below for more details.";
const ETCH_UNLOCK =
  "Once total active bids cross $120,000, buyers will unlock the option to have their advertisement permanently etched on the stainless surface for 3x the final bid for that panel.";

test.describe("slice 16.12: panel lead matches the numbered cards", () => {
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

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("panel lead selects a panel; unlock copy is on Immortal Etch", () => {
    expect(PUBLIC_COPY.hero.h1).toBe(LOCKED_H1);
    expect(PUBLIC_COPY.panels.leadLines).toEqual([PANEL_SELECT]);
    expect(PUBLIC_COPY.panels.lead).toBe(PANEL_SELECT);
    expect(PUBLIC_COPY.etch.unlock).toContain(ETCH_UNLOCK);
    expect(PUBLIC_COPY.panels.lead.toLowerCase()).not.toMatch(/\blease\b/);
    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain(PANEL_SELECT);
    expect(md).toContain(ETCH_UNLOCK);
    expect(md).toContain(LOCKED_H1);
  });

  test("homepage shows the panel lead and the unchanged H1", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.getByTestId("panels-lead")).toHaveText(PANEL_SELECT);
    await expect(page.getByTestId("etch-unlock")).toContainText(ETCH_UNLOCK);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
