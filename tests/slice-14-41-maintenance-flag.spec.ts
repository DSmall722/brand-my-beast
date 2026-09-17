import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  MAINTENANCE,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  maintenanceIntentPayload,
  maintenanceIsSeparateFromCloseAt,
} from "../src/lib/maintenance";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 14.41 — Maintenance flag: `/` stays up, intent POST returns
 * “not taking marks.” CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

const ROOT = process.cwd();

test.describe("slice 14.41: maintenance flag — / up, intent not taking marks", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
    await request.post("/api/test/maintenance", { data: { reset: true } });
  });

  test.afterEach(async ({ request }) => {
    await request.post("/api/test/maintenance", { data: { reset: true } });
    await request.post("/api/test/reset-intents");
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(MAINTENANCE).toBe(false);
    expect(maintenanceIsSeparateFromCloseAt()).toBe(true);
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(ROOT, "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("copy says not taking marks; payload code is maintenance", () => {
    expect(PUBLIC_COPY.intent.maintenanceNotTakingMarks.toLowerCase()).toContain(
      "not taking marks",
    );
    const payload = maintenanceIntentPayload();
    expect(payload.ok).toBe(false);
    expect(payload.code).toBe("maintenance");
    expect(payload.error.toLowerCase()).toContain("not taking marks");
  });

  test("MAINTENANCE on → intent POST 503; homepage still 200", async ({
    request,
    page,
  }) => {
    const on = await request.post("/api/test/maintenance", {
      data: { on: true },
    });
    expect(on.ok()).toBeTruthy();
    const onBody = (await on.json()) as {
      ok?: boolean;
      maintenance?: boolean;
      closeAt?: null;
    };
    expect(onBody.ok).toBe(true);
    expect(onBody.maintenance).toBe(true);
    expect(onBody.closeAt).toBeNull();
    expect(CLOSE_AT).toBeNull();

    const home = await request.get("/");
    expect(home.status()).toBe(200);
    const homeText = await home.text();
    expect(homeText).toContain(BRAND.name);
    expect(homeText).toContain("$58,000");
    expect(homeText).toContain("$120,000");
    expect(homeText.toLowerCase()).not.toMatch(/\blease\b/);

    await page.goto("/");
    await expect(page.locator("body")).toContainText(BRAND.name);
    const html = (await page.content()).toLowerCase();
    expect(html).toContain("brandmybeast");
    expect(html).not.toMatch(/\blease\b/);

    const intent = await request.post("/api/intent", {
      data: {
        panelId: "hood",
        brandLabel: "Maint Co",
        tradeLabel: "maint snacks",
        standingUsd: 2500,
      },
    });
    expect(intent.status()).toBe(503);
    const intentBody = (await intent.json()) as {
      ok?: boolean;
      error?: string;
      code?: string;
    };
    expect(intentBody.ok).toBe(false);
    expect(intentBody.code).toBe("maintenance");
    expect(intentBody.error?.toLowerCase()).toContain("not taking marks");

    const waitlist = await request.post("/api/waitlist", {
      data: { email: "maint-1441@example.com" },
    });
    expect(waitlist.status()).toBe(201);
  });
});
