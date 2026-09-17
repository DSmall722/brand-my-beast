import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { isOperatorEmail } from "../src/lib/auth/operator";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
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
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  OPERATOR_PRINT_PATH_PREFIX,
  operatorPrintFacts,
  operatorPrintPath,
  operatorPrintSeatFromApproved,
} from "../src/lib/operator-print-seat";
import {
  WINNER_PACKET_WRAP_TERM,
  WINNER_PACKET_WRAP_TERM_START,
} from "../src/lib/winner-packet";

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
 * Slice 13.25 — operator print view for one seat (13.23 + 8.6).
 */
test.describe("slice 13.25: operator print seat view", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    await resetServerIntents(request);
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

  test("board.css ships operator print rules", () => {
    const board = readFileSync(
      join(process.cwd(), "src/app/styles/board.css"),
      "utf8",
    );
    expect(board).toContain("Slice 13.25");
    expect(board).toContain(".operator-print-page");
    expect(board).toMatch(/@media\s+print/);
    expect(board.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("builder embeds shop finish + wrap term start install day", async () => {
    expect(
      isOperatorEmail("bidder-a@example.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "operator@example.com",
      }),
    ).toBe(false);
    expect(
      isOperatorEmail("operator@example.com", {
        AUTH_MODE: "live",
        OPERATOR_EMAILS: "operator@example.com",
      }),
    ).toBe(true);

    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_1325_print",
      brandLabel: "PrintSeat Co",
      tradeLabel: "print seat vinyl",
      standingUsd: 2500,
      artworkUrl: "https://cdn.example.com/print-seat.svg",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const listedOnly = operatorPrintSeatFromApproved({
      bid: placed.bid,
      pledgedUsd: 0,
    });
    expect(listedOnly.ok).toBe(false);

    await setIntentStatus(placed.bid.id, "approved");
    const seatResult = operatorPrintSeatFromApproved({
      bid: { ...placed.bid, status: "approved" },
      pledgedUsd: 2500,
    });
    expect(seatResult.ok).toBe(true);
    if (!seatResult.ok) return;

    expect(seatResult.seat.finish).toBe("wrap_etch_locked");
    expect(seatResult.seat.etchLock).toBe("locked");
    expect(seatResult.seat.wrapTermStart).toBe(WINNER_PACKET_WRAP_TERM_START);
    expect(seatResult.seat.wrapTerm).toBe(WINNER_PACKET_WRAP_TERM);
    expect(operatorPrintPath(placed.bid.id)).toBe(
      `${OPERATOR_PRINT_PATH_PREFIX}${placed.bid.id}`,
    );

    const facts = operatorPrintFacts(seatResult.seat);
    expect(facts.rows.some((r) => r.testId === "operator-print-finish")).toBe(
      true,
    );
    expect(
      facts.rows.find((r) => r.testId === "operator-print-wrap-term-start")
        ?.value,
    ).toContain("install day");
    expect(facts.fences).toContain("$58,000");
    expect(facts.fences).toContain("$120,000");
    expect(facts.fences.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("operator can open print view; anon is gated", async ({
    page,
    request,
  }) => {
    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("OpPrintCo");
    await page.getByTestId("intent-trade").fill("op print vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page
      .getByTestId("intent-artwork-url")
      .fill("https://cdn.example.com/op-print.svg");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 15_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText("OpPrintCo");
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });

    await expect(page.getByTestId(/^decided-print-link-/).first()).toBeVisible();
    await page.getByTestId(/^decided-print-link-/).first().click();
    await expect(page.getByTestId("operator-print")).toBeVisible();
    await expect(page.getByTestId("operator-print")).toHaveAttribute(
      "data-print-sheet",
      "operator-seat",
    );
    await expect(page.getByTestId("operator-print")).toHaveAttribute(
      "data-wrap-term-start",
      "install day",
    );
    await expect(page.getByTestId("operator-print-brand")).toHaveText(
      "OpPrintCo",
    );
    await expect(page.getByTestId("operator-print-trade")).toHaveText(
      "op print vinyl",
    );
    await expect(page.getByTestId("operator-print-finish")).toContainText(
      "wrap_etch_locked",
    );
    await expect(page.getByTestId("operator-print-etch-lock")).toContainText(
      "locked",
    );
    await expect(
      page.getByTestId("operator-print-wrap-term-start"),
    ).toContainText("install day");
    await expect(page.getByTestId("operator-print-wrap-term")).toContainText(
      "12 months from install day",
    );
    await expect(page.getByTestId("operator-print-fences")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("operator-print-fences")).toContainText(
      "$120,000",
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("CLOSE_AT unset");

    const printUrl = page.url();
    expect(printUrl).toContain("/operator/print/");

    // Test-mode Auth.js treats every @example.com as operator — so deny path
    // is proven with anon (no session) rather than a bidder session.
    await page.context().clearCookies();
    const anonNav = await page.goto(printUrl);
    expect(anonNav).toBeTruthy();
    // Unauthenticated users land on sign-in (or never see print facts).
    const anonHtml = await page.content();
    expect(anonHtml).not.toContain('data-testid="operator-print"');
    expect(anonHtml).not.toContain("OpPrintCo");

    const anon = await request.get(printUrl, { maxRedirects: 0 });
    expect([302, 307].includes(anon.status())).toBe(true);
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
