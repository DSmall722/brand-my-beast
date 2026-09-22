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
  getIntentBidById,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
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
 * Slice 9.7 — withdraw intent while pending (listed) only.
 * Approved needs operator. Soft withdraw — no hard delete. No Stripe.
 */
test.describe("slice 9.7: withdraw pending intent", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
    await resetIntentStoreForTests();
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

  test("unit: listed withdraws; approved is blocked", async () => {
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "wd97-a",
      brandLabel: "WD Alpha",
      tradeLabel: "wd snacks",
      standingUsd: 3000,
    });
    expect(listed.ok).toBeTruthy();
    if (!listed.ok) return;
    expect(await standingForPanel("hood")).toBe(3000);

    const withdrawn = await withdrawPendingIntent({
      bidId: listed.bid.id,
      userId: "wd97-a",
    });
    expect(withdrawn.ok).toBeTruthy();
    if (!withdrawn.ok) return;
    expect(withdrawn.bid.status).toBe("withdrawn");
    expect(await standingForPanel("hood")).toBe(2500);
    const after = await getIntentBidById(listed.bid.id);
    expect(after?.status).toBe("withdrawn");

    const again = await placeIntentBid({
      panelId: "hood",
      userId: "wd97-a",
      brandLabel: "WD Alpha",
      tradeLabel: "wd snacks",
      standingUsd: 2500,
    });
    expect(again.ok).toBeTruthy();
    if (!again.ok) return;

    const approved = await setIntentStatus(again.bid.id, "approved");
    expect(approved.ok).toBeTruthy();

    const blocked = await withdrawPendingIntent({
      bidId: again.bid.id,
      userId: "wd97-a",
    });
    expect(blocked.ok).toBeFalsy();
    if (blocked.ok) return;
    expect(blocked.error).toMatch(/Approved needs operator/i);
    expect((await getIntentBidById(again.bid.id))?.status).toBe("approved");
  });

  test("account: withdraw pending restores opening; approved has no button", async ({
    browser,
  }) => {
    const page = await browser.newPage();
    await signIn(page, "wd97-ui@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("WD UI Brand");
    await page.getByTestId("intent-trade").fill("wd ui tools");
    await page.getByTestId("intent-standing").fill("3000");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await expect(page.getByTestId("panel-standing")).toHaveText("$3,000");

    await page.goto("/account");
    const row = page.locator('[data-testid^="account-intent-"]').first();
    await expect(row).toBeVisible();
    const bidId = (await row.getAttribute("data-testid"))!.replace(
      "account-intent-",
      "",
    );
    await expect(
      page.getByTestId(`intent-withdraw-submit-${bidId}`),
    ).toBeVisible();
    await page.getByTestId(`intent-withdraw-submit-${bidId}`).click();
    await expect(row).toContainText("Withdrawn", { timeout: 10_000 });
    await expect(
      page.getByTestId(`intent-withdraw-submit-${bidId}`),
    ).toHaveCount(0);

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-standing")).toHaveText("$2,500");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    await page.close();

    // Approved path: no withdraw control; operator note copy.
    const owner = await browser.newPage();
    await signIn(owner, "wd97-approved@example.com");
    await owner.goto("/panels/hood");
    await owner.getByTestId("intent-brand").fill("WD Approved");
    await owner.getByTestId("intent-trade").fill("wd approved goods");
    await owner.getByTestId("intent-standing").fill("2500");
    await owner.getByTestId("intent-submit").click();
    await expect(owner.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await owner.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "WD Approved",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.close();

    const check = await browser.newPage();
    await signIn(check, "wd97-approved@example.com");
    await check.goto("/account");
    const approvedRow = check
      .locator('li[data-testid^="account-intent-"]')
      .filter({ hasText: "WD Approved" });
    await expect(approvedRow).toContainText("Approved");
    await expect(
      approvedRow.locator('[data-testid^="account-approved-needs-operator-"]'),
    ).toContainText("Approved needs operator");
    await expect(
      approvedRow.locator('[data-testid^="intent-withdraw-submit-"]'),
    ).toHaveCount(0);
    const accountHtml = await check.content();
    expect(accountHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(accountHtml).not.toContain("CLOSE_AT");
    await check.close();
  });
});
