import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import {
  ACCOUNT_EXPORT_FILENAME,
  ACCOUNT_EXPORT_PATH,
  accountExportJson,
  buildAccountExport,
} from "../src/lib/account-export";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

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
 * Slice 12.15 — account export JSON. Auth-gated.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.15: account export JSON", () => {
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

  test("buildAccountExport is intent-only JSON with closeAt null", async () => {
    await resetIntentStoreForTests();
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "test:export@example.com",
      brandLabel: "ExportCo",
      tradeLabel: "export trade",
      standingUsd: 2_500,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const payload = buildAccountExport({
      email: "export@example.com",
      userId: "test:export@example.com",
      waitlist: {
        email: "export@example.com",
        createdAt: "2026-01-01T00:00:00.000Z",
        userId: "test:export@example.com",
        source: "homepage",
        confirmToken: "secret-token-must-not-leak",
        confirmedAt: "2026-01-01T00:05:00.000Z",
        wantWholeTruck: false,
      },
      intents: [listed.bid],
      exportedAt: "2026-09-16T12:00:00.000Z",
    });

    expect(payload.brand).toBe("BrandMyBeast");
    expect(payload.intentOnly).toBe(true);
    expect(payload.closeAt).toBeNull();
    expect(payload.account).toEqual({
      email: "export@example.com",
      userId: "test:export@example.com",
    });
    expect(payload.waitlist).toEqual({
      email: "export@example.com",
      createdAt: "2026-01-01T00:00:00.000Z",
      source: "homepage",
      confirmedAt: "2026-01-01T00:05:00.000Z",
    });
    expect(payload.waitlist).not.toHaveProperty("confirmToken");
    expect(payload.intents).toHaveLength(1);
    expect(payload.intents[0]?.brandLabel).toBe("ExportCo");
    expect(payload.intents[0]?.standingUsd).toBe(2_500);
    expect(payload.intents[0]).not.toHaveProperty("paymentMethod");
    expect(payload.intents[0]).not.toHaveProperty("stripe");

    const json = accountExportJson(payload);
    expect(json).toContain('"closeAt": null');
    expect(json).not.toMatch(/secret-token-must-not-leak/);
    expect(json.toLowerCase()).not.toMatch(/\blease\b/);
    expect(json.toLowerCase()).not.toMatch(/stripe/);
    expect(ACCOUNT_EXPORT_PATH).toBe("/api/account/export");
    expect(ACCOUNT_EXPORT_FILENAME).toBe("brandmybeast-account.json");
  });

  test("unsigned export is 401", async ({ request }) => {
    const anon = await request.get(ACCOUNT_EXPORT_PATH);
    expect(anon.status()).toBe(401);
  });

  test("signed-in download returns own intents JSON only", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("ExportStandingCo");
    await page.getByTestId("intent-trade").fill("export standing");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await page.goto("/account");
    await expect(page.getByTestId("account-export-download")).toBeVisible();
    await expect(page.getByTestId("account-export-download")).toHaveAttribute(
      "href",
      ACCOUNT_EXPORT_PATH,
    );

    const res = await page.request.get(ACCOUNT_EXPORT_PATH);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/application\/json/);
    expect(res.headers()["content-disposition"]).toContain(
      ACCOUNT_EXPORT_FILENAME,
    );

    const body = await res.json();
    expect(body.brand).toBe("BrandMyBeast");
    expect(body.intentOnly).toBe(true);
    expect(body.closeAt).toBeNull();
    expect(body.account.email).toBe("bidder-a@example.com");
    expect(body.intents.some((row: { brandLabel: string }) => row.brandLabel === "ExportStandingCo")).toBe(
      true,
    );
    expect(JSON.stringify(body).toLowerCase()).not.toMatch(/\blease\b/);
    expect(JSON.stringify(body).toLowerCase()).not.toMatch(/stripe/);
    expect(JSON.stringify(body)).not.toMatch(/confirmToken/);
  });
});
