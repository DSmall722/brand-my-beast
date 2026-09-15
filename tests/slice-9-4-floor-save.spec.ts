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
import {
  assertIntentOnly,
  isCampaignShortOfFloor,
  isFloorSaveBid,
} from "../src/lib/intent";
import {
  listBidsForPanel,
  loadBoardIntentStats,
  placeIntentBid,
  resetIntentStoreForTests,
  standingForPanel,
} from "../src/lib/intent-store";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 9.4 — floor-save intent row: if short of $58,000, raise this seat to Y.
 * Stored, not charged. CLOSE_AT stays null.
 */
test.describe("slice 9.4: floor-save intent", () => {
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
    expect(isCampaignShortOfFloor(0)).toBe(true);
    expect(isCampaignShortOfFloor(57_999)).toBe(true);
    expect(isCampaignShortOfFloor(58_000)).toBe(false);
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

  test("migration adds floor_save_usd without capture columns", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0011_floor_save_usd.sql"),
      "utf8",
    );
    expect(sql).toMatch(/floor_save_usd/);
    expect(sql.toLowerCase()).not.toMatch(/stripe/);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
  });

  test("floor-save stores Y without displacing standing or charging", async () => {
    const holder = await placeIntentBid({
      panelId: "hood",
      userId: "floor_holder",
      brandLabel: "Standing Hold",
      tradeLabel: "floor snacks",
      standingUsd: 2500,
    });
    expect(holder.ok).toBeTruthy();
    if (!holder.ok) return;

    const save = await placeIntentBid({
      panelId: "hood",
      userId: "floor_saver",
      brandLabel: "Floor Save Co",
      tradeLabel: "floor tools",
      floorSaveUsd: 4000,
    });
    expect(save.ok).toBeTruthy();
    if (!save.ok) return;
    expect(isFloorSaveBid(save.bid)).toBe(true);
    expect(save.bid.floorSaveUsd).toBe(4000);
    expect(save.bid.standingUsd).toBe(4000);
    expect(save.bid.status).toBe("listed");
    assertIntentOnly(save.bid);

    const listed = await listBidsForPanel("hood");
    expect(listed.find((row) => row.id === holder.bid.id)?.status).toBe(
      "listed",
    );
    expect(listed.find((row) => row.id === save.bid.id)?.status).toBe("listed");
    expect(await standingForPanel("hood")).toBe(2500);

    const board = await loadBoardIntentStats();
    expect(board.pledgedUsd).toBe(0);
    expect(CLOSE_AT).toBeNull();
  });

  test("normal outbid leaves floor-save row listed", async () => {
    const save = await placeIntentBid({
      panelId: "hood",
      userId: "save_only",
      brandLabel: "Save Only",
      tradeLabel: "save vinyl",
      floorSaveUsd: 5000,
    });
    expect(save.ok).toBeTruthy();
    if (!save.ok) return;

    const challenger = await placeIntentBid({
      panelId: "hood",
      userId: "normal_bid",
      brandLabel: "Normal Bid",
      tradeLabel: "normal tools",
      standingUsd: 2500,
    });
    expect(challenger.ok).toBeTruthy();
    if (!challenger.ok) return;

    const listed = await listBidsForPanel("hood");
    expect(listed.find((row) => row.id === save.bid.id)?.status).toBe("listed");
    expect(listed.find((row) => row.id === challenger.bid.id)?.status).toBe(
      "listed",
    );
    expect(await standingForPanel("hood")).toBe(2500);
  });

  test("seat form lists floor-save with badge — no card, CLOSE_AT null", async ({
    page,
  }) => {
    await signIn(page, "floor94@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-floor-save")).toBeVisible();
    await expect(page.getByTestId("intent-floor-save-note")).toContainText(
      "not charged",
    );
    await page.getByTestId("intent-brand").fill("Floor Save UI");
    await page.getByTestId("intent-trade").fill("floor ui snacks");
    await page.getByTestId("intent-standing").fill("3500");
    await page.getByTestId("intent-floor-save").check();
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "Floor-save listed",
      { timeout: 10_000 },
    );
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await expect(page.getByTestId("intent-list")).toContainText("Floor Save UI");
    await expect(page.getByTestId("intent-list")).toContainText(
      "if short of $58,000",
    );
    await expect(page.getByTestId("panel-standing")).toHaveText("$2,500");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(CLOSE_AT).toBeNull();
  });
});
