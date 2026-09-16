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
import { assertIntentOnly, parseIdempotencyKey } from "../src/lib/intent";
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
 * Slice 12.4 — idempotency key on intent POST. Replay does not double-list.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.4: intent idempotency key", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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

  test("migration adds idempotency_key without capture columns", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0014_intent_idempotency_key.sql"),
      "utf8",
    );
    expect(sql).toMatch(/idempotency_key/);
    expect(sql).toMatch(/UNIQUE INDEX/i);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql.toLowerCase()).not.toMatch(/setup_intent/);
    expect(sql).not.toMatch(/\bCLOSE_AT\b/);
  });

  test("parseIdempotencyKey accepts UUID-shaped tokens", () => {
    expect(parseIdempotencyKey("")).toEqual({
      ok: true,
      idempotencyKey: null,
    });
    expect(parseIdempotencyKey("abcd1234-key")).toEqual({
      ok: true,
      idempotencyKey: "abcd1234-key",
    });
    expect(parseIdempotencyKey("short").ok).toBe(false);
    expect(parseIdempotencyKey("has spacexx").ok).toBe(false);
  });

  test("replay with the same key returns the same bid — no double list", async () => {
    const key = "idem-12-4-replay-aaaaaaaa";
    const first = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_4_a",
      brandLabel: "Idem Co",
      tradeLabel: "idem trade",
      standingUsd: 2500,
      idempotencyKey: key,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    assertIntentOnly(first.bid);
    expect(first.bid.idempotencyKey).toBe(key);

    const replay = await placeIntentBid({
      panelId: "hood",
      userId: "user_12_4_a",
      brandLabel: "Idem Co Changed",
      tradeLabel: "idem trade changed",
      standingUsd: 4000,
      idempotencyKey: key,
    });
    expect(replay.ok).toBe(true);
    if (!replay.ok) return;
    expect(replay.bid.id).toBe(first.bid.id);
    expect(replay.bid.standingUsd).toBe(2500);
    expect(replay.bid.brandLabel).toBe("Idem Co");

    const panel = await listBidsForPanel("hood");
    const listed = panel.filter(
      (b) => b.userId === "user_12_4_a" && b.status === "listed",
    );
    expect(listed).toHaveLength(1);
  });

  test("intent form posts a stable idempotency key field", async ({
    browser,
  }) => {
    const page = await browser.newPage();
    await signIn(page, "idem124@example.com");
    await page.goto("/panels/hood");
    const keyInput = page.getByTestId("intent-idempotency-key");
    await expect(keyInput).toHaveAttribute("type", "hidden");
    const key = await keyInput.inputValue();
    expect(key.length).toBeGreaterThanOrEqual(8);

    await page.getByTestId("intent-brand").fill("Idem UI Co");
    await page.getByTestId("intent-trade").fill("idem ui trade");
    await page.getByTestId("intent-standing").fill("3000");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await page.close();
  });
});
