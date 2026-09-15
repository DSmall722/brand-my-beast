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
import {
  listBidsWithStatus,
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import {
  addBanRule,
  assertOperatorBanAllowed,
  operatorBanListUsesMemory,
  resetOperatorBanListForTests,
} from "../src/lib/operator-ban-list";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServer(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 8.8 — operator ban-list table + hard-reject matching intents.
 */
test.describe("slice 8.8: operator ban-list", () => {
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

  test("Production never uses ban-list memory", () => {
    expect(operatorBanListUsesMemory({ VERCEL_ENV: "production" })).toBe(false);
    expect(
      operatorBanListUsesMemory({
        VERCEL_ENV: "production",
        INTENT_MODE: "memory",
      }),
    ).toBe(false);
    expect(operatorBanListUsesMemory({ INTENT_MODE: "memory" })).toBe(true);
  });

  test("ban rule hard-rejects place and matching listed intents", async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    resetOperatorBanListForTests();

    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "test:ban88-listed@example.com",
      brandLabel: "Glow Vape Co",
      tradeLabel: "vape kits",
      standingUsd: 2_500,
    });
    expect(placed.ok).toBe(true);

    const added = await addBanRule({ pattern: "vape", note: "nicotine" });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const blocked = assertOperatorBanAllowed({
      brandLabel: "New Vape",
      tradeLabel: "mods",
      rules: [added.rule],
    });
    expect(blocked.ok).toBe(false);

    const denied = await placeIntentBid({
      panelId: "tailgate",
      userId: "test:ban88-new@example.com",
      brandLabel: "Cloud Vape",
      tradeLabel: "juice",
      standingUsd: 2_500,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.error).toMatch(/Hard-reject/i);
    expect(denied.error).toMatch(/vape/i);

    const migration = readFileSync(
      join(process.cwd(), "drizzle/0007_operator_ban_list.sql"),
      "utf8",
    );
    expect(migration).toContain("operator_ban_list");
    expect(migration.toLowerCase()).not.toContain("stripe");
  });

  test("operator UI adds ban and hard-rejects matching listed seat", async ({
    page,
    request,
  }) => {
    await resetServer(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("Neon Vape");
    await page.getByTestId("intent-trade").fill("disposable vapes");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-ban-list-link")).toBeVisible();
    await page.getByTestId("operator-ban-list-link").click();
    await expect(page.getByTestId("operator-ban-list")).toBeVisible();

    await page.getByTestId("ban-pattern").fill("vape");
    await page.getByTestId("ban-note").fill("nicotine ban");
    await page.getByTestId("ban-submit").click();
    await expect(page.getByTestId("ban-success")).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByTestId("ban-success")).toContainText("Hard-rejected");
    await expect(page.getByTestId("operator-ban-list-rows")).toContainText(
      "vape",
    );

    await page.goto("/operator?status=rejected");
    await expect(page.getByTestId("operator-approvals")).toHaveAttribute(
      "data-operator-filter",
      "rejected",
    );
    await expect(page.getByTestId("operator-approvals")).toContainText(
      "Neon Vape",
    );

    await signIn(page, "bidder-b@example.com");
    await page.goto("/panels/tailgate");
    await page.getByTestId("intent-brand").fill("Vape Again");
    await page.getByTestId("intent-trade").fill("vape pens");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-error")).toContainText("Hard-reject");
    await expect(page.getByTestId("intent-success")).toHaveCount(0);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");

    // Unit-side: listed queue empty of the rejected brand after hard-reject.
    await resetIntentStoreForTests();
    resetOperatorBanListForTests();
    expect((await listBidsWithStatus("listed")).length).toBe(0);
  });
});
