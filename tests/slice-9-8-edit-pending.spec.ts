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
  editPendingIntent,
  getIntentBidById,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
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
 * Slice 9.8 — edit brand / trade / art while pending (listed) only.
 * Standing unchanged. Approved needs operator. No Stripe.
 */
test.describe("slice 9.8: edit pending brand / trade / art", () => {
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

  test("unit: listed edits keep standing; approved blocked", async () => {
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "ed98-a",
      brandLabel: "Edit Alpha",
      tradeLabel: "edit snacks",
      standingUsd: 3000,
      artworkUrl: "https://example.com/a.png",
    });
    expect(listed.ok).toBeTruthy();
    if (!listed.ok) return;

    const edited = await editPendingIntent({
      bidId: listed.bid.id,
      userId: "ed98-a",
      brandLabel: "Edit Alpha Renamed",
      tradeLabel: "edit tools",
      artworkUrl: "https://example.com/b.png",
    });
    expect(edited.ok).toBeTruthy();
    if (!edited.ok) return;
    expect(edited.bid.brandLabel).toBe("Edit Alpha Renamed");
    expect(edited.bid.tradeLabel).toBe("edit tools");
    expect(edited.bid.artworkUrl).toBe("https://example.com/b.png");
    expect(edited.bid.standingUsd).toBe(3000);
    expect(edited.bid.status).toBe("listed");
    expect(await standingForPanel("hood")).toBe(3000);

    const approved = await setIntentStatus(listed.bid.id, "approved");
    expect(approved.ok).toBeTruthy();

    const blocked = await editPendingIntent({
      bidId: listed.bid.id,
      userId: "ed98-a",
      brandLabel: "Should Fail",
      tradeLabel: "should fail",
    });
    expect(blocked.ok).toBeFalsy();
    if (blocked.ok) return;
    expect(blocked.error).toMatch(/Standing brand change after approve/i);
    const after = await getIntentBidById(listed.bid.id);
    expect(after?.brandLabel).toBe("Edit Alpha Renamed");
    expect(after?.status).toBe("approved");
  });

  test("account: edit pending updates labels; approved has no form", async ({
    browser,
    request,
  }) => {
    const page = await browser.newPage();
    await signIn(page, "ed98-ui@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Edit UI Brand");
    await page.getByTestId("intent-trade").fill("edit ui trade");
    await page.getByTestId("intent-standing").fill("3000");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await page.goto("/account");
    const row = page.locator('li[data-testid^="account-intent-"]').first();
    await expect(row).toBeVisible();
    const bidId = (await row.getAttribute("data-testid"))!.replace(
      "account-intent-",
      "",
    );
    await expect(page.getByTestId(`intent-edit-pending-${bidId}`)).toBeVisible();
    await page.getByTestId(`intent-edit-brand-${bidId}`).fill("Edit UI New");
    await page.getByTestId(`intent-edit-trade-${bidId}`).fill("edit ui new trade");
    await page
      .getByTestId(`intent-edit-artwork-url-${bidId}`)
      .fill("https://example.com/edit-ui.png");
    await page.getByTestId(`intent-edit-submit-${bidId}`).click();
    await expect(row).toContainText("Edit UI New", { timeout: 10_000 });
    await expect(page.getByTestId(`account-intent-trade-${bidId}`)).toHaveText(
      "edit ui new trade",
    );
    await expect(page.getByTestId(`intent-edit-brand-${bidId}`)).toHaveValue(
      "Edit UI New",
    );

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-standing")).toHaveText("$3,000");
    await expect(page.getByTestId("intent-list")).toContainText("Edit UI New");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    await page.close();

    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();

    const owner = await browser.newPage();
    await signIn(owner, "ed98-approved@example.com");
    await owner.goto("/panels/hood");
    await owner.getByTestId("intent-brand").fill("Edit Approved Co");
    await owner.getByTestId("intent-trade").fill("edit approved goods");
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
      "Edit Approved Co",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.close();

    const check = await browser.newPage();
    await signIn(check, "ed98-approved@example.com");
    await check.goto("/account");
    const approvedRow = check
      .locator('li[data-testid^="account-intent-"]')
      .filter({ hasText: "Edit Approved Co" });
    await expect(approvedRow).toContainText("Approved");
    await expect(
      approvedRow.locator('[data-testid^="account-approved-needs-operator-"]'),
    ).toContainText("cannot withdraw or edit");
    await expect(
      approvedRow.locator('[data-testid^="intent-edit-pending-"]'),
    ).toHaveCount(0);
    const accountHtml = await check.content();
    expect(accountHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(accountHtml).not.toContain("CLOSE_AT");
    await check.close();
  });
});
