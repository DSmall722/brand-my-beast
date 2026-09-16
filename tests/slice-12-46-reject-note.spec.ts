import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  expect,
  test,
  type APIRequestContext,
  type Page,
} from "@playwright/test";
import { assertNoteRequiredForReject } from "../src/lib/artwork-approval";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

async function signIn(page: Page, email: string) {
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
 * Slice 12.46 — reject without note fails; with note succeeds.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.46: reject without note fails; with note succeeds", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    await resetServerIntents(request);
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

  test("assertNoteRequiredForReject gate", () => {
    expect(
      assertNoteRequiredForReject({ decision: "rejected", note: "" }).ok,
    ).toBe(false);
    expect(
      assertNoteRequiredForReject({ decision: "rejected", note: "ab" }).ok,
    ).toBe(false);
    const ok = assertNoteRequiredForReject({
      decision: "rejected",
      note: "Too loud for a school lot",
    });
    expect(ok.ok).toBe(true);
    expect(
      assertNoteRequiredForReject({ decision: "approved", note: "" }).ok,
    ).toBe(true);
  });

  test("operator UI: empty reject fails, note then succeeds", async ({
    browser,
  }) => {
    const bidder = await browser.newPage();
    await signIn(bidder, "slice1246-bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Slice Twelve Forty Six Co");
    await bidder.getByTestId("intent-trade").fill("Panel Tools");
    await bidder.getByTestId("intent-submit").click();
    await expect(bidder.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await bidder.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    await operator.goto("/operator");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Slice Twelve Forty Six Co",
    );

    await operator.locator('[data-testid^="reject-"]').first().click();
    await expect(
      operator.locator('[data-testid^="approval-error-"]').first(),
    ).toContainText("note");
    await expect(operator.getByTestId("approvals-list")).toContainText(
      "Slice Twelve Forty Six Co",
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
      "Slice Twelve Forty Six Co",
    );
    await expect(operator.getByTestId("approvals-decided")).toContainText(
      "Cannot pass a grocery lot",
    );

    const html = (await operator.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    await operator.close();
  });
});
