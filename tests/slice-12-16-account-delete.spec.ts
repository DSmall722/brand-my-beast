import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  anonymizedUserId,
  isAnonymizedUserId,
} from "../src/lib/account-delete";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  anonymizeIntentBidsForUser,
  getIntentBidById,
  listStandingIntents,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  attachWaitlistAccount,
  detachWaitlistUserId,
  getWaitlistByEmail,
  joinWaitlist,
  resetWaitlistStoreForTests,
} from "../src/lib/waitlist";

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
 * Slice 12.16 — account delete anonymizes user id on bids.
 * Public standing amounts stay. CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.16: account delete anonymize user id", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async () => {
    process.env.INTENT_MODE = "memory";
    process.env.WAITLIST_MODE = "memory";
    await resetIntentStoreForTests();
    resetWaitlistStoreForTests();
  });

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

  test("anonymizedUserId is opaque and stable", () => {
    const a = anonymizedUserId("test:delete@example.com");
    const b = anonymizedUserId("test:delete@example.com");
    expect(a).toBe(b);
    expect(isAnonymizedUserId(a)).toBe(true);
    expect(a).not.toContain("delete@example.com");
    expect(a.toLowerCase()).not.toMatch(/stripe|lease/);
  });

  test("anonymize keeps standing amounts on the public board", async () => {
    const userId = "test:delete-stand@example.com";
    const listed = await placeIntentBid({
      panelId: "hood",
      userId,
      brandLabel: "DeleteStandCo",
      tradeLabel: "delete stand trade",
      standingUsd: 3_000,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const approved = await placeIntentBid({
      panelId: "tailgate",
      userId,
      brandLabel: "DeleteApprovedCo",
      tradeLabel: "delete approved trade",
      standingUsd: 4_000,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    await setIntentStatus(approved.bid.id, "approved");

    const result = await anonymizeIntentBidsForUser(userId);
    expect(result.ok).toBe(true);
    expect(result.count).toBe(2);
    expect(isAnonymizedUserId(result.anonymizedUserId)).toBe(true);

    const hood = await getIntentBidById(listed.bid.id);
    expect(hood?.userId).toBe(result.anonymizedUserId);
    expect(hood?.standingUsd).toBe(3_000);
    expect(hood?.status).toBe("listed");
    expect(hood?.brandLabel).toBe("DeleteStandCo");

    const tail = await getIntentBidById(approved.bid.id);
    expect(tail?.userId).toBe(result.anonymizedUserId);
    expect(tail?.standingUsd).toBe(4_000);
    expect(tail?.status).toBe("approved");

    const standing = await listStandingIntents();
    expect(standing.map((b) => b.standingUsd).sort()).toEqual([3_000, 4_000]);
    expect(standing.every((b) => isAnonymizedUserId(b.userId))).toBe(true);

    const again = await anonymizeIntentBidsForUser(userId);
    expect(again.count).toBe(0);
  });

  test("detachWaitlistUserId clears account link only", async () => {
    const email = "detach-12-16@example.com";
    const userId = "test:detach-12-16@example.com";
    await joinWaitlist(email);
    await attachWaitlistAccount({ email, userId });
    expect((await getWaitlistByEmail(email))?.userId).toBe(userId);

    const n = await detachWaitlistUserId(userId);
    expect(n).toBe(1);
    const row = await getWaitlistByEmail(email);
    expect(row?.email).toBe(email);
    expect(row?.userId).toBeNull();
  });

  test("account page delete anonymizes bids and signs out", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    const email = "bidder-a@example.com";
    await signIn(page, email);
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("DeleteUiCo");
    await page.getByTestId("intent-trade").fill("delete ui trade");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("panel-standing")).toHaveText("$2,500");

    await page.goto("/account");
    await expect(page.getByTestId("account-delete-submit")).toBeVisible();
    await expect(page.getByTestId("account-delete-hint")).toContainText(
      "standing amounts stay",
    );
    await page.getByTestId("account-delete-submit").click();

    await expect(page).toHaveURL(/\/$/);
    await page.goto("/account");
    await expect(page).toHaveURL(/signin/);

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-standing")).toHaveText("$2,500");
    await expect(page.getByTestId("public-standing-brand")).toHaveText(
      "DeleteUiCo",
    );
  });
});
