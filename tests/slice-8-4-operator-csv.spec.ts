import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { isOperatorEmail } from "../src/lib/auth/operator";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  listStandingIntents,
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  buildOperatorCsv,
  escapeCsvField,
  OPERATOR_CSV_HEADERS,
  OPERATOR_CSV_PATH,
} from "../src/lib/operator-csv";

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
 * Slice 8.4 — operator CSV of waitlist + standing intents. Auth-gated.
 */
test.describe("slice 8.4: operator CSV export", () => {
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

  test("escapeCsvField quotes commas and quotes", () => {
    expect(escapeCsvField("plain")).toBe("plain");
    expect(escapeCsvField("a,b")).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });

  test("buildOperatorCsv includes waitlist + standing only", async () => {
    await resetIntentStoreForTests();
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "test:csv-listed@example.com",
      brandLabel: "CsvListed",
      tradeLabel: "csv listed trade",
      standingUsd: 2_500,
    });
    expect(listed.ok).toBe(true);

    const approved = await placeIntentBid({
      panelId: "tailgate",
      userId: "test:csv-approved@example.com",
      brandLabel: "CsvApproved",
      tradeLabel: "csv approved trade",
      standingUsd: 2_500,
    });
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;
    await setIntentStatus(approved.bid.id, "approved");

    const rejected = await placeIntentBid({
      panelId: "tonneau",
      userId: "test:csv-rejected@example.com",
      brandLabel: "CsvRejected",
      tradeLabel: "csv rejected trade",
      standingUsd: 2_500,
    });
    expect(rejected.ok).toBe(true);
    if (!rejected.ok) return;
    await setIntentStatus(rejected.bid.id, "rejected");

    const standing = await listStandingIntents();
    expect(standing.map((b) => b.status).sort()).toEqual([
      "approved",
      "listed",
    ]);

    const csv = buildOperatorCsv({
      waitlist: [
        {
          email: "wait@example.com",
          createdAt: "2026-01-01T00:00:00.000Z",
          userId: null,
          source: "homepage",
          confirmToken: null,
          confirmedAt: "2026-01-01T00:05:00.000Z",
          wantWholeTruck: false,
        },
      ],
      intents: [
        ...standing,
        ...(rejected.ok ? [{ ...rejected.bid, status: "rejected" as const }] : []),
      ],
    });

    expect(csv.split("\n")[0]).toBe(OPERATOR_CSV_HEADERS.join(","));
    expect(csv).toContain("waitlist,wait@example.com,homepage");
    expect(csv).toContain("intent,,,hood,1,CsvListed");
    expect(csv).toContain("intent,,,tailgate,9,CsvApproved");
    expect(csv).not.toContain("CsvRejected");
    expect(csv.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("unsigned CSV request is 401; live stranger denied", async ({
    request,
  }) => {
    const anon = await request.get(OPERATOR_CSV_PATH);
    expect(anon.status()).toBe(401);
    expect(
      isOperatorEmail("stranger@not-on-list.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "ops@brandmybeast.com",
      }),
    ).toBe(false);
  });

  test("operator download returns CSV with waitlist + standing", async ({
    page,
    request,
  }) => {
    await resetServerIntents(request);

    const waitEmail = `slice84-wait-${Date.now()}@example.com`;
    const join = await request.post("/api/waitlist", {
      data: { email: waitEmail },
    });
    expect([200, 201]).toContain(join.status());

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("CsvStandingCo");
    await page.getByTestId("intent-trade").fill("csv standing");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 10_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("operator-csv-download")).toBeVisible();
    await expect(page.getByTestId("operator-csv-download")).toHaveAttribute(
      "href",
      OPERATOR_CSV_PATH,
    );

    const res = await page.request.get(OPERATOR_CSV_PATH);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-type"]).toMatch(/text\/csv/);
    const body = await res.text();
    expect(body.split("\n")[0]).toBe(OPERATOR_CSV_HEADERS.join(","));
    expect(body).toContain(waitEmail);
    expect(body).toContain("waitlist");
    expect(body).toContain("CsvStandingCo");
    expect(body).toContain("intent,,,hood,1,CsvStandingCo");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
    expect(body).not.toContain("close_at");

    await page.goto("/operator/waitlist");
    await expect(page.getByTestId("operator-csv-download")).toBeVisible();
    await expect(
      page.getByRole("button", { name: /tweet|share|blast/i }),
    ).toHaveCount(0);
    await expect(page.getByTestId("operator-waitlist-export")).toHaveCount(0);
  });
});
