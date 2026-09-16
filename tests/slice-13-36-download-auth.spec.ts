import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  canDownloadOperatorCsv,
  canDownloadSeatPng,
  canDownloadShopPdf,
  isDownloadOperatorEmail,
} from "../src/lib/download-auth";
import { OPERATOR_CSV_PATH } from "../src/lib/operator-csv";
import { seatExportPngPath } from "../src/lib/seat-export-png";
import { shopPdfPath } from "../src/lib/shop-pdf";

/**
 * Slice 13.36 — download routes (CSV, PDF, PNG) require operator or owner.
 * Playwright 401/403. CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 13.36: download routes operator or owner", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  // Slice 6.1 (and peers) expect raised $0 — wipe standing after approve fixtures.
  test.afterEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("unit: download gates — operator narrow in test; owner match", () => {
    const testEnv = { AUTH_MODE: "test" };
    expect(isDownloadOperatorEmail("operator@example.com", testEnv)).toBe(
      true,
    );
    expect(isDownloadOperatorEmail("bidder-a@example.com", testEnv)).toBe(
      false,
    );
    expect(canDownloadOperatorCsv("bidder-a@example.com", testEnv)).toBe(
      false,
    );
    expect(canDownloadOperatorCsv("operator@example.com", testEnv)).toBe(
      true,
    );
    expect(canDownloadShopPdf("shop@example.com", testEnv)).toBe(true);
    expect(canDownloadShopPdf("operator@example.com", testEnv)).toBe(true);
    expect(canDownloadShopPdf("bidder-a@example.com", testEnv)).toBe(false);
    expect(
      canDownloadSeatPng({
        email: "bidder-a@example.com",
        userId: "test:bidder-a@example.com",
        ownerUserId: "test:bidder-a@example.com",
        env: testEnv,
      }),
    ).toBe(true);
    expect(
      canDownloadSeatPng({
        email: "bidder-b@example.com",
        userId: "test:bidder-b@example.com",
        ownerUserId: "test:bidder-a@example.com",
        env: testEnv,
      }),
    ).toBe(false);
    expect(
      canDownloadSeatPng({
        email: "operator@example.com",
        userId: "test:operator@example.com",
        ownerUserId: "test:bidder-a@example.com",
        env: testEnv,
      }),
    ).toBe(true);

    const liveEnv = {
      AUTH_MODE: "live",
      OPERATOR_EMAILS: "ops@brandmybeast.com",
      SHOP_PARTNER_EMAILS: "wrap@brandmybeast.com",
    };
    expect(isDownloadOperatorEmail("ops@brandmybeast.com", liveEnv)).toBe(
      true,
    );
    expect(isDownloadOperatorEmail("stranger@example.com", liveEnv)).toBe(
      false,
    );
    expect(canDownloadShopPdf("wrap@brandmybeast.com", liveEnv)).toBe(true);
  });

  test("API: anon 401 on CSV, PDF, PNG", async ({ request }) => {
    const csv = await request.get(OPERATOR_CSV_PATH);
    expect(csv.status()).toBe(401);

    const pdf = await request.get(shopPdfPath("any-bid"));
    expect(pdf.status()).toBe(401);

    const png = await request.get(seatExportPngPath("hood"));
    expect(png.status()).toBe(401);
  });

  test("API: signed-in non-owner 403 on CSV, PDF, PNG; owner/operator 200", async ({
    page,
    request,
  }) => {
    // Tailgate keeps this suite off hood (10.6). Approve the specific row —
    // parallel suites may leave other pending intents on /operator.
    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/tailgate");
    await page.getByTestId("intent-brand").fill("DlOwnerCo");
    await page.getByTestId("intent-trade").fill("download vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    const ownerPng = await page.request.get(seatExportPngPath("tailgate"));
    expect(ownerPng.status()).toBe(200);
    expect(ownerPng.headers()["content-type"]).toContain("image/png");

    const ownerCsv = await page.request.get(OPERATOR_CSV_PATH);
    expect(ownerCsv.status()).toBe(403);

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    const ownerRow = page.locator('[data-testid^="approval-row-"]').filter({
      hasText: "DlOwnerCo",
    });
    await expect(ownerRow).toBeVisible({ timeout: 10_000 });
    await ownerRow.locator('[data-testid^="approve-"]').click();
    await expect(page.getByTestId("approvals-decided")).toContainText(
      "DlOwnerCo",
      { timeout: 10_000 },
    );

    const opCsv = await page.request.get(OPERATOR_CSV_PATH);
    expect(opCsv.status()).toBe(200);
    expect(opCsv.headers()["content-type"]).toMatch(/text\/csv/);

    const opPng = await page.request.get(seatExportPngPath("tailgate"));
    expect(opPng.status()).toBe(200);

    await signIn(page, "shop@example.com");
    await page.goto("/partner/shop");
    const seatRow = page.locator('[data-testid^="wrap-approved-"]').filter({
      hasText: "DlOwnerCo",
    });
    await expect(seatRow).toBeVisible({ timeout: 10_000 });
    const pdfLink = seatRow.getByTestId(/^wrap-shop-pdf-/);
    await expect(pdfLink).toBeVisible();
    const href = await pdfLink.getAttribute("href");
    expect(href).toBeTruthy();

    const shopPdf = await page.request.get(href!);
    expect(shopPdf.status()).toBe(200);
    expect(shopPdf.headers()["content-type"]).toMatch(/application\/pdf/);

    await signIn(page, "bidder-b@example.com");
    const forbiddenPdf = await page.request.get(href!);
    expect(forbiddenPdf.status()).toBe(403);

    const strangerPng = await page.request.get(seatExportPngPath("tailgate"));
    expect(strangerPng.status()).toBe(403);

    const anonCsv = await request.get(OPERATOR_CSV_PATH);
    expect(anonCsv.status()).toBe(401);

    const html = await (await request.get("/")).text();
    expect(html).toContain("BrandMyBeast");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
