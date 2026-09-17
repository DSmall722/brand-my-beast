import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  countApprovedStandingForPanel,
  listBidsForPanel,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 13.19 — operator cannot approve two brands on one panel even if they race.
 * Memory path serializes per-panel approves; Postgres unique index + demote batch.
 */
test.describe("slice 13.19: concurrent brand approve race", () => {
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

  test("intent-store serializes memory approves per panel", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/intent-store.ts"),
      "utf8",
    );
    expect(src).toMatch(/withPanelApproveLock/);
    expect(src).toMatch(/Slice 13\.19/);
    expect(src).toMatch(/intent_bids_one_approved_per_panel|12\.1/);
    expect(src).not.toMatch(/from ["']stripe["']/);
  });

  test("schema unique partial index still guards approved standing", () => {
    const src = readFileSync(
      join(process.cwd(), "src/lib/db/schema.ts"),
      "utf8",
    );
    expect(src).toMatch(/intent_bids_one_approved_per_panel_idx/);
    expect(src).toMatch(/uniqueIndex/);
    expect(src).toMatch(/status.*=.*'approved'/);
  });

  test("racing approve of two brands leaves exactly one approved", async () => {
    const alpha = await placeIntentBid({
      panelId: "hood",
      userId: "user_1319_alpha",
      brandLabel: "Race Alpha",
      tradeLabel: "alpha tools",
      standingUsd: 2500,
    });
    expect(alpha.ok).toBe(true);
    if (!alpha.ok) return;

    const beta = await placeIntentBid({
      panelId: "hood",
      userId: "user_1319_beta",
      brandLabel: "Race Beta",
      tradeLabel: "beta snacks",
      standingUsd: 3500,
    });
    expect(beta.ok).toBe(true);
    if (!beta.ok) return;

    expect(alpha.bid.brandLabel).not.toBe(beta.bid.brandLabel);

    const results = await Promise.all([
      setIntentStatus(alpha.bid.id, "approved", { note: "op A" }),
      setIntentStatus(beta.bid.id, "approved", { note: "op B" }),
    ]);
    expect(results.some((row) => row.ok)).toBe(true);

    expect(await countApprovedStandingForPanel("hood")).toBe(1);
    const hood = await listBidsForPanel("hood");
    const approved = hood.filter((bid) => bid.status === "approved");
    expect(approved).toHaveLength(1);
    expect(["Race Alpha", "Race Beta"]).toContain(approved[0]!.brandLabel);

    const brands = new Set(
      hood
        .filter((bid) => bid.status === "approved")
        .map((bid) => bid.brandLabel),
    );
    expect(brands.size).toBe(1);
  });

  test("many concurrent brand approves still collapse to one standing", async () => {
    const brands = [
      ["A", "Brand A1319", "trade a1319"],
      ["B", "Brand B1319", "trade b1319"],
      ["C", "Brand C1319", "trade c1319"],
      ["D", "Brand D1319", "trade d1319"],
    ] as const;
    const placed = [];
    let standing = 2500;
    for (const [i, brand, trade] of brands) {
      const row = await placeIntentBid({
        panelId: "tailgate",
        userId: `user_1319_${i}`,
        brandLabel: brand,
        tradeLabel: trade,
        standingUsd: standing,
      });
      expect(row.ok).toBe(true);
      if (!row.ok) return;
      placed.push(row.bid);
      standing = Math.max(standing + 1000, row.bid.standingUsd + 1000);
    }
    expect(placed).toHaveLength(4);

    await Promise.all(
      placed.map((bid) => setIntentStatus(bid.id, "approved", { note: "race" })),
    );

    expect(await countApprovedStandingForPanel("tailgate")).toBe(1);
    const approved = (await listBidsForPanel("tailgate")).filter(
      (bid) => bid.status === "approved",
    );
    expect(approved).toHaveLength(1);
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
