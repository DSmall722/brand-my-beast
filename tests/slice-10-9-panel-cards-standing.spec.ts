import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 10.9 — panel cards show standing brand or “Open.”
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.9: panel cards standing or Open", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
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

  test("unit: PUBLIC_COPY standingOpen is Open seat", () => {
    expect(PUBLIC_COPY.panels.standingOpen).toBe("Open seat");
    expect(PUBLIC_COPY.panels.standingOpen).not.toBe("Open.");
  });

  test("homepage: Open seat once; listed brand paints the card", async ({
    browser,
  }) => {
    const visitor = await browser.newPage();
    await visitor.goto("/#panels");
    await expect(visitor.getByTestId("panel-open-seat-once")).toHaveText(
      PUBLIC_COPY.panels.standingOpen,
    );
    expect(
      await visitor.getByTestId("panel-open-seat-once").count(),
    ).toBe(1);
    for (const panel of PANELS) {
      await expect(
        visitor.getByTestId(`panel-standing-${panel.id}`),
      ).toHaveText("");
      await expect(visitor.getByTestId(`panel-${panel.id}`)).toHaveAttribute(
        "data-standing",
        "open",
      );
    }
    const chorus = await visitor.locator(".panel-standing").allInnerTexts();
    expect(chorus.filter((line) => line.trim() === "Open.").length).toBe(0);
    await visitor.close();

    const bidder = await browser.newPage();
    await signIn(bidder, "panel109@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Card Face Co");
    await bidder.getByTestId("intent-trade").fill("panel card snacks");
    await bidder.getByTestId("intent-standing").fill("2500");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await bidder.close();

    const after = await browser.newPage();
    await after.goto("/#panels");
    await expect(after.getByTestId("panel-standing-hood")).toHaveText(
      "Card Face Co",
    );
    await expect(after.getByTestId("panel-hood")).toHaveAttribute(
      "data-standing",
      "held",
    );
    await expect(after.getByTestId("panel-standing-front-bumper")).toHaveText("");
    await expect(after.getByTestId("panel-open-seat-once")).toHaveText(
      "Open seat",
    );

    const html = await after.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    await after.close();
  });
});
