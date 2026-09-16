import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  listApprovedBidsForUser,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import { isWinnerSeat, winnerSeatsFor } from "../src/lib/winner-portal";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServerIntents(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 12.21 — /account/wins lists only approved standing seats for that user.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.21: account wins approved seats only", () => {
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

  test("listApprovedBidsForUser returns only that user's approved seats", async () => {
    await resetIntentStoreForTests();
    const userA = "test:wins-a@example.com";
    const userB = "test:wins-b@example.com";

    const listed = await placeIntentBid({
      panelId: "hood",
      userId: userA,
      brandLabel: "ListedOnlyCo",
      tradeLabel: "listed trade",
      standingUsd: 2_500,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const approvedA = await placeIntentBid({
      panelId: "tailgate",
      userId: userA,
      brandLabel: "ApprovedACo",
      tradeLabel: "approved a trade",
      standingUsd: 2_500,
    });
    expect(approvedA.ok).toBe(true);
    if (!approvedA.ok) return;
    await setIntentStatus(approvedA.bid.id, "approved");

    const rejected = await placeIntentBid({
      panelId: "tonneau",
      userId: userA,
      brandLabel: "RejectedCo",
      tradeLabel: "rejected trade",
      standingUsd: 2_500,
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    await setIntentStatus(rejected.bid.id, "rejected");

    const approvedB = await placeIntentBid({
      panelId: "roof",
      userId: userB,
      brandLabel: "ApprovedBCo",
      tradeLabel: "approved b trade",
      standingUsd: 2_500,
    });
    expect(approvedB.ok).toBe(true);
    if (!approvedB.ok) return;
    await setIntentStatus(approvedB.bid.id, "approved");

    const winsA = await listApprovedBidsForUser(userA);
    expect(winsA.map((b) => b.brandLabel)).toEqual(["ApprovedACo"]);
    expect(winsA.every((b) => isWinnerSeat(b))).toBe(true);
    expect(winsA.every((b) => b.userId === userA)).toBe(true);
    expect(winnerSeatsFor(winsA).length).toBe(1);

    const winsB = await listApprovedBidsForUser(userB);
    expect(winsB.map((b) => b.brandLabel)).toEqual(["ApprovedBCo"]);
  });

  test("/account/wins UI shows only approved seats for signed-in user", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("WinsListedCo");
    await page.getByTestId("intent-trade").fill("wins listed");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/panels/tailgate");
    await page.getByTestId("intent-brand").fill("WinsApprovedCo");
    await page.getByTestId("intent-trade").fill("wins approved");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    const pendingList = page.getByTestId("approvals-list");
    await expect(pendingList).toContainText("WinsApprovedCo");
    await expect(pendingList).toContainText("WinsListedCo");

    const approvedRow = page
      .locator('[data-testid^="approval-row-"]')
      .filter({ hasText: "WinsApprovedCo" });
    await approvedRow.locator('[data-testid^="approve-"]').click();
    await expect(pendingList).not.toContainText("WinsApprovedCo", {
      timeout: 10_000,
    });
    await expect(pendingList).toContainText("WinsListedCo");

    await signIn(page, "bidder-a@example.com");
    await page.goto("/account/wins");
    await expect(page.getByTestId("winner-portal")).toBeVisible();
    await expect(page.getByTestId("winner-portal-seats-list")).toBeVisible();
    await expect(page.getByTestId("winner-portal-seats-list")).toHaveAttribute(
      "data-approved-only",
      "true",
    );
    await expect(page.getByTestId("winner-portal-seats-list")).toContainText(
      "WinsApprovedCo",
    );
    await expect(page.getByTestId("winner-portal-seats-list")).not.toContainText(
      "WinsListedCo",
    );

    const seats = page.locator('[data-testid^="winner-seat-"]');
    await expect(seats).toHaveCount(1);
    await expect(seats.first()).toHaveAttribute("data-status", "approved");

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
