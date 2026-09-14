import { expect, test } from "@playwright/test";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("P2 panel intent + approvals", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("anonymous panel page shows mockup, intent-only banner, and sign-in prompt", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    await expect(page.getByTestId("public-seat-label")).toHaveText("Public seat");
    await expect(page.getByTestId("public-seat-status")).toBeVisible();
    await expect(page.getByTestId("seat-occupancy")).toHaveText("Seat open");
    await expect(page.getByTestId("public-seat-waitlist-cta")).toContainText(
      "waitlist",
    );
    await expect(page.getByTestId("panel-mockup")).toBeVisible();
    await expect(page.getByTestId("stainless-compositor")).toBeVisible();
    await expect(page.getByTestId("compositor-mode-wrap")).toBeVisible();
    await expect(page.getByTestId("compositor-mode-etch")).toBeEnabled();
    await expect(page.getByTestId("compositor-wrap-film")).toBeVisible();
    await page.getByTestId("compositor-mode-etch").click();
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-finish",
      "etch",
    );
    await expect(page.getByTestId("compositor-etch-mark")).toBeVisible();
    await expect(page.getByTestId("compositor-finish-label")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("etch-constraint-linter")).toBeVisible();
    await expect(page.getByTestId("etch-constraint-list")).toBeVisible();
    await expect(page.getByTestId("etch-constraint-one-color")).toBeVisible();
    await page.getByTestId("etch-art-notes").fill("full color gradient photo");
    await expect(page.getByTestId("etch-lint-issues")).toBeVisible();
    await expect(page.getByTestId("etch-lint-etch-forbidden-art")).toBeVisible();
    await expect(page.getByTestId("finish-conditions")).toBeVisible();
    await expect(page.getByTestId("finish-condition-day")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.getByTestId("finish-condition-night").click();
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-condition",
      "night",
    );
    await expect(page.getByTestId("finish-condition-shader")).toHaveAttribute(
      "data-condition",
      "night",
    );
    await expect(page.getByTestId("dirty-clean-pair-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("dirty-clean-pair-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("dirty-clean-pair-lead")).toContainText(
      "Preview only",
    );
    await page.getByTestId("dirty-clean-pair-toggle").click();
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-pair",
      "true",
    );
    await expect(page.getByTestId("dirty-clean-pair")).toBeVisible();
    await expect(page.getByTestId("dirty-clean-clean")).toHaveAttribute(
      "data-condition",
      "day",
    );
    await expect(page.getByTestId("dirty-clean-dirty")).toHaveAttribute(
      "data-condition",
      "dirty",
    );
    await expect(page.getByTestId("dirty-clean-clean-shader")).toHaveAttribute(
      "data-condition",
      "day",
    );
    await expect(page.getByTestId("dirty-clean-dirty-shader")).toHaveAttribute(
      "data-condition",
      "dirty",
    );
    await expect(page.getByTestId("adjacent-neighbors")).toBeVisible();
    await expect(page.getByTestId("adjacent-neighbors-empty")).toBeVisible();
    await expect(page.getByTestId("neighbor-combo")).toBeVisible();
    await expect(page.getByTestId("neighbor-combo-lead")).toContainText(
      "not a joint bid",
    );
    await expect(page.getByTestId("neighbor-combo-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("neighbor-combo-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("neighbor-combo-front-fascia")).toBeVisible();
    await expect(
      page.getByTestId("neighbor-combo-front-fascia").locator("a"),
    ).toHaveAttribute("href", "/panels/front-fascia");
    await expect(page.getByTestId("neighbor-combo-roof")).toBeVisible();
    await expect(page.getByTestId("neighbor-combo-driver-door")).toBeVisible();
    await expect(page.getByTestId("neighbor-combo-passenger-door")).toBeVisible();
    await expect(page.getByTestId("hometown-lane")).toBeVisible();
    await expect(page.getByTestId("hometown-lane-sc")).toHaveText("SC");
    await expect(page.getByTestId("hometown-lane-charlotte")).toHaveText(
      "Charlotte",
    );
    await expect(page.getByTestId("hometown-lane-atlanta")).toHaveText(
      "Atlanta",
    );
    await expect(page.getByTestId("hometown-lane-panhandle")).toHaveText(
      "Panhandle",
    );
    await expect(page.getByTestId("panel-stats")).toBeVisible();
    await expect(page.getByTestId("intent-only-banner")).toContainText(
      "No Stripe capture",
    );
    await expect(page.getByTestId("intent-signin-needed")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
  });

  test("signed-in bidder sees highway legibility warn on long brand", async ({
    page,
  }) => {
    await signIn(page, "legibility@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Twenty Character Brand!");
    await expect(page.getByTestId("highway-legibility")).toHaveAttribute(
      "data-severity",
      "warn",
    );
    await expect(page.getByTestId("legibility-brand-long")).toBeVisible();
  });

  test("adjacent clash soft-warns when neighbor holds overlapping brand", async ({
    browser,
  }) => {
    const neighbor = await browser.newPage();
    await signIn(neighbor, "neighbor@example.com");
    await neighbor.goto("/panels/front-fascia");
    await neighbor.getByTestId("intent-brand").fill("Acme Steel");
    await neighbor.getByTestId("intent-trade").fill("fasteners");
    await neighbor.getByTestId("intent-submit").click();
    await expect(neighbor.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await neighbor.close();

    const bidder = await browser.newPage();
    await signIn(bidder, "clash@example.com");
    await bidder.goto("/panels/hood");
    await expect(bidder.getByTestId("adjacent-neighbors-list")).toContainText(
      "Acme Steel",
    );
    await bidder.getByTestId("intent-brand").fill("Acme Steel");
    await expect(bidder.getByTestId("adjacent-clash-hint")).toBeVisible();
    await expect(
      bidder.getByTestId("adjacent-clash-front-fascia"),
    ).toContainText("Same brand");
    await bidder.close();
  });

  test("signed-in bidder lists intent and operator can approve", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Signal Co");
    await bidder.getByTestId("intent-trade").fill("cold brew");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await expect(bidder.getByTestId("intent-list")).toContainText("Signal Co");
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await expect(operator.getByTestId("approvals-nav-link")).toBeVisible();
    await expect(operator.getByTestId("account-approvals-link")).toBeVisible();
    await operator.goto("/operator/approvals");
    await expect(operator.getByTestId("operator-approvals")).toBeVisible();
    await expect(operator.getByTestId("approvals-count")).toContainText(
      "waiting",
    );
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Signal Co",
    );
    const mockupRoot = operator.locator('[data-testid^="imagine-mockup-"]').first();
    await expect(mockupRoot).toBeVisible();
    await operator.locator('[data-testid^="imagine-queue-wrap-"]').first().click();
    await expect(
      operator.locator('[data-testid^="imagine-preview-"]').first(),
    ).toBeVisible({ timeout: 10_000 });
    await expect(operator.getByTestId("imagine-message")).toContainText(
      "placeholder",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.close();
  });

  test("operator can reject a listed intent", async ({ browser }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "bidder2@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Reject Co");
    await bidder.getByTestId("intent-trade").fill("energy drink");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator/approvals");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Reject Co",
    );
    await expect(
      operator.getByTestId("artwork-approval-checklist").first(),
    ).toBeVisible();
    await expect(
      operator.getByTestId("artwork-check-school-grocery").first(),
    ).toContainText("grocery");
    await expect(
      operator.getByTestId("artwork-check-etch-one-color").first(),
    ).toBeVisible();

    await operator.locator('[data-testid^="reject-"]').first().click();
    await expect(
      operator.locator('[data-testid^="approval-error-"]').first(),
    ).toContainText("note");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Reject Co",
    );

    await operator
      .locator('[data-testid^="approval-note-"]')
      .first()
      .fill("Cannot pass a grocery lot");
    await operator.locator('[data-testid^="reject-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await expect(operator.getByTestId("approvals-decided")).toContainText(
      "Reject Co",
    );
    await expect(operator.getByTestId("approvals-decided")).toContainText(
      "Cannot pass a grocery lot",
    );
    const html = await operator.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    await operator.close();

    const bidderAgain = await browser.newPage();
    await signIn(bidderAgain, "bidder2@example.com");
    await bidderAgain.goto("/account");
    await expect(
      bidderAgain.locator('[data-testid^="account-reject-note-"]').first(),
    ).toContainText("Cannot pass a grocery lot");
    await expect(bidderAgain.getByTestId("intent-only-note")).toContainText(
      "No Stripe capture",
    );
    await bidderAgain.close();
  });

  test("outbid viewer sees failed-winner waitlist handoff", async ({
    browser,
  }) => {
    const first = await browser.newPage();
    await signIn(first, "outbid-a@example.com");
    await first.goto("/panels/hood");
    await first.getByTestId("intent-brand").fill("Alpha Mark");
    await first.getByTestId("intent-trade").fill("trail snacks");
    await first.getByTestId("intent-submit").click();
    await expect(first.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await expect(first.getByTestId("failed-winner-waitlist")).toHaveCount(0);
    await first.close();

    const second = await browser.newPage();
    await signIn(second, "outbid-b@example.com");
    await second.goto("/panels/hood");
    await second.getByTestId("intent-brand").fill("Beta Mark");
    await second.getByTestId("intent-trade").fill("trail tools");
    await second.getByTestId("intent-standing").fill("2750");
    await second.getByTestId("intent-submit").click();
    await expect(second.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await expect(second.getByTestId("intent-list")).toContainText("Outbid");
    await second.close();

    const outbidViewer = await browser.newPage();
    await signIn(outbidViewer, "outbid-a@example.com");
    await outbidViewer.goto("/panels/hood");
    const banner = outbidViewer.getByTestId("failed-winner-waitlist");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("outbid");
    await expect(banner.getByRole("link", { name: "waitlist" })).toHaveAttribute(
      "href",
      "/#waitlist",
    );
    const html = await outbidViewer.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    await outbidViewer.close();
  });

  test("account lists outbid intents with waitlist handoff", async ({
    browser,
  }) => {
    const first = await browser.newPage();
    await signIn(first, "acct-a@example.com");
    await first.goto("/panels/hood");
    await first.getByTestId("intent-brand").fill("Acct Alpha");
    await first.getByTestId("intent-trade").fill("yoga mats");
    await first.getByTestId("intent-submit").click();
    await expect(first.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await first.close();

    const second = await browser.newPage();
    await signIn(second, "acct-b@example.com");
    await second.goto("/panels/hood");
    await second.getByTestId("intent-brand").fill("Acct Beta");
    await second.getByTestId("intent-trade").fill("foam rollers");
    await second.getByTestId("intent-standing").fill("2750");
    await second.getByTestId("intent-submit").click();
    await expect(second.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await second.close();

    const account = await browser.newPage();
    await signIn(account, "acct-a@example.com");
    await expect(account.getByTestId("account-intents-list")).toContainText(
      "Acct Alpha",
    );
    await expect(account.getByTestId("account-intents-list")).toContainText(
      "Outbid",
    );
    const handoff = account.locator(
      '[data-testid^="account-outbid-waitlist-"]',
    );
    await expect(handoff).toBeVisible();
    await expect(
      handoff.getByRole("link", { name: "Join the waitlist" }),
    ).toHaveAttribute("href", "/#waitlist");
    await account.close();
  });

  test("blocks second brand from claiming the same trade", async ({
    browser,
  }) => {
    const first = await browser.newPage();
    await signIn(first, "trade-a@example.com");
    await first.goto("/panels/hood");
    await first.getByTestId("intent-brand").fill("Alpha Trade Co");
    await first.getByTestId("intent-trade").fill("Cold Brew");
    await first.getByTestId("intent-submit").click();
    await expect(first.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await first.close();

    const second = await browser.newPage();
    await signIn(second, "trade-b@example.com");
    await second.goto("/panels/tonneau");
    await second.getByTestId("intent-brand").fill("Beta Trade Co");
    await second.getByTestId("intent-trade").fill("cold brew");
    await second.getByTestId("intent-submit").click();
    await expect(second.getByTestId("intent-error")).toBeVisible();
    await expect(second.getByTestId("intent-error")).toContainText(
      "already held",
    );
    const html = await second.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    await second.close();
  });

  test("wrap-shop partner sheet is read-only for shop@example.com", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "shop-bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Shop Bound Co");
    await bidder.getByTestId("intent-trade").fill("wrap vinyl");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator/approvals");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Shop Bound Co",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.goto("/partner/shop");
    await expect(operator.getByTestId("partner-shop-denied")).toBeVisible();
    await operator.close();

    const shop = await browser.newPage();
    await signIn(shop, "shop@example.com");
    await expect(shop.getByTestId("account-shop-link")).toBeVisible();
    await expect(shop.getByTestId("shop-nav-link")).toBeVisible();
    await shop.goto("/partner/shop");
    await expect(shop.getByTestId("partner-shop")).toBeVisible();
    await expect(shop.getByTestId("partner-shop-lead")).toContainText(
      "$58,000",
    );
    await expect(shop.getByTestId("partner-shop-lead")).toContainText(
      "$120,000",
    );
    await expect(shop.getByTestId("wrap-shop-sheet")).toBeVisible();
    await expect(shop.getByTestId("wrap-rule-term")).toContainText(
      "12 months from install",
    );
    await expect(shop.getByTestId("wrap-matrix-hood")).toBeVisible();
    await expect(shop.getByTestId("wrap-shop-approved-list")).toContainText(
      "Shop Bound Co",
    );
    await expect(shop.locator('[data-testid^="approve-"]')).toHaveCount(0);
    const html = await shop.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    await shop.close();
  });

  test("winner portal lists approved seats for the bidder", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "winner@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Winner Co");
    await bidder.getByTestId("intent-trade").fill("cabin tools");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await bidder.goto("/account/wins");
    await expect(bidder.getByTestId("winner-portal-empty")).toBeVisible();
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator/approvals");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Winner Co",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.close();

    const winner = await browser.newPage();
    await signIn(winner, "winner@example.com");
    await expect(winner.getByTestId("account-wins-link")).toBeVisible();
    await expect(winner.getByTestId("wins-nav-link")).toBeVisible();
    await winner.goto("/account/wins");
    await expect(winner.getByTestId("winner-portal")).toBeVisible();
    await expect(winner.getByTestId("winner-portal-lead")).toContainText(
      "$58,000",
    );
    await expect(winner.getByTestId("winner-portal-lead")).toContainText(
      "$120,000",
    );
    await expect(winner.getByTestId("winner-fact-wrap-term")).toContainText(
      "12 months from install",
    );
    await expect(winner.getByTestId("winner-fact-etch-lock")).toContainText(
      "$120,000",
    );
    await expect(
      winner.getByTestId("winner-fact-vault-certificate"),
    ).toContainText("Not cash");
    await expect(winner.getByTestId("winner-fact-retired-vinyl")).toContainText(
      "12 months from install",
    );
    await expect(winner.getByTestId("winner-fact-season-two")).toContainText(
      "not a gift",
    );
    await expect(
      winner.getByTestId("winner-fact-rain-night-lighting"),
    ).toContainText("$120,000");
    await expect(
      winner.getByTestId("winner-fact-rain-night-lighting"),
    ).toContainText("Not a livestream");
    await expect(
      winner.getByTestId("winner-fact-truck-order-tracker"),
    ).toContainText("$120,000");
    await expect(
      winner.getByTestId("winner-fact-truck-order-tracker"),
    ).toContainText("No reserved VIN");
    await expect(
      winner.getByTestId("winner-fact-weekly-mileage-ledger"),
    ).toContainText("empty until the truck exists");
    await expect(
      winner.getByTestId("winner-fact-weekly-mileage-ledger"),
    ).toContainText("No invented miles");
    await expect(
      winner.getByTestId("winner-fact-landmark-proof-log"),
    ).toContainText("empty until the truck exists");
    await expect(
      winner.getByTestId("winner-fact-landmark-proof-log"),
    ).toContainText("No invented visits");
    await expect(
      winner.getByTestId("winner-fact-city-time-heatmap"),
    ).toContainText("empty until the truck exists");
    await expect(
      winner.getByTestId("winner-fact-city-time-heatmap"),
    ).toContainText("No invented city hours");
    await expect(
      winner.getByTestId("winner-fact-qr-nfc-scan-counter"),
    ).toContainText("empty until the truck exists");
    await expect(
      winner.getByTestId("winner-fact-qr-nfc-scan-counter"),
    ).toContainText("No invented scan counts");
    await expect(
      winner.getByTestId("winner-fact-city-ping-winner"),
    ).toContainText("empty until the truck exists");
    await expect(
      winner.getByTestId("winner-fact-city-ping-winner"),
    ).toContainText("No invented city pings");
    await expect(winner.getByTestId("winner-portal-seats-list")).toContainText(
      "Winner Co",
    );
    await expect(winner.locator('[data-testid^="approve-"]')).toHaveCount(0);
    const html = await winner.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    await winner.close();
  });

  test("content-rights picker saves prefs without a tweet or clock", async ({
    browser,
  }) => {
    const page = await browser.newPage();
    await signIn(page, "rights@example.com");
    await page.goto("/account/wins");
    await expect(page.getByTestId("content-rights")).toBeVisible();
    await expect(page.getByTestId("content-rights-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("content-rights-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("content-lock-no-impressions")).toContainText(
      "impression",
    );
    await expect(page.getByTestId("content-lock-no-tweet")).toContainText(
      "No auto-tweet",
    );
    await expect(page.getByTestId("content-right-film-seat")).toBeChecked();
    await page.getByTestId("content-right-film-seat").uncheck();
    await page.getByTestId("content-rights-save").click();
    await expect(page.getByTestId("content-rights-saved")).toContainText(
      "no auto-tweet",
    );
    await page.reload();
    await expect(page.getByTestId("content-right-film-seat")).not.toBeChecked();
    await expect(page.getByTestId("content-right-tag-handle")).toBeChecked();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    await page.close();
  });
});
