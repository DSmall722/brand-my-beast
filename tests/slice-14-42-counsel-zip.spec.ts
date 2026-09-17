import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  COUNSEL_CONTRACT_ENTRY,
  COUNSEL_STANDING_ENTRY,
  COUNSEL_STANDING_HEADERS,
  COUNSEL_ZIP_FILENAME,
  COUNSEL_ZIP_PATH,
  buildCounselStandingCsv,
  buildCounselZip,
  counselStandingHasEmailLeak,
  readContractMarkdown,
} from "../src/lib/counsel-export";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 14.42 — Counsel export ZIP of CONTRACT + standing table.
 * No emails in the ZIP. CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 14.42: counsel ZIP CONTRACT + standing, no emails", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    await request.post("/api/test/reset-intents");
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("standing CSV has no email/userId; ZIP embeds CONTRACT + table", async () => {
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "counsel-secret-user@example.com",
      brandLabel: "Counsel Co",
      tradeLabel: "counsel trade",
      standingUsd: 2800,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    await setIntentStatus(placed.bid.id, "approved");

    const csv = buildCounselStandingCsv([
      { ...placed.bid, status: "approved" },
    ]);
    expect(csv).toContain(COUNSEL_STANDING_HEADERS.join(","));
    expect(csv).toContain("Counsel Co");
    expect(csv).toContain("2800");
    expect(counselStandingHasEmailLeak(csv)).toBe(false);
    expect(csv).not.toContain("counsel-secret-user");
    expect(csv).not.toContain("@");
    expect(csv.toLowerCase()).not.toContain("email");
    expect(csv.toLowerCase()).not.toContain("userid");

    const contract = readContractMarkdown();
    expect(contract).toContain("$58,000");
    expect(contract).toContain("$120,000");

    const zip = buildCounselZip({
      contractMarkdown: contract,
      standingBids: [{ ...placed.bid, status: "approved" }],
    });
    expect(zip.subarray(0, 2).toString("utf8")).toBe("PK");
    const asText = zip.toString("binary");
    expect(asText).toContain(COUNSEL_CONTRACT_ENTRY);
    expect(asText).toContain(COUNSEL_STANDING_ENTRY);
    expect(asText).toContain("Counsel Co");
    expect(asText).not.toContain("counsel-secret-user@example.com");
  });

  test("operator GET counsel ZIP; unsigned 401; no emails in body", async ({
    browser,
  }) => {
    const unsigned = await browser.newPage();
    const denied = await unsigned.request.get(COUNSEL_ZIP_PATH);
    expect(denied.status()).toBe(401);
    await unsigned.close();

    const bidder = await browser.newPage();
    await signIn(bidder, "zip-bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Zip Brand UI");
    await bidder.getByTestId("intent-trade").fill("zip ui trade");
    await bidder.getByTestId("intent-standing").fill("3100");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    const approve = operator.locator('[data-testid^="approve-"]').first();
    if ((await approve.count()) > 0) {
      await approve.click();
    }

    const res = await operator.request.get(COUNSEL_ZIP_PATH);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/zip/);
    expect(res.headers()["content-disposition"]).toContain(
      COUNSEL_ZIP_FILENAME,
    );
    const buf = Buffer.from(await res.body());
    expect(buf.subarray(0, 2).toString("utf8")).toBe("PK");
    const bodyText = buf.toString("binary");
    expect(bodyText).toContain(COUNSEL_CONTRACT_ENTRY);
    expect(bodyText).toContain(COUNSEL_STANDING_ENTRY);
    expect(bodyText).toContain("$58,000");
    expect(bodyText).not.toContain("zip-bidder@example.com");
    expect(bodyText.toLowerCase()).not.toMatch(/@gmail\.com/);
    await operator.close();
  });
});
