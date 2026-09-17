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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { seatsClosedIntentPayload } from "../src/lib/seats-open";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.32 — SEATS_OPEN=false → intent POST 403, waitlist still 201.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();

test.describe("slice 14.32: SEATS_OPEN=false intent 403 waitlist 201", () => {
  // Shared Next-server seats override — keep serial so workers cannot reopen mid-assert.
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    await request.post("/api/test/seats-open", { data: { reset: true } });
    await request.post("/api/test/reset-intents");
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("SEATS_OPEN=false → intent POST 403; waitlist still 201", async ({
    request,
  }) => {
    const closed = await request.post("/api/test/seats-open", {
      data: { open: false },
    });
    expect(closed.ok()).toBeTruthy();
    const closedBody = (await closed.json()) as {
      ok?: boolean;
      seatsOpen?: boolean;
      closeAt?: null;
    };
    expect(closedBody.ok).toBe(true);
    expect(closedBody.seatsOpen).toBe(false);
    expect(closedBody.closeAt).toBeNull();
    expect(CLOSE_AT).toBeNull();

    const intent = await request.post("/api/intent", {
      data: {
        panelId: "hood",
        brandLabel: "Closed Seat Co",
        tradeLabel: "closed snacks",
        standingUsd: 2500,
      },
    });
    expect(intent.status()).toBe(403);
    const intentBody = (await intent.json()) as {
      ok?: boolean;
      error?: string;
      code?: string;
    };
    expect(intentBody).toEqual(seatsClosedIntentPayload());
    expect(intentBody.error).toBe(PUBLIC_COPY.intent.seatsClosedWaitlistOnly);
    expect(intentBody.error?.toLowerCase()).toContain("waitlist only");
    expect(intentBody.error).not.toMatch(/close.?at/i);

    const waitlist = await request.post("/api/waitlist", {
      data: { email: "seats1432-waitlist@example.com" },
    });
    expect(waitlist.status()).toBe(201);
    const waitBody = (await waitlist.json()) as {
      ok?: boolean;
      status?: string;
    };
    expect(waitBody.ok).toBe(true);
    expect(waitBody.status).toBe("created");

    const src = readFileSync(
      join(ROOT, "src/app/api/intent/route.ts"),
      "utf8",
    );
    expect(src).toContain("Slice 14.32");
    expect(src).toContain("seatsClosedIntentPayload");
    expect(src).toContain("status: 403");
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
