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
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import {
  addBanRule,
  listBanListMatchLogsForTests,
  resetOperatorBanListForTests,
} from "../src/lib/operator-ban-list";

/**
 * Slice 12.30 — ban-list match is logged with the rule id (ties to 8.8).
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.30: ban-list match logged with rule id", () => {
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

  test("place deny logs ban-list match with rule id", async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    resetOperatorBanListForTests();

    const added = await addBanRule({ pattern: "vape", note: "nicotine" });
    expect(added.ok).toBe(true);
    if (!added.ok) return;

    const denied = await placeIntentBid({
      panelId: "hood",
      userId: "test:ban1230@example.com",
      brandLabel: "Cloud Vape",
      tradeLabel: "juice",
      standingUsd: 2_500,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) return;
    expect(denied.error).toContain(added.rule.id);
    expect(denied.error).toMatch(/Hard-reject/i);

    const logs = listBanListMatchLogsForTests();
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const last = logs.at(-1)!;
    expect(last.ruleId).toBe(added.rule.id);
    expect(last.pattern).toBe("vape");
    expect(last.context).toBe("place");
    expect(last.brandLabel.toLowerCase()).toContain("vape");
  });
});
