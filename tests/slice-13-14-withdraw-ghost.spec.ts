import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "../src/lib/campaign";
import { activeStandingUsd, type IntentBid } from "../src/lib/intent";
import {
  loadStandingHoldersByPanel,
  placeIntentBid,
  resetIntentStoreForTests,
  standingForPanel,
  withdrawPendingIntent,
} from "../src/lib/intent-store";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 13.14 — withdraw of the only pending mark leaves no ghost standing.
 */
test.describe("slice 13.14: withdraw leaves no ghost standing", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
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

  test("RULES.md documents withdraw ghost standing", () => {
    const rules = readFileSync(join(process.cwd(), "RULES.md"), "utf8");
    expect(rules).toMatch(/13\.14/);
    expect(rules).toMatch(/ghost standing/i);
    expect(rules).toContain("$58,000");
    expect(rules).toContain("$120,000");
  });

  test("unit: activeStandingUsd ignores withdrawn and outbid", () => {
    const hood = PANELS.find((p) => p.id === "hood")!;
    const rows: Pick<IntentBid, "status" | "standingUsd" | "floorSaveUsd">[] = [
      { status: "withdrawn", standingUsd: 5000, floorSaveUsd: null },
      { status: "outbid", standingUsd: 4000, floorSaveUsd: null },
      { status: "listed", standingUsd: 3500, floorSaveUsd: 3500 },
    ];
    expect(activeStandingUsd(rows, hood.openingUsd)).toBe(hood.openingUsd);
    expect(
      activeStandingUsd(
        [{ status: "listed", standingUsd: 3000, floorSaveUsd: null }],
        hood.openingUsd,
      ),
    ).toBe(3000);
  });

  test("sole pending withdraw restores opening; outbid cannot ghost", async () => {
    const sole = await placeIntentBid({
      panelId: "hood",
      userId: "wg1314-sole",
      brandLabel: "WG Sole",
      tradeLabel: "wg1314 sole",
      standingUsd: 3000,
    });
    expect(sole.ok).toBe(true);
    if (!sole.ok) return;
    expect(await standingForPanel("hood")).toBe(3000);

    const withdrawn = await withdrawPendingIntent({
      bidId: sole.bid.id,
      userId: "wg1314-sole",
    });
    expect(withdrawn.ok).toBe(true);
    if (!withdrawn.ok) return;
    expect(withdrawn.bid.status).toBe("withdrawn");
    expect(await standingForPanel("hood")).toBe(2500);
    expect((await loadStandingHoldersByPanel()).get("hood")).toBeUndefined();

    // Challenger then withdraws — leftover outbid must not ghost standing.
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "wg1314-a",
      brandLabel: "WG Alpha",
      tradeLabel: "wg1314 snacks",
      standingUsd: 2500,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "wg1314-b",
      brandLabel: "WG Beta",
      tradeLabel: "wg1314 tools",
      standingUsd: 2750,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;
    expect(await standingForPanel("hood")).toBe(2750);

    const dropChallenger = await withdrawPendingIntent({
      bidId: second.bid.id,
      userId: "wg1314-b",
    });
    expect(dropChallenger.ok).toBe(true);
    if (!dropChallenger.ok) return;

    // First is still outbid — not restored. Standing = opening, not 2750 ghost.
    expect(await standingForPanel("hood")).toBe(2500);
    expect((await loadStandingHoldersByPanel()).get("hood")).toBeUndefined();
    expect(CLOSE_AT).toBeNull();
  });

  test("UI: sole pending withdraw shows opening standing", async ({
    browser,
  }) => {
    const page = await browser.newPage();
    await signIn(page, "wg1314-ui@example.com");
    await page.goto("/panels/rear-bumper");
    await page.getByTestId("intent-brand").fill("WG UI");
    await page.getByTestId("intent-trade").fill("wg1314 ui");
    await page.getByTestId("intent-standing").fill("500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await expect(page.getByTestId("panel-standing")).toHaveText("$500");

    await page.goto("/account");
    const row = page.locator('[data-testid^="account-intent-"]').first();
    await expect(row).toBeVisible();
    const bidId = (await row.getAttribute("data-testid"))!.replace(
      "account-intent-",
      "",
    );
    await page.getByTestId(`intent-withdraw-submit-${bidId}`).click();
    await expect(row).toContainText("Withdrawn", { timeout: 10_000 });

    await page.goto("/panels/rear-bumper");
    await expect(page.getByTestId("panel-standing")).toHaveText("$500");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(CLOSE_AT).toBeNull();
    await page.close();
  });
});
