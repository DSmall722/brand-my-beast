import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  WINNER_PACKET_WRAP_TERM,
  WINNER_PACKET_WRAP_TERM_START,
  assertWinnerPacketWrapTermStartIsInstallDay,
  buildWinnerPacketMarkdown,
  winnerPacketSeatFromApproved,
  winnerPacketWrapTermStart,
} from "../src/lib/winner-packet";

/**
 * Slice 13.23 — winner packet wrap term start = install day, not close.
 */
test.describe("slice 13.23: winner packet wrap term start", () => {
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("wrap term start helper is install day and rejects close", () => {
    expect(winnerPacketWrapTermStart()).toBe("install day");
    expect(WINNER_PACKET_WRAP_TERM_START).toBe("install day");
    expect(assertWinnerPacketWrapTermStartIsInstallDay("install day")).toBe(
      true,
    );
    expect(assertWinnerPacketWrapTermStartIsInstallDay("close")).toBe(false);
    expect(assertWinnerPacketWrapTermStartIsInstallDay("CLOSE_AT")).toBe(false);
    expect(WINNER_PACKET_WRAP_TERM).toContain("install day");
    expect(WINNER_PACKET_WRAP_TERM.toLowerCase()).toContain("not from close");
  });

  test("packet seat + markdown embed wrap term start = install day", async () => {
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_1323_packet",
      brandLabel: "InstallDay Co",
      tradeLabel: "install day vinyl",
      standingUsd: 2500,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    await setIntentStatus(placed.bid.id, "approved");

    const seatResult = winnerPacketSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: 0,
    });
    expect(seatResult.ok).toBe(true);
    if (!seatResult.ok) return;

    expect(seatResult.seat.wrapTermStart).toBe("install day");
    expect(seatResult.seat.wrapTerm).toBe(WINNER_PACKET_WRAP_TERM);
    expect(
      assertWinnerPacketWrapTermStartIsInstallDay(
        seatResult.seat.wrapTermStart,
      ),
    ).toBe(true);

    const md = buildWinnerPacketMarkdown(seatResult.seat);
    expect(md).toContain("**Wrap term start:** install day (not close).");
    expect(md).toContain("12 months from install day");
    expect(md).toMatch(/\*\*Wrap term start:\*\*\s*install day/i);
    expect(md).not.toMatch(/\*\*Wrap term start:\*\*\s*close\b/i);
    expect(md).toContain("$58,000");
    expect(md).toContain("$120,000");
    expect(md.toLowerCase()).not.toMatch(/\blease\b/);
    expect(md).toContain("CLOSE_AT unset");

    // Mutating start to close must fail the builder guard.
    expect(() =>
      buildWinnerPacketMarkdown({
        ...seatResult.seat,
        wrapTermStart: "close" as typeof seatResult.seat.wrapTermStart,
      }),
    ).toThrow(/install day/i);
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
