import { existsSync } from "node:fs";
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
import { buildLlmsTxt } from "../src/lib/llms-txt";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.21 — `/llms.txt` with PUBLIC_COPY facts only.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

test.describe("slice 14.21: /llms.txt PUBLIC_COPY facts only", () => {
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

  test("builder emits PUBLIC_COPY facts only — no lease, no invented close", () => {
    const body = buildLlmsTxt();
    expect(body).toContain(`# ${PUBLIC_COPY.header.wordmark}`);
    expect(body).toContain(PUBLIC_COPY.meta.description);
    expect(body).toContain(PUBLIC_COPY.hero.h1);
    expect(body).toContain(PUBLIC_COPY.hero.lead);
    expect(body).toContain(PUBLIC_COPY.board.floorLabel);
    expect(body).toContain(PUBLIC_COPY.board.buyoutLabel);
    expect(body).toContain(PUBLIC_COPY.board.clockWhenCloseNull);
    expect(body).toContain(PUBLIC_COPY.panels.lead);
    expect(body).toContain(PUBLIC_COPY.waitlist.lead);
    expect(body).toContain(PUBLIC_COPY.footer.line);
    expect(body).toContain("$58,000");
    expect(body).toContain("$120,000");
    expect(body).toContain("CLOSE_AT is null");
    expect(body).toContain(`https://${BRAND.domain}`);
    expect(body).toContain(BRAND.handle);
    expect(body).toContain(BRAND.email);
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body).not.toMatch(/@gmail\.com/);
    expect(body.toLowerCase()).not.toMatch(/stripe/);
    // No invented warmer homepage H1
    expect(body).not.toMatch(/advertise on steel/i);
  });

  test("GET /llms.txt returns text/plain with the same facts", async ({
    request,
  }) => {
    expect(existsSync(join(process.cwd(), "src/app/llms.txt/route.ts"))).toBe(
      true,
    );
    const res = await request.get("/llms.txt");
    expect(res.ok()).toBeTruthy();
    const contentType = res.headers()["content-type"] ?? "";
    expect(contentType).toMatch(/text\/plain/);
    const body = await res.text();
    expect(body).toBe(buildLlmsTxt());
    expect(body).toContain(PUBLIC_COPY.meta.description);
    expect(body).toContain("$58,000");
    expect(body).toContain("$120,000");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
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
