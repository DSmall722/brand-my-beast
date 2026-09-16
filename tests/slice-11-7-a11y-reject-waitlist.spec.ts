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
import { PUBLIC_COPY } from "../src/lib/public-copy";

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
 * Slice 11.7 — reject-note required announced; waitlist errors linked to field.
 */
test.describe("slice 11.7: a11y reject-note + waitlist field errors", () => {
  test("campaign money fences stay locked", () => {
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

  test("waitlist errors link to the email field via aria-describedby", async ({
    page,
  }) => {
    await page.goto("/#waitlist");
    const email = page.getByTestId("waitlist-email");
    await expect(email).toHaveAttribute("aria-describedby", "waitlist-status");

    await email.fill("not-an-email");
    await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/waitlist") && res.request().method() === "POST",
      ),
      page.getByTestId("waitlist-submit").click(),
    ]);

    await expect(page.getByTestId("waitlist-status")).toHaveAttribute(
      "role",
      "alert",
    );
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("waitlist-status")).not.toHaveText("");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html.toLowerCase()).not.toContain("gmail.com");
    expect(html).toContain(PUBLIC_COPY.waitlist.button);
  });

  test("reject without note announces required note on the field", async ({
    browser,
    request,
  }) => {
    await resetServerIntents(request);

    const bidder = await browser.newPage();
    await signIn(bidder, "slice117-bidder@example.com");
    await bidder.goto("/panels/hood");
    await bidder.getByTestId("intent-brand").fill("Slice Eleven Seven Co");
    await bidder.getByTestId("intent-trade").fill("Circuit A11y");
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
      "Slice Eleven Seven Co",
    );

    const note = operator.locator('textarea[data-testid^="approval-note-"]').first();
    await expect(note).toHaveAttribute("aria-required", "true");
    await expect(note).toHaveAttribute("aria-describedby", /approval-note-hint-/);

    await operator.locator('[data-testid^="reject-"]').first().click();
    const error = operator.locator('[data-testid^="approval-error-"]').first();
    await expect(error).toBeVisible();
    await expect(error).toHaveAttribute("role", "alert");
    await expect(error).toContainText(/note/i);
    await expect(note).toHaveAttribute("aria-invalid", "true");
    const describedBy = await note.getAttribute("aria-describedby");
    expect(describedBy).toMatch(/approval-note-hint-/);
    expect(describedBy).toMatch(/approval-error-/);

    const html = await operator.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain(formatUsd(FLOOR_USD));
    expect(html).toContain(formatUsd(GOAL_USD));
    await operator.close();
  });
});
