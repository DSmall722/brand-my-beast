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
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  joinWaitlist,
  resetWaitlistStoreForTests,
} from "../src/lib/waitlist";
import {
  DEFAULT_DISPOSABLE_DOMAINS,
  addDomainBlock,
  findWaitlistDomainBlock,
  listDomainBlocks,
  resetWaitlistDomainBlocklistForTests,
} from "../src/lib/waitlist-domain-blocklist";

/**
 * Slice 13.31 — waitlist disposable-domain blocklist, operator editable.
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 13.31: waitlist domain blocklist", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    resetWaitlistStoreForTests();
    resetWaitlistDomainBlocklistForTests();
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
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("built-in disposables block joinWaitlist; company mail may join", async () => {
    expect(DEFAULT_DISPOSABLE_DOMAINS).toContain("mailinator.com");
    const blocked = await joinWaitlist("agent@mailinator.com");
    expect(blocked).toEqual({
      ok: false,
      error: PUBLIC_COPY.waitlist.domainBlocked,
      code: "blocked",
    });
    expect(await findWaitlistDomainBlock("agent@mailinator.com")).not.toBeNull();

    const ok = await joinWaitlist("bidder-wl1331@example.com");
    expect(ok).toEqual({ ok: true, status: "created" });
  });

  test("operator can add a domain and waitlist rejects it", async () => {
    const added = await addDomainBlock({
      domain: "temp-block-1331.test",
      note: "slice 13.31",
    });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const rules = await listDomainBlocks();
    expect(rules.some((rule) => rule.domain === "temp-block-1331.test")).toBe(
      true,
    );

    const rejected = await joinWaitlist("x@temp-block-1331.test");
    expect(rejected).toEqual({
      ok: false,
      error: PUBLIC_COPY.waitlist.domainBlocked,
      code: "blocked",
    });
  });

  test("POST /api/waitlist returns 400 for disposable domain", async ({
    request,
  }) => {
    const res = await request.post("/api/waitlist", {
      data: { email: "throwaway@yopmail.com" },
    });
    expect(res.status()).toBe(400);
    const body = (await res.json()) as {
      ok: boolean;
      code?: string;
      error?: string;
    };
    expect(body.ok).toBe(false);
    expect(body.code).toBe("blocked");
    expect(body.error).toBe(PUBLIC_COPY.waitlist.domainBlocked);

    const good = await request.post("/api/waitlist", {
      data: { email: "ok-wl1331@example.com" },
    });
    expect(good.status()).toBe(201);
  });

  test("operator waitlist-domains page lists defaults and accepts add", async ({
    page,
  }) => {
    await signIn(page, "operator@example.com");
    await page.goto("/operator/waitlist-domains");
    await expect(page.getByTestId("operator-waitlist-domains")).toBeVisible();
    await expect(
      page.getByTestId("operator-waitlist-domains-form"),
    ).toBeVisible();
    await expect(
      page.getByTestId("operator-waitlist-domains-rows"),
    ).toBeVisible();
    await expect(page.getByText("mailinator.com")).toBeVisible();

    await page.getByTestId("waitlist-domain-input").fill("custom-block-1331.dev");
    await page.getByTestId("waitlist-domain-note").fill("operator add");
    await page.getByTestId("waitlist-domain-submit").click();
    await expect(page.getByTestId("waitlist-domain-success")).toBeVisible();
    await expect(
      page
        .getByTestId("operator-waitlist-domains-rows")
        .getByTestId("operator-waitlist-domain")
        .filter({ hasText: "custom-block-1331.dev" }),
    ).toBeVisible();

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });

  test("operator approvals nav links to waitlist domains", async ({ page }) => {
    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(
      page.getByTestId("operator-waitlist-domains-link"),
    ).toHaveAttribute("href", "/operator/waitlist-domains");
  });
});
