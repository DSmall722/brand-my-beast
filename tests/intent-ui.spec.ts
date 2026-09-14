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
    await expect(page.getByTestId("panel-mockup")).toBeVisible();
    await expect(page.getByTestId("panel-stats")).toBeVisible();
    await expect(page.getByTestId("intent-only-banner")).toContainText(
      "No Stripe capture",
    );
    await expect(page.getByTestId("intent-signin-needed")).toBeVisible();
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("signed-in bidder lists intent and operator can approve", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Signal Co");
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
    await operator.locator('[data-testid^="reject-"]').first().click();
    await expect(operator.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
    await operator.close();
  });
});
