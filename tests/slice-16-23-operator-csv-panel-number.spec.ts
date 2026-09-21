import { expect, test, type Page } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import {
  OPERATOR_CSV_HEADERS,
  OPERATOR_CSV_PATH,
  buildOperatorCsv,
} from "../src/lib/operator-csv";
import { panelBoardMarkFor } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.23 — operator CSV includes the board panel number beside panel_id.
 * Waitlist rows leave the number blank. FEATURES.md stays off /.
 */

const PANEL_ID = "driver-door" as const;

function columnValue(csv: string, lineIncludes: string, header: string): string {
  const [head, ...lines] = csv.trim().split("\n");
  const headers = head?.split(",") ?? [];
  const index = headers.indexOf(header);
  expect(index, header).toBeGreaterThanOrEqual(0);
  const line = lines.find((row) => row.includes(lineIncludes));
  expect(line, lineIncludes).toBeTruthy();
  return line?.split(",")[index] ?? "";
}

async function signIn(page: Page, email: string) {
  await page.context().clearCookies();
  await page.goto("/signin");
  await page.getByTestId("signin-email").fill(email);
  await page.getByTestId("signin-password").fill("test");
  await page.getByTestId("signin-submit").click();
  await expect(page.getByTestId("account-page")).toBeVisible();
}

test.describe("slice 16.23: CSV export includes panel number", () => {
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
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("standing intent row carries the board number; waitlist does not", async () => {
    const mark = panelBoardMarkFor(PANEL_ID);
    expect(mark.n).toBe(3);

    const listed = await placeIntentBid({
      panelId: PANEL_ID,
      userId: "ops1623-secret-user",
      brandLabel: "Csv Number Brand",
      tradeLabel: "csv number trade",
      standingUsd: 2500,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const rejected = await placeIntentBid({
      panelId: "rear-bumper",
      userId: "test:csv1623-rejected@example.com",
      brandLabel: "Csv Number Rejected",
      tradeLabel: "csv rejected trade",
      standingUsd: 900,
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    await setIntentStatus(rejected.bid.id, "rejected");

    const csv = buildOperatorCsv({
      waitlist: [
        {
          email: "wait1623@example.com",
          createdAt: "2026-01-01T00:00:00.000Z",
          userId: null,
          source: "homepage",
          confirmToken: null,
          confirmedAt: "2026-01-01T00:05:00.000Z",
          wantWholeTruck: false,
        },
      ],
      intents: [listed.bid, { ...rejected.bid, status: "rejected" }],
    });

    expect(OPERATOR_CSV_HEADERS.indexOf("panel_number")).toBe(
      OPERATOR_CSV_HEADERS.indexOf("panel_id") + 1,
    );
    expect(csv.split("\n")[0]).toBe(OPERATOR_CSV_HEADERS.join(","));
    expect(columnValue(csv, "wait1623@example.com", "panel_number")).toBe("");
    expect(columnValue(csv, "driver-door", "panel_number")).toBe(String(mark.n));
    expect(columnValue(csv, "driver-door", "panel_id")).toBe(PANEL_ID);
    expect(csv).not.toContain("Csv Number Rejected");
    expect(csv).toContain("ops1623-secret-user");
    expect(csv.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("operator download includes the panel number", async ({ page }) => {
    const mark = panelBoardMarkFor(PANEL_ID);
    await signIn(page, "bidder1623@example.com");
    await page.goto(`/panels/${PANEL_ID}`);
    await page.getByTestId("intent-brand").fill("Csv Number UI");
    await page.getByTestId("intent-trade").fill("csv number ui");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-csv-download")).toHaveAttribute(
      "href",
      OPERATOR_CSV_PATH,
    );

    const res = await page.request.get(OPERATOR_CSV_PATH);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/text\/csv/);
    const body = await res.text();
    expect(body.split("\n")[0]).toContain("panel_number");
    expect(columnValue(body, "Csv Number UI", "panel_number")).toBe(
      String(mark.n),
    );
    expect(body).toContain(`intent,,,${PANEL_ID},${mark.n},Csv Number UI`);
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
