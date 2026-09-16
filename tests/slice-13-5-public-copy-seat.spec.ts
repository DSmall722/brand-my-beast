import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { depositPreviewCopy } from "../src/lib/deposit-preview";
import {
  buildFailedWinnerOffer,
  failedWinnerOfferCopy,
} from "../src/lib/failed-winner-offer";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 13.5 — PUBLIC_COPY seat pack: withdraw, failed-winner, deposit preview.
 * Do not rewrite the homepage H1.
 */
test.describe("slice 13.5: PUBLIC_COPY seat pack (no H1 rewrite)", () => {
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

  test("seat pack strings exist; homepage H1 unchanged", () => {
    expect(PUBLIC_COPY.hero.h1).toBe(
      "Put your brand on the truck people already photograph.",
    );
    expect(PUBLIC_COPY.seat.withdrawSuccess).toContain("withdrawn");
    expect(PUBLIC_COPY.seat.withdrawButton).toMatch(/Withdraw/i);
    expect(PUBLIC_COPY.seat.failedWinnerWaitlist).toMatch(/waitlist/i);
    expect(PUBLIC_COPY.seat.depositPreviewTemplate).toContain("{percent}");
    expect(PUBLIC_COPY.seat.failedWinnerLeadTemplate).toContain("{amount}");

    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain("Seat pack");
    expect(md).toContain(PUBLIC_COPY.hero.h1);
    expect(md).toContain(PUBLIC_COPY.seat.withdrawSuccess);
  });

  test("helpers render seat pack templates", () => {
    const preview = depositPreviewCopy(2_500);
    expect(preview).toBe(
      `${DEPOSIT_PERCENT}% of this mark is ${formatUsd(500)}. Not charged.`,
    );
    const offer = buildFailedWinnerOffer({
      lastMarkUsd: 2_500,
      panelMinimumUsd: 2_500,
    });
    const lead = failedWinnerOfferCopy(offer);
    expect(lead).toContain(formatUsd(offer.offerUsd));
    expect(lead).toContain(formatUsd(offer.lastMarkUsd));
    expect(lead.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still shows locked H1", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      PUBLIC_COPY.hero.h1,
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
  });
});
