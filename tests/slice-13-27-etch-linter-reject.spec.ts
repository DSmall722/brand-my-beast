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
  ETCH_ART_LINTER_REJECT_ERROR,
  assertEtchArtPassesLinter,
  lintEtchArtNotes,
} from "../src/lib/etch-linter";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

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
 * Slice 13.27 — etch art rejected if linter fails; wrap art may still list.
 */
test.describe("slice 13.27: etch linter reject; wrap still lists", () => {
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

  test("assertEtchArtPassesLinter rejects etch fail; wrap always ok", () => {
    const bad = "full color gradient photo mark";
    expect(lintEtchArtNotes(bad).severity).toBe("fail");

    const etchFail = assertEtchArtPassesLinter({
      finish: "etch",
      artNotes: bad,
    });
    expect(etchFail.ok).toBe(false);
    if (!etchFail.ok) {
      expect(etchFail.error).toMatch(/wrap art may still list/i);
    }

    expect(
      assertEtchArtPassesLinter({ finish: "wrap", artNotes: bad }).ok,
    ).toBe(true);
    expect(
      assertEtchArtPassesLinter({
        finish: "etch",
        artNotes: "bold single-line sans",
      }).ok,
    ).toBe(true);
    expect(ETCH_ART_LINTER_REJECT_ERROR).toMatch(/wrap art may still list/i);
  });

  test("wrap intent still lists when etch-forbidden notes would fail", async () => {
    const placed = await placeIntentBid({
      panelId: "hood",
      userId: "user_1327_wrap",
      brandLabel: "Gradient Photo Wrap Co",
      tradeLabel: "full color vinyl",
      standingUsd: 2500,
      artworkUrl: "https://cdn.example.com/wrap-ok.svg",
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;
    expect(placed.bid.status).toBe("listed");

    // Same forbidden brief blocks etch finish, not wrap listing.
    expect(
      assertEtchArtPassesLinter({
        finish: "etch",
        artNotes: "gradient photo wrap",
      }).ok,
    ).toBe(false);
    expect(
      assertEtchArtPassesLinter({
        finish: "wrap",
        artNotes: "gradient photo wrap",
      }).ok,
    ).toBe(true);
  });

  test("panel etch linter shows reject copy; wrap intent still lists", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("etch-constraint-linter")).toBeVisible();
    await expect(page.getByTestId("etch-lint-idle")).toContainText(
      /wrap art may still list/i,
    );

    await page
      .getByTestId("etch-art-notes")
      .fill("full color gradient photo mark");
    await expect(page.getByTestId("etch-lint-issues")).toBeVisible();
    await expect(page.getByTestId("etch-lint-etch-forbidden-art")).toBeVisible();

    await signIn(page, "bidder-a@example.com");
    await page.goto("/panels/hood");
    await page.getByTestId("intent-brand").fill("LintWrapCo");
    await page.getByTestId("intent-trade").fill("lint wrap vinyl");
    await page.getByTestId("intent-standing").fill("2500");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toBeVisible({
      timeout: 15_000,
    });

    await signIn(page, "operator@example.com");
    await page.goto("/operator");
    await expect(page.getByTestId("approvals-list")).toContainText(
      "LintWrapCo",
    );
    // Under buyout etch is locked — wrap approve still available.
    await expect(
      page.locator('[data-testid^="approval-finish-"]').first(),
    ).toHaveAttribute("data-etch-unlocked", "false");
    await page.locator('[data-testid^="approve-"]').first().click();
    await expect(page.getByTestId("approvals-empty")).toBeVisible({
      timeout: 10_000,
    });
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
