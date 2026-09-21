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
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  OPERATOR_FILTERS,
  parseOperatorFilter,
} from "../src/lib/operator-filters";

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

async function resetServerIntents(request: APIRequestContext) {
  const res = await request.post("/api/test/reset-intents");
  expect(res.ok()).toBeTruthy();
}

/**
 * Slice 8.3 — operator filters: pending / approved / rejected / outbid.
 */
test.describe("slice 8.3: operator status filters", () => {
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

  test("parseOperatorFilter defaults to pending", () => {
    expect(parseOperatorFilter(undefined)).toBe("pending");
    expect(parseOperatorFilter("nope")).toBe("pending");
    expect(OPERATOR_FILTERS).toEqual([
      "pending",
      "approved",
      "rejected",
      "outbid",
    ]);
  });

  test("listBidsWithStatus splits pending / approved / rejected / outbid", async () => {
    await resetIntentStoreForTests();
    const pending = await placeIntentBid({
      panelId: "hood",
      userId: "test:pending83@example.com",
      brandLabel: "Pending83",
      tradeLabel: "pendants",
      standingUsd: 2_500,
    });
    expect(pending.ok).toBe(true);

    const approve = await placeIntentBid({
      panelId: "tailgate",
      userId: "test:approve83@example.com",
      brandLabel: "Approve83",
      tradeLabel: "aprons",
      standingUsd: 2_500,
    });
    expect(approve.ok).toBe(true);
    if (!approve.ok) return;
    await setIntentStatus(approve.bid.id, "approved");

    const reject = await placeIntentBid({
      panelId: "rear-bumper",
      userId: "test:reject83@example.com",
      brandLabel: "Reject83",
      tradeLabel: "rugs",
      standingUsd: 2_500,
    });
    expect(reject.ok).toBe(true);
    if (!reject.ok) return;
    await setIntentStatus(reject.bid.id, "rejected", {
      note: "Needs thicker strokes.",
    });

    const first = await placeIntentBid({
      panelId: "front-bumper",
      userId: "test:outbid-a83@example.com",
      brandLabel: "OutbidA83",
      tradeLabel: "oils",
      standingUsd: 2_500,
    });
    expect(first.ok).toBe(true);
    const second = await placeIntentBid({
      panelId: "front-bumper",
      userId: "test:outbid-b83@example.com",
      brandLabel: "OutbidB83",
      tradeLabel: "waxes",
      standingUsd: 3_000,
    });
    expect(second.ok).toBe(true);

    const listed = await listBidsWithStatus("listed");
    const approved = await listBidsWithStatus("approved");
    const rejected = await listBidsWithStatus("rejected");
    const outbid = await listBidsWithStatus("outbid");

    expect(listed.some((bid) => bid.brandLabel === "Pending83")).toBe(true);
    expect(approved.some((bid) => bid.brandLabel === "Approve83")).toBe(true);
    expect(rejected.some((bid) => bid.brandLabel === "Reject83")).toBe(true);
    expect(outbid.some((bid) => bid.brandLabel === "OutbidA83")).toBe(true);
  });

  test("operator UI filter links switch lists", async ({ page, request }) => {
    await resetServerIntents(request);

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("FilterPendingCo");
    await page.getByTestId("intent-trade").fill("filters");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-filters")).toBeVisible();
    await expect(page.getByTestId("operator-filter-pending")).toHaveAttribute(
      "data-active",
      "true",
    );
    await expect(page.getByTestId("approvals-list")).toContainText(
      "FilterPendingCo",
    );

    await page.getByTestId("operator-filter-approved").click();
    await expect(page).toHaveURL(/status=approved/);
    await expect(page.getByTestId("operator-approvals")).toHaveAttribute(
      "data-operator-filter",
      "approved",
    );

    await page.getByTestId("operator-filter-rejected").click();
    await expect(page).toHaveURL(/status=rejected/);
    await expect(page.getByTestId("operator-filter-rejected")).toHaveAttribute(
      "data-active",
      "true",
    );

    await page.getByTestId("operator-filter-outbid").click();
    await expect(page).toHaveURL(/status=outbid/);
    await expect(page.getByTestId("operator-filter-outbid")).toHaveAttribute(
      "data-active",
      "true",
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });
});
