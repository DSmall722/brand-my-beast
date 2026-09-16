import { readdirSync, readFileSync } from "node:fs";
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
  CAN_SPAM_PHYSICAL_ADDRESS,
  CAN_SPAM_UNSUBSCRIBE_URL,
  intentStatusEmailTemplate,
  operatorDigestEmailTemplate,
  waitlistOperatorEmailTemplate,
  withCanSpamFooter,
} from "../src/emails";
import type { IntentBid } from "../src/lib/intent";

/**
 * Slice 12.13 — unsubscribe + physical address on every mail (CAN-SPAM stub).
 * CLOSE_AT null. No Stripe. No personal home address.
 */
test.describe("slice 12.13: CAN-SPAM stub on every mail", () => {
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

  test("can-spam module exports unsubscribe URL and physical stub", () => {
    expect(CAN_SPAM_UNSUBSCRIBE_URL).toBe(
      "https://brandmybeast.com/unsubscribe",
    );
    expect(CAN_SPAM_PHYSICAL_ADDRESS).toContain(BRAND.name);
    expect(CAN_SPAM_PHYSICAL_ADDRESS).toContain("the operator");
    expect(CAN_SPAM_PHYSICAL_ADDRESS.toLowerCase()).toMatch(/stub/);
    expect(CAN_SPAM_PHYSICAL_ADDRESS.toLowerCase()).not.toMatch(/gmail/);
    const footer = withCanSpamFooter("Hello.");
    expect(footer).toContain("Unsubscribe:");
    expect(footer).toContain(CAN_SPAM_UNSUBSCRIBE_URL);
    expect(footer).toContain(CAN_SPAM_PHYSICAL_ADDRESS);
  });

  test("every email template includes CAN-SPAM footer", () => {
    const files = readdirSync(join(process.cwd(), "src/emails"));
    expect(files).toContain("can-spam.ts");

    const bid: IntentBid = {
      id: "b-12-13",
      panelId: "hood",
      userId: "test:a@example.com",
      brandLabel: "Spam Co",
      tradeLabel: "spam trade",
      standingUsd: 2500,
      depositUsd: 500,
      status: "listed",
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
      artworkUrl: null,
      proxyMaxUsd: null,
      floorSaveUsd: null,
      idempotencyKey: null,
      deletedAt: null,
    };

    const bodies = [
      intentStatusEmailTemplate({ kind: "listed", bid }).text,
      intentStatusEmailTemplate({ kind: "outbid", bid }).text,
      intentStatusEmailTemplate({ kind: "approved", bid }).text,
      intentStatusEmailTemplate({
        kind: "rejected",
        bid,
        note: "fix",
      }).text,
      waitlistOperatorEmailTemplate("join@example.com").text,
      operatorDigestEmailTemplate({
        pendingCount: 0,
        waitlistCount: 0,
        pledgedUsd: 0,
        shortfallFloorUsd: FLOOR_USD,
        shortfallGoalUsd: GOAL_USD,
        seatedPanels: 0,
        openSeats: 12,
        floorUsd: FLOOR_USD,
        goalUsd: GOAL_USD,
        closeAt: null,
        generatedAt: "2026-09-16T00:00:00.000Z",
      }).text,
    ];

    for (const text of bodies) {
      expect(text).toContain(CAN_SPAM_UNSUBSCRIBE_URL);
      expect(text).toContain(CAN_SPAM_PHYSICAL_ADDRESS);
      expect(text.toLowerCase()).not.toMatch(/\blease\b/);
    }
  });

  test("unsubscribe page stub is public", async ({ page }) => {
    await page.goto("/unsubscribe");
    await expect(page.getByTestId("unsubscribe-page")).toBeVisible();
    await expect(page.getByTestId("unsubscribe-physical-address")).toContainText(
      CAN_SPAM_PHYSICAL_ADDRESS,
    );
    await expect(page.getByRole("link", { name: BRAND.email })).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
