import { expect, test } from "@playwright/test";
import { PUBLIC_COPY } from "../src/lib/public-copy";

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

  test("slice 3.1: stainless compositor on the seat is preview only", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    await expect(page.getByTestId("panel-mockup")).toBeVisible();
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-preview-toggles",
      "false",
    );
    await expect(page.getByTestId("stainless-compositor")).toHaveCount(0);
    await expect(page.getByTestId("stainless-compositor-lead")).toContainText(
      "preview only",
    );
    await expect(page.getByTestId("compositor-mode-wrap")).toHaveCount(0);
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("compositor-wrap-film")).toBeVisible();
    await expect(page.getByTestId("compositor-finish-label")).toContainText(
      "Wrap",
    );
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "Etch stays locked until buyout",
    );
    await expect(page.getByTestId("stainless-compositor-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("stainless-compositor-lead")).toContainText(
      "$120,000",
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("slice 3.2: etch controls disabled while raised < $120,000", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-etchable",
      "true",
    );
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-etch-unlocked",
      "false",
    );
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("compositor-mode-wrap")).toHaveCount(0);
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "Etch stays locked until buyout",
    );
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-finish",
      "wrap",
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("slice 1.7: /panels/[id] is the public seat", async ({ page }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    await expect(page.getByTestId("public-seat-label")).toHaveText("Public seat");
    await expect(page.getByTestId("public-seat-status")).toBeVisible();
    await expect(page.getByTestId("seat-occupancy")).toHaveText("Seat open");
    await expect(
      page.getByTestId("panel-intent-page").getByRole("link", { name: "Panels" }),
    ).toHaveAttribute("href", "/#panels");
    await expect(page.getByTestId("public-seat-waitlist-cta")).toContainText(
      "waitlist",
    );
    await expect(page.getByTestId("panel-mockup")).toBeVisible();
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-preview-toggles",
      "false",
    );
    await expect(page.getByTestId("stainless-compositor")).toHaveCount(0);
    await expect(page.getByTestId("compositor-mode-wrap")).toHaveCount(0);
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "Etch stays locked until buyout",
    );
    await expect(page.getByTestId("stainless-compositor-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("compositor-wrap-film")).toBeVisible();
    await expect(page.getByTestId("compositor-finish-label")).toContainText(
      "Wrap",
    );
    await expect(page.getByTestId("finish-conditions")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-day")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-night")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-wet")).toHaveCount(0);
    await expect(page.getByTestId("finish-condition-dirty")).toHaveCount(0);
    await expect(page.getByTestId("dirty-clean-pair-toggle")).toHaveCount(0);
    await expect(page.getByTestId("dirty-clean-pair")).toHaveCount(0);
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
    await expect(page.getByTestId("neighbor-combo-front-bumper")).toHaveCount(0);
    await expect(page.getByTestId("neighbor-combo-driver-door")).toBeVisible();
    await expect(page.getByTestId("neighbor-combo-passenger-door")).toBeVisible();
    await expect(page.getByTestId("hometown-lane")).toHaveCount(0);
    await expect(page.getByTestId("panel-stats")).toBeVisible();
    await expect(page.getByTestId("intent-only-banner")).toContainText(
      "Intent only",
    );
    await expect(page.getByTestId("intent-signin-needed")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
  });

  test("slice 3.3: signed-in bidder sees highway legibility warn on long brand", async ({
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
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("slice 3.4: etchable seat shows RULES.md etch linter", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-etchable",
      "true",
    );
    await expect(page.getByTestId("etch-constraints")).toBeVisible();
    await expect(page.getByTestId("etch-constraint-list")).toBeVisible();
    await expect(page.getByTestId("etch-constraint-one-color")).toBeVisible();
    await expect(page.getByTestId("etch-constraint-no-gradients")).toBeVisible();
    await expect(page.getByTestId("etch-constraint-no-fine-type")).toBeVisible();
    await page.getByTestId("etch-art-notes").fill("full color gradient photo");
    await expect(page.getByTestId("etch-lint-issues")).toBeVisible();
    await expect(page.getByTestId("etch-lint-etch-forbidden-art")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
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

  test("slice 1.2: signed-in user submits brand, trade, and amount at opening", async ({
    page,
  }) => {
    await signIn(page, "slice12@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-bid-form")).toBeVisible();
    await page.getByTestId("intent-brand").fill("Slice Twelve Co");
    await page.getByTestId("intent-trade").fill("panel seats");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible();
    await expect(page.getByTestId("intent-list")).toContainText("Slice Twelve Co");
    await expect(page.getByTestId("intent-list")).toContainText("panel seats");
    await expect(page.getByTestId("intent-list")).toContainText("2,500");
  });

  test("slice 1.3: amount is intent only and page says it does not charge", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("intent-no-charge-note")).toHaveCount(0);
    await expect(page.locator("#money")).not.toContainText(
      "Amount is intent only. When bidding opens, a 20% deposit holds your panel. Nothing is charged on this page.",
    );

    await signIn(page, "slice13@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-only-banner")).toContainText(
      "does not charge",
    );
    await expect(page.getByTestId("panel-deposit-shown")).toContainText(
      "not charged",
    );
    await expect(page.getByTestId("intent-amount-note")).toContainText(
      "intent only",
    );
    await expect(page.getByTestId("intent-amount-note")).toContainText(
      "does not charge",
    );
    await page.getByTestId("intent-brand").fill("Slice Thirteen Co");
    await page.getByTestId("intent-trade").fill("intent marks");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
    );
  });

  test("slice 2.2: operator approve lists the intent", async ({
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
    await operator.goto("/operator");
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

  test("slice 2.2: operator reject requires a note", async ({ browser }) => {
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
    await operator.goto("/operator");
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

  test("slice 2.4: approval thread on /account shows operator decisions", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "thread-bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Thread Co");
    await bidder.getByTestId("intent-trade").fill("trail snacks");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await bidder.goto("/account");
    await expect(bidder.getByTestId("account-approval-thread")).toBeVisible();
    await expect(
      bidder.getByTestId("account-approval-thread-empty"),
    ).toBeVisible();
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Thread Co",
    );
    await operator.locator('[data-testid^="approve-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.close();

    const bidderAgain = await browser.newPage();
    await signIn(bidderAgain, "thread-bidder@example.com");
    await bidderAgain.goto("/account");
    await expect(
      bidderAgain.getByTestId("account-approval-thread-list"),
    ).toBeVisible();
    await expect(
      bidderAgain.locator('[data-testid^="account-approval-thread-row-"]').first(),
    ).toBeVisible();
    await expect(
      bidderAgain
        .locator('[data-testid^="account-approval-decision-"]')
        .first(),
    ).toContainText(/approved/i);
    await expect(
      bidderAgain
        .locator('[data-testid^="account-approval-approve-note-"]')
        .first(),
    ).toContainText("operator gate");
    const html = await bidderAgain.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    await bidderAgain.close();
  });

  test("slice 2.3: banned trades hard-reject on the seat", async ({
    page,
    request,
  }) => {
    // Parallel workers can flip seats closed; force list mode for this seat test.
    await request.post("/api/test/seats-open", { data: { open: true } });
    await signIn(page, "banned@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-brand")).toBeVisible();
    await page.getByTestId("intent-brand").fill("Ban Co");
    await page.getByTestId("intent-trade").fill("porn merch");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-error")).toContainText("Hard-reject");
    await expect(page.getByTestId("intent-error")).toContainText("porn");
    await expect(page.getByTestId("intent-success")).toHaveCount(0);

    await page.getByTestId("intent-trade").fill("phishing kits");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-error")).toContainText("scam");
    await expect(page.getByTestId("intent-success")).toHaveCount(0);

    await page.getByTestId("intent-trade").fill("gore stickers");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-error")).toContainText("school-lot");
    await expect(page.getByTestId("intent-success")).toHaveCount(0);

    // Unique brand/trade so a parallel hood listing cannot steal the seat.
    await page.getByTestId("intent-brand").fill("Ban Co Cold");
    await page.getByTestId("intent-trade").fill("cold brew 23");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText("not charged");
    await expect(page.getByTestId("intent-list")).toContainText("Ban Co Cold");
  });

  test("slice 1.6: outbid viewer sees failed-winner waitlist handoff", async ({
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
    await expect(first.getByTestId("failed-winner-offer")).toHaveCount(0);
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
    const banner = outbidViewer.getByTestId("failed-winner-offer");
    await expect(banner).toBeVisible();
    await expect(banner).toContainText("Failed-winner");
    await expect(banner).toContainText("No silent reopen");
    await expect(banner.getByTestId("failed-winner-offer-amount")).toContainText(
      "Offer mark",
    );
    await expect(
      outbidViewer.getByTestId("failed-winner-waitlist").getByRole("link", {
        name: /waitlist/i,
      }),
    ).toHaveAttribute("href", "/#waitlist");
    const html = await outbidViewer.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    await outbidViewer.close();
  });

  test("slice 1.6: account lists outbid intents with waitlist handoff", async ({
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
    await second.goto("/panels/rear-bumper");
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

  test("slice 1.4: one brand per trade; challenger fights same panel only", async ({
    browser,
  }) => {
    const holder = await browser.newPage();
    await signIn(holder, "slice14-holder@example.com");
    await holder.goto("/panels/hood");
    await expect(holder.getByTestId("intent-trade-rule")).toContainText(
      "One brand per trade",
    );
    await expect(holder.getByTestId("intent-trade-rule")).toContainText(
      "same panel only",
    );
    await holder.getByTestId("intent-brand").fill("Slice Fourteen Hold");
    await holder.getByTestId("intent-trade").fill("Panel Seats");
    await holder.getByTestId("intent-standing").fill("2500");
    await holder.getByTestId("intent-submit").click();
    await expect(holder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await holder.close();

    const elsewhere = await browser.newPage();
    await signIn(elsewhere, "slice14-elsewhere@example.com");
    await elsewhere.goto("/panels/rear-bumper");
    await elsewhere.getByTestId("intent-brand").fill("Slice Fourteen Else");
    await elsewhere.getByTestId("intent-trade").fill("panel seats");
    await elsewhere.getByTestId("intent-submit").click();
    await expect(elsewhere.getByTestId("intent-error")).toContainText(
      /already held|one brand per trade/i,
    );
    await elsewhere.close();

    const challenger = await browser.newPage();
    await signIn(challenger, "slice14-challenger@example.com");
    await challenger.goto("/panels/hood");
    await challenger.getByTestId("intent-brand").fill("Slice Fourteen Fight");
    await challenger.getByTestId("intent-trade").fill("panel tools");
    await challenger.getByTestId("intent-standing").fill("2750");
    await challenger.getByTestId("intent-submit").click();
    await expect(challenger.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await expect(challenger.getByTestId("intent-list")).toContainText(
      "Slice Fourteen Fight",
    );
    await expect(challenger.getByTestId("intent-list")).toContainText("Outbid");
    await challenger.close();
  });

  test("slice 4.6: seat exclusivity copy; no public taxonomy list", async ({
    browser,
  }) => {
    const seat = await browser.newPage();
    await seat.goto("/panels/hood");
    await expect(seat.getByTestId("seat-exclusivity")).toBeVisible();
    await expect(seat.getByTestId("seat-exclusivity")).toContainText(
      PUBLIC_COPY.seatExclusivity.heading,
    );
    await expect(seat.getByTestId("seat-exclusivity-body")).toHaveText(
      PUBLIC_COPY.seatExclusivity.body,
    );
    // Slice 0.9 locked body drops the old "no public category list" phrase;
    // prove taxonomy UI is still absent.
    await expect(seat.getByTestId("taxonomy")).toHaveCount(0);
    await expect(seat.getByTestId("category-list")).toHaveCount(0);
    await expect(seat.getByTestId("trade-categories")).toHaveCount(0);
    const seatHtml = await seat.content();
    expect(seatHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(seatHtml).not.toContain("CLOSE_AT");
    expect(seatHtml).not.toContain("FEATURES.md");
    await seat.close();

    const signedIn = await browser.newPage();
    await signIn(signedIn, "slice46-exclusivity@example.com");
    await signedIn.goto("/panels/hood");
    await expect(signedIn.getByTestId("intent-trade-rule")).toHaveText(
      PUBLIC_COPY.seatExclusivity.formHint,
    );
    await signedIn.close();

    const home = await browser.newPage();
    await home.goto("/");
    await expect(home.getByTestId("taxonomy")).toHaveCount(0);
    await expect(home.getByTestId("category-list")).toHaveCount(0);
    await expect(home.getByTestId("trade-categories")).toHaveCount(0);
    const homeHtml = await home.content();
    expect(homeHtml).not.toContain("public category list");
    expect(homeHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(homeHtml).not.toContain("CLOSE_AT");
    expect(homeHtml).not.toContain("FEATURES.md");
    await home.close();
  });

  test("slice 1.8: public standing shows brand, trade, amount — no bidder email", async ({
    browser,
  }) => {
    const bidderEmail = "slice18-bidder@example.com";
    const bidder = await browser.newPage();
    await signIn(bidder, bidderEmail);
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Public Standing Co");
    await bidder.getByTestId("intent-trade").fill("standing seats");
    await bidder.getByTestId("intent-standing").fill("2500");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await expect(bidder.getByTestId("public-standing-brand")).toHaveText(
      "Public Standing Co",
    );
    await expect(bidder.getByTestId("public-standing-trade")).toHaveText(
      "standing seats",
    );
    await expect(bidder.getByTestId("public-standing-amount")).toContainText(
      "2,500",
    );
    await bidder.close();

    const visitor = await browser.newPage();
    await visitor.goto("/panels/hood");
    await expect(visitor.getByTestId("seat-occupancy")).toHaveText("Seat held");
    await expect(visitor.getByTestId("public-standing-brand")).toHaveText(
      "Public Standing Co",
    );
    await expect(visitor.getByTestId("public-standing-trade")).toHaveText(
      "standing seats",
    );
    await expect(visitor.getByTestId("public-standing-amount")).toContainText(
      "2,500",
    );
    await expect(visitor.getByTestId("intent-list")).toContainText(
      "Public Standing Co",
    );
    await expect(visitor.getByTestId("intent-list")).toContainText(
      "standing seats",
    );
    await expect(visitor.getByTestId("intent-list")).toContainText("2,500");
    const html = await visitor.content();
    expect(html).not.toContain(bidderEmail);
    expect(html).not.toContain("slice18-bidder");
    expect(html.toLowerCase()).not.toContain("gmail.com");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    await visitor.close();
  });

  test("slice 2.1: /operator lists pending intents for allow-listed operators", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "slice21-bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Slice TwentyOne Co");
    await bidder.getByTestId("intent-trade").fill("operator seats");
    await bidder.getByTestId("intent-standing").fill("2500");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "slice21-ops@example.com");
    await expect(operator.getByTestId("approvals-nav-link")).toHaveAttribute(
      "href",
      "/operator",
    );
    await operator.goto("/operator");
    await expect(operator.getByTestId("operator-approvals")).toBeVisible();
    await expect(operator.getByTestId("approvals-count")).toContainText(
      "waiting",
    );
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Slice TwentyOne Co",
    );
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "operator seats",
    );
    await expect(operator.getByTestId("approvals-list")).toContainText("2,500");
    const html = await operator.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("slice21-bidder@example.com");
    await operator.close();
  });

  test("slice 2.5: operator UI cannot edit FLOOR_USD / GOAL_USD / CLOSE_AT", async ({
    browser,
  }) => {
    const operator = await browser.newPage();
    await signIn(operator, "slice25-ops@example.com");
    await operator.goto("/operator");
    await expect(operator.getByTestId("operator-approvals")).toBeVisible();
    await expect(
      operator.getByTestId("operator-campaign-locks"),
    ).toBeVisible();
    await expect(
      operator.getByTestId("operator-campaign-locks"),
    ).toHaveAttribute("data-editable", "false");
    await expect(operator.getByTestId("operator-lock-floor")).toHaveText(
      "$58,000",
    );
    await expect(operator.getByTestId("operator-lock-goal")).toHaveText(
      "$120,000",
    );
    await expect(operator.getByTestId("operator-lock-close")).toHaveText(
      "unset",
    );
    await expect(
      operator.locator(
        'input[name="FLOOR_USD"], input[name="GOAL_USD"], input[name="CLOSE_AT"], input[name="floorUsd"], input[name="goalUsd"], input[name="closeAt"]',
      ),
    ).toHaveCount(0);
    await expect(
      operator
        .getByTestId("operator-campaign-locks")
        .locator("input, select, textarea"),
    ).toHaveCount(0);
    const html = await operator.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    await operator.close();
  });

  test("slice 1.5: next intent >= standing + max($250, 10%)", async ({
    browser,
  }) => {
    const holder = await browser.newPage();
    await signIn(holder, "slice15-holder@example.com");
    await holder.goto("/panels/hood");
    await expect(holder.getByTestId("intent-increment-rule")).toContainText(
      "standing + max($250, 10%)",
    );
    await holder.getByTestId("intent-brand").fill("Slice Fifteen Hold");
    await holder.getByTestId("intent-trade").fill("increment seats");
    await holder.getByTestId("intent-standing").fill("2500");
    await holder.getByTestId("intent-submit").click();
    await expect(holder.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await holder.close();

    const low = await browser.newPage();
    await signIn(low, "slice15-low@example.com");
    await low.goto("/panels/hood");
    await expect(low.getByTestId("panel-standing")).toContainText("2,500");
    await expect(low.getByTestId("panel-minimum")).toContainText("2,750");
    await expect(low.getByTestId("intent-increment-rule")).toContainText(
      "standing + max($250, 10%)",
    );
    await low.getByTestId("intent-brand").fill("Slice Fifteen Low");
    await low.getByTestId("intent-trade").fill("increment tools");
    await low.getByTestId("intent-standing").evaluate((el: HTMLInputElement) => {
      el.removeAttribute("min");
    });
    await low.getByTestId("intent-standing").fill("2749");
    await low.getByTestId("intent-submit").click();
    await expect(low.getByTestId("intent-error")).toContainText(
      /at least 2,?750/i,
    );
    await low.close();

    const ok = await browser.newPage();
    await signIn(ok, "slice15-ok@example.com");
    await ok.goto("/panels/hood");
    await ok.getByTestId("intent-brand").fill("Slice Fifteen Ok");
    await ok.getByTestId("intent-trade").fill("increment vinyl");
    await ok.getByTestId("intent-standing").fill("2750");
    await ok.getByTestId("intent-submit").click();
    await expect(ok.getByTestId("intent-success")).toContainText("not charged");
    await expect(ok.getByTestId("intent-list")).toContainText(
      "Slice Fifteen Ok",
    );
    await expect(ok.getByTestId("panel-standing")).toContainText("2,750");
    await expect(ok.getByTestId("panel-minimum")).toContainText("3,025");
    await ok.close();
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
    await operator.goto("/operator");
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
    await expect(shop.getByTestId("partner-shop")).toHaveAttribute(
      "data-truck-exists",
      "false",
    );
    for (const board of [
      "vault-certificate",
      "weekly-mileage-ledger",
      "sighting-bounty-cards",
    ] as const) {
      await expect(shop.getByTestId(board)).toHaveCount(0);
    }
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
    await expect(shop.getByTestId("wrap-shop-matrix")).toHaveCount(0);
    await expect(shop.getByTestId("wrap-shop-approved-list")).toContainText(
      "Shop Bound Co",
    );
    await expect(shop.locator('[data-testid^="approve-"]')).toHaveCount(0);
    await expect(shop.locator('[data-testid^="reject-"]')).toHaveCount(0);
    await expect(shop.getByTestId("partner-shop-lead")).toContainText(
      "No payments",
    );
    const html = await shop.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("Stripe");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    await shop.goto("/");
    await expect(shop.getByTestId("shop-nav-link")).toHaveCount(0);
    await expect(shop.getByRole("link", { name: /wrap shop/i })).toHaveCount(0);
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
    await operator.goto("/operator");
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
    for (const factId of [
      "vault-certificate",
      "retired-vinyl",
      "season-two",
      "rain-night-lighting",
      "truck-order-tracker",
      "weekly-mileage-ledger",
      "landmark-proof-log",
      "city-time-heatmap",
      "qr-nfc-scan-counter",
      "city-ping-winner",
      "charge-stop-slots",
      "route-detour-buyout",
      "clemson-saturday-lock",
      "sighting-bounty-cards",
    ] as const) {
      await expect(winner.getByTestId(`winner-fact-${factId}`)).toHaveCount(0);
    }
    await expect(winner.getByTestId("winner-portal")).toHaveAttribute(
      "data-truck-exists",
      "false",
    );

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

  test("slice 3.5: artwork URL attaches on the intent mark", async ({ page }) => {
    await signIn(page, "slice35-art@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-artwork-fields")).toBeVisible();
    await expect(page.getByTestId("intent-artwork-note")).toContainText(
      "Intent only",
    );
    await page.getByTestId("intent-brand").fill("Slice ThirtyFive Art");
    await page.getByTestId("intent-trade").fill("artwork marks");
    await page
      .getByTestId("intent-artwork-url")
      .fill("https://cdn.example.com/slice35.png");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible();
    await expect(page.getByTestId("intent-list")).toContainText(
      "Slice ThirtyFive Art",
    );
    await expect(
      page
        .locator('[data-testid^="intent-artwork-"][data-artwork-kind="url"]')
        .first(),
    ).toBeVisible();
    await expect(
      page.locator('[data-testid^="intent-artwork-link-"]').first(),
    ).toHaveAttribute("href", "https://cdn.example.com/slice35.png");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("slice 3.6: day/night/wet/dirty toggles are shaders, not proof photos", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-preview-toggles",
      "false",
    );
    await expect(page.getByTestId("finish-conditions-lead")).toHaveCount(0);
    await expect(page.getByTestId("finish-conditions")).toHaveCount(0);
    for (const id of ["day", "night", "wet", "dirty"] as const) {
      await expect(page.getByTestId(`finish-condition-${id}`)).toHaveCount(0);
    }
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-condition",
      "day",
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toContain("proof photo of the truck");
  });

  test("slice 5.2: /account shows my intents only", async ({ browser }) => {
    const alice = await browser.newPage();
    await signIn(alice, "slice52-alice@example.com");
    await alice.goto("/panels/hood");
    await alice.getByTestId("intent-brand").fill("Alice Only Brand");
    await alice.getByTestId("intent-trade").fill("alice only trade");
    await alice.getByTestId("intent-standing").fill("2500");
    await alice.getByTestId("intent-submit").click();
    await expect(alice.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await alice.close();

    const bob = await browser.newPage();
    await signIn(bob, "slice52-bob@example.com");
    await bob.goto("/panels/tailgate");
    await bob.getByTestId("intent-brand").fill("Bob Only Brand");
    await bob.getByTestId("intent-trade").fill("bob only trade");
    await bob.getByTestId("intent-standing").fill("2500");
    await bob.getByTestId("intent-submit").click();
    await expect(bob.getByTestId("intent-success")).toContainText(
      "not charged",
    );
    await bob.goto("/account");
    await expect(bob.getByTestId("account-intents-list")).toContainText(
      "Bob Only Brand",
    );
    await expect(bob.getByTestId("account-intents-list")).not.toContainText(
      "Alice Only Brand",
    );
    await expect(bob.getByTestId("account-page")).toContainText("$58,000");
    await expect(bob.getByTestId("account-page")).toContainText("$120,000");
    const bobHtml = await bob.content();
    expect(bobHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(bobHtml).not.toContain("CLOSE_AT");
    expect(bobHtml.toLowerCase()).not.toContain("dennard");
    await bob.close();

    const aliceAgain = await browser.newPage();
    await signIn(aliceAgain, "slice52-alice@example.com");
    await aliceAgain.goto("/account");
    await expect(aliceAgain.getByTestId("account-intents-list")).toContainText(
      "Alice Only Brand",
    );
    await expect(
      aliceAgain.getByTestId("account-intents-list"),
    ).not.toContainText("Bob Only Brand");
    const aliceHtml = await aliceAgain.content();
    expect(aliceHtml.toLowerCase()).not.toMatch(/\blease\b/);
    expect(aliceHtml).not.toContain("CLOSE_AT");
    await aliceAgain.close();
  });

  test("slice 3.7: side/front/rear SVG seats; empty seats raw 30X", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("truck-views-section")).toBeVisible();
    await expect(page.getByTestId("truck-view-seats")).toBeVisible();
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-baked-marks",
      "true",
    );
    await expect(page.getByTestId("truck-view-lead")).toHaveCount(0);
    await expect(page.getByTestId("floor-amount")).toContainText("$58,000");
    await expect(page.getByTestId("goal-amount")).toContainText("$120,000");
    await expect(page.getByTestId("truck-view-driver")).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByTestId("truck-seat-driver-door")).toBeVisible();
    await expect(page.getByTestId("truck-seat-hood")).toHaveCount(0);
    await page.getByTestId("truck-view-front").click();
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-view",
      "front",
    );
    await expect(page.getByTestId("truck-seat-front-fascia")).toBeVisible();
    await page.getByTestId("truck-view-rear").click();
    await expect(page.getByTestId("truck-view-seats")).toHaveAttribute(
      "data-view",
      "rear",
    );
    await expect(page.getByTestId("truck-seat-tailgate")).toBeVisible();
    await page.getByTestId("panel-link-tailgate").click();
    await expect(page).toHaveURL(/\/panels\/tailgate/);
    await expect(page.getByTestId("truck-view-seats")).toBeVisible();
    await expect(page.getByTestId("truck-seat-tailgate")).toHaveAttribute(
      "data-active",
      "true",
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

});
