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
 * Slice 16.12 — PUBLIC_COPY panel lead mentions the numbered cards.
 * No H1 rewrite. CLOSE_AT null. No Stripe. No SEATS_OPEN flip.
 */

const LOCKED_H1 = "Put your brand on the truck people already photograph.";
const PANEL_PHRASE = "Eleven seats. Opening prices below.";

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

  test("panel lead mentions the phrase and H1 stays locked", () => {
    expect(PUBLIC_COPY.hero.h1).toBe(LOCKED_H1);
    expect(PUBLIC_COPY.panels.leadLines).toHaveLength(3);
    expect(PUBLIC_COPY.panels.lead).toContain(PANEL_PHRASE);
    expect(PUBLIC_COPY.panels.lead.toLowerCase()).not.toMatch(/\blease\b/);
    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    for (const line of PUBLIC_COPY.panels.leadLines) {
      expect(md).toContain(line);
    }
    expect(md).toContain(LOCKED_H1);
  });

  test("homepage shows the panel lead and the unchanged H1", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(LOCKED_H1);
    await expect(page.getByTestId("panels-lead")).toContainText(PANEL_PHRASE);
    for (const line of PUBLIC_COPY.panels.leadLines) {
      await expect(page.getByTestId("panels-lead")).toContainText(line);
    }
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/i);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
