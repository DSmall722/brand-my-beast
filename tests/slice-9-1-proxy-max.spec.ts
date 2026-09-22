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
import {
  assertIntentOnly,
  nextStandingUsd,
  parseProxyMaxUsd,
} from "../src/lib/intent";
import {
  listBidsForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

/**
 * Slice 9.1 — proxy max on an intent. Agent steps max($250, 10%). Still no card.
 */
test.describe("slice 9.1: proxy max agent", () => {
  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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

  test("migration adds proxy_max_usd without capture columns", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0009_proxy_max_usd.sql"),
      "utf8",
    );
    expect(sql).toMatch(/proxy_max_usd/);
    expect(sql.toLowerCase()).not.toMatch(/stripe/);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql.toLowerCase()).not.toMatch(/setup_intent/);
  });

  test("parseProxyMaxUsd requires ceiling at or above the mark", () => {
    expect(parseProxyMaxUsd("", 2500)).toEqual({
      ok: true,
      proxyMaxUsd: null,
    });
    expect(parseProxyMaxUsd(3000, 2500)).toEqual({
      ok: true,
      proxyMaxUsd: 3000,
    });
    expect(parseProxyMaxUsd(2499, 2500).ok).toBe(false);
    expect(parseProxyMaxUsd(12.5, 2500).ok).toBe(false);
  });

  test("proxy agent steps holder past a challenger within ceiling", async () => {
    const holder = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_holder",
      brandLabel: "Proxy Hold",
      tradeLabel: "proxy snacks",
      standingUsd: 2500,
      proxyMaxUsd: 4000,
    });
    expect(holder.ok).toBeTruthy();
    if (!holder.ok) return;
    expect(holder.bid.proxyMaxUsd).toBe(4000);
    assertIntentOnly(holder.bid);

    const challengeStanding = nextStandingUsd(holder.bid.standingUsd);
    const challenger = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_challenger",
      brandLabel: "Proxy Fight",
      tradeLabel: "proxy tools",
      standingUsd: challengeStanding,
    });
    expect(challenger.ok).toBeTruthy();
    if (!challenger.ok) return;

    const expectedAgentStanding = nextStandingUsd(challengeStanding);
    expect(expectedAgentStanding).toBeLessThanOrEqual(4000);

    const listed = await listBidsForPanel("hood");
    const standingListed = listed.filter((row) => row.status === "listed");
    expect(standingListed).toHaveLength(1);
    expect(standingListed[0]?.userId).toBe("proxy_holder");
    expect(standingListed[0]?.standingUsd).toBe(expectedAgentStanding);
    expect(standingListed[0]?.proxyMaxUsd).toBe(4000);

    expect(listed.find((row) => row.id === challenger.bid.id)?.status).toBe(
      "outbid",
    );
    expect(challenger.bid.status).toBe("outbid");
    assertIntentOnly(standingListed[0]!);
  });

  test("proxy below next step leaves holder outbid", async () => {
    const holder = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_low",
      brandLabel: "Low Proxy",
      tradeLabel: "low snacks",
      standingUsd: 2500,
      // Challenge at 2750 → agent would need 3000; ceiling too low.
      proxyMaxUsd: 2800,
    });
    expect(holder.ok).toBeTruthy();
    if (!holder.ok) return;

    const challenger = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_beats_low",
      brandLabel: "Beats Low",
      tradeLabel: "low tools",
      standingUsd: nextStandingUsd(holder.bid.standingUsd),
    });
    expect(challenger.ok).toBeTruthy();
    if (!challenger.ok) return;
    expect(challenger.bid.status).toBe("listed");

    const listed = await listBidsForPanel("hood");
    expect(listed.find((row) => row.id === holder.bid.id)?.status).toBe(
      "outbid",
    );
    expect(listed.find((row) => row.id === challenger.bid.id)?.status).toBe(
      "listed",
    );
  });

  test("mutual proxy ceilings step until one wins — still no card", async () => {
    const a = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_a",
      brandLabel: "Proxy A",
      tradeLabel: "war snacks",
      standingUsd: 2500,
      proxyMaxUsd: 3500,
    });
    expect(a.ok).toBeTruthy();
    if (!a.ok) return;

    const b = await placeIntentBid({
      panelId: "hood",
      userId: "proxy_b",
      brandLabel: "Proxy B",
      tradeLabel: "war tools",
      standingUsd: nextStandingUsd(a.bid.standingUsd),
      proxyMaxUsd: 3200,
    });
    expect(b.ok).toBeTruthy();
    if (!b.ok) return;

    const listed = await listBidsForPanel("hood");
    const standingListed = listed.filter((row) => row.status === "listed");
    expect(standingListed).toHaveLength(1);
    // A ceiling 3500 beats B ceiling 3200 after agent steps (3025).
    expect(standingListed[0]?.userId).toBe("proxy_a");
    expect(standingListed[0]?.standingUsd).toBe(3025);
    expect(standingListed[0]?.standingUsd).toBeLessThanOrEqual(3500);
    assertIntentOnly(standingListed[0]!);

    for (const row of listed) {
      expect(JSON.stringify(row).toLowerCase()).not.toMatch(/stripe/);
      expect(JSON.stringify(row)).not.toMatch(/PaymentMethod/);
    }
  });

  test("seat form exposes optional proxy max without card copy", async ({
    page,
  }) => {
    await signIn(page, "proxy91@example.com");
    await page.goto("/panels/hood");
    await expect(page.getByTestId("intent-bid-form")).toBeVisible();
    await expect(page.getByTestId("intent-proxy-max")).toBeVisible();
    await expect(page.getByTestId("intent-proxy-note")).toContainText(
      "no card",
    );
    await expect(page.getByTestId("intent-proxy-note")).toContainText(
      "max($250, 10%)",
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    await expect(page.getByTestId("intent-only-banner")).toHaveCount(0);
  });
});
