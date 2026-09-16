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
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  buildShopSeatPdf,
  shopPdfEtchLockState,
  shopPdfFinishForPanel,
  shopPdfSeatFromApproved,
} from "../src/lib/shop-pdf";

/**
 * Slice 13.21 — shop PDF embeds etch-lock state from pledged vs $120,000.
 */
test.describe("slice 13.21: shop PDF etch-lock from pledged", () => {
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const cfg = JSON.parse(raw) as {
      git?: { deploymentEnabled?: boolean | Record<string, boolean> };
    };
    expect(cfg.git?.deploymentEnabled).toBe(false);
  });

  test("etch-lock state flips at buyout for etchable panels", () => {
    const hood = PANELS.find((p) => p.id === "hood");
    expect(hood).toBeTruthy();
    if (!hood) return;

    const locked = shopPdfEtchLockState(hood, 0);
    expect(locked.etchLock).toBe("locked");
    expect(locked.etchLockLabel).toContain("$120,000");
    expect(locked.etchLockLabel).toMatch(/\$0/);

    const under = shopPdfEtchLockState(hood, GOAL_USD - 1);
    expect(under.etchLock).toBe("locked");

    const met = shopPdfEtchLockState(hood, GOAL_USD);
    expect(met.etchLock).toBe("unlocked");
    expect(met.etchLockLabel).toContain("$120,000");

    const finishLocked = shopPdfFinishForPanel(hood, 2_500);
    expect(finishLocked.finish).toBe("wrap_etch_locked");
    const finishOpen = shopPdfFinishForPanel(hood, GOAL_USD);
    expect(finishOpen.finish).toBe("wrap_or_etch");
  });

  test("wrap-only panel reports wrap_only etch-lock", () => {
    const wrapOnly = PANELS.find((p) => p.finishAtGoal === "wrap");
    expect(wrapOnly).toBeTruthy();
    if (!wrapOnly) return;
    const state = shopPdfEtchLockState(wrapOnly, GOAL_USD);
    expect(state.etchLock).toBe("wrap_only");
    expect(shopPdfFinishForPanel(wrapOnly, GOAL_USD).finish).toBe("wrap_only");
  });

  test("PDF bytes embed etch lock + pledged under and at buyout", async () => {
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_1321_shop",
      brandLabel: "EtchLock Pdf Co",
      tradeLabel: "etchlock vinyl",
      standingUsd: 2500,
      artworkUrl: "https://cdn.example.com/etchlock1321.svg",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    await setIntentStatus(placed.bid.id, "approved");

    const lockedSeat = shopPdfSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: 2500,
    });
    expect(lockedSeat.ok).toBe(true);
    if (!lockedSeat.ok) return;
    expect(lockedSeat.seat.etchLock).toBe("locked");
    expect(lockedSeat.seat.finish).toBe("wrap_etch_locked");
    expect(lockedSeat.seat.pledgedUsd).toBe(2500);

    const lockedPdf = Buffer.from(buildShopSeatPdf(lockedSeat.seat)).toString(
      "utf8",
    );
    expect(lockedPdf.startsWith("%PDF-1.4")).toBe(true);
    expect(lockedPdf).toContain("Etch lock: locked");
    expect(lockedPdf).toContain("Finish code: wrap_etch_locked");
    expect(lockedPdf).toContain("Pledged standing: $2,500");
    expect(lockedPdf).toContain("$120,000");
    expect(lockedPdf).toContain("$58,000");
    expect(lockedPdf.toLowerCase()).not.toMatch(/\blease\b/);

    const unlockedSeat = shopPdfSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: GOAL_USD,
    });
    expect(unlockedSeat.ok).toBe(true);
    if (!unlockedSeat.ok) return;
    expect(unlockedSeat.seat.etchLock).toBe("unlocked");
    expect(unlockedSeat.seat.finish).toBe("wrap_or_etch");

    const unlockedPdf = Buffer.from(
      buildShopSeatPdf(unlockedSeat.seat),
    ).toString("utf8");
    expect(unlockedPdf).toContain("Etch lock: unlocked");
    expect(unlockedPdf).toContain("Finish code: wrap_or_etch");
    expect(unlockedPdf).toContain("Pledged standing: $120,000");
    expect(unlockedPdf).toContain("meets buyout $120,000");
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
