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
import { PUBLIC_COPY } from "../src/lib/public-copy";
import {
  seatExportFinishBadge,
  seatExportPngCopyIsSafe,
  seatExportPngFilename,
  seatExportPngPath,
  seatExportStandingLabel,
} from "../src/lib/seat-export-png";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 10.6 — export one PNG per seat (auth-gated server route).
 * CLOSE_AT null. No Stripe. No permanent vinyl.
 */
test.describe("slice 10.6: export seat PNG", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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

  test("unit: export helpers stay PUBLIC_COPY-safe", () => {
    expect(seatExportPngPath("hood")).toBe("/api/panels/hood/export");
    expect(seatExportPngFilename("hood")).toBe("brandmybeast-hood.png");
    expect(seatExportFinishBadge(true)).toBe(PUBLIC_COPY.panels.badgeEtch);
    expect(seatExportFinishBadge(false)).toBe(PUBLIC_COPY.panels.badgeWrap);
    expect(seatExportStandingLabel(null)).toBe("Open seat");
    expect(seatExportStandingLabel("  Steel Co  ")).toBe("Steel Co");
    const blob = [
      BRAND.name,
      formatUsd(FLOOR_USD),
      formatUsd(GOAL_USD),
      seatExportFinishBadge(true),
      "Open seat",
    ].join("\n");
    expect(seatExportPngCopyIsSafe(blob)).toBe(true);
    expect(
      seatExportPngCopyIsSafe(`${blob}\npermanent vinyl`),
    ).toBe(false);
  });

  test("API: anonymous 401; non-owner 403; owner and operator get PNG", async ({
    browser,
    request,
  }) => {
    const anon = await request.get("/api/panels/hood/export");
    expect(anon.status()).toBe(401);

    const missing = await request.get("/api/panels/not-a-panel/export");
    // Still 401 when anonymous — auth before panel lookup is fine either way.
    expect([401, 404]).toContain(missing.status());

    const stranger = await browser.newPage();
    await signIn(stranger, "export106-stranger@example.com");
    const denied = await stranger.request.get("/api/panels/hood/export");
    expect(denied.status()).toBe(403);
    await stranger.close();

    const owner = await browser.newPage();
    await signIn(owner, "export106-owner@example.com");
    await owner.goto("/panels/hood");
    await owner.getByTestId("intent-brand").fill("Export106Co");
    await owner.getByTestId("intent-trade").fill("export vinyl");
    await owner.getByTestId("intent-standing").fill("2500");
    await owner.getByTestId("intent-submit").click();
    await expect(owner.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });
    await expect(owner.getByTestId("seat-export-png-link")).toHaveCount(0);
    await expect(owner.getByTestId("seat-export-png-signin")).toHaveCount(0);

    const ownerRes = await owner.request.get("/api/panels/hood/export");
    expect(ownerRes.ok()).toBeTruthy();
    expect(ownerRes.headers()["content-type"]).toContain("image/png");
    expect(ownerRes.headers()["content-disposition"]).toContain(
      "brandmybeast-hood.png",
    );
    const buf = Buffer.from(await ownerRes.body());
    expect(
      buf
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toBe(true);

    const html = await owner.content();
    expect(html.toLowerCase()).not.toContain("permanent vinyl");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    await owner.close();

    const operator = await browser.newPage();
    await signIn(operator, "operator@example.com");
    const opRes = await operator.request.get("/api/panels/hood/export");
    expect(opRes.ok()).toBeTruthy();
    expect(opRes.headers()["content-type"]).toContain("image/png");
    await operator.close();
  });
});
