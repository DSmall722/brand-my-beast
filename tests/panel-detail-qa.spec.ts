import { expect, test } from "@playwright/test";
import { PANELS, currentBidUsd, formatUsd } from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

const ETCH_REQUIREMENTS =
  "Immortal Etch artwork must use bold, simple shapes that can be permanently etched into stainless steel. Gradients, fine details, and very small text cannot be etched reliably. Final artwork will be reviewed before approval.";

test.describe("panel-detail QA lean seats + etch FAQ", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("current bid is opening until a real bid exists", () => {
    expect(currentBidUsd(2500, null)).toBe(2500);
    expect(currentBidUsd(2500, 2750)).toBe(2750);
  });

  test("all eleven seat pages stay lean with a waitlist CTA", async ({
    page,
  }) => {
    expect(PANELS).toHaveLength(11);
    for (const panel of PANELS) {
      await page.goto(`/panels/${panel.id}`);
      await expect(page.getByTestId("panel-intent-page")).toBeVisible();
      await expect(page.getByTestId("public-seat-label")).toHaveCount(0);
      await expect(page.getByTestId("public-seat-status")).toHaveCount(0);
      await expect(page.getByTestId("seat-occupancy")).toHaveCount(0);
      await expect(page.getByText("Seat open", { exact: true })).toHaveCount(0);
      await expect(page.getByText("Public seat", { exact: true })).toHaveCount(
        0,
      );
      await expect(page.getByTestId("etch-constraints")).toHaveCount(0);
      await expect(page.getByTestId("etch-art-notes")).toHaveCount(0);
      await expect(page.getByTestId("seat-export-png")).toHaveCount(0);
      await expect(page.getByTestId("seat-export-png-signin")).toHaveCount(0);
      await expect(page.getByTestId("adjacent-neighbors")).toHaveCount(0);
      await expect(page.getByTestId("neighbor-combo")).toHaveCount(0);
      await expect(page.getByText("Adjacent seats")).toHaveCount(0);
      await expect(page.getByText("Neighboring seats")).toHaveCount(0);
      await expect(page.getByTestId("opening-bid-rationale")).toHaveCount(0);
      await expect(page.getByTestId("seat-next-minimum-rule")).toHaveCount(0);
      await expect(page.getByTestId("seat-exclusivity")).toHaveCount(0);
      await expect(page.getByText("One brand per trade")).toHaveCount(0);
      await expect(page.getByTestId("panel-extended-until")).toHaveCount(0);
      await expect(page.getByText("Soft-close extension")).toHaveCount(0);
      await expect(page.getByTestId("intent-only-banner")).toHaveCount(0);
      await expect(page.getByTestId("intent-signin-needed")).toHaveCount(0);
      await expect(page.getByText("Standing intents")).toHaveCount(0);
      await expect(page.getByTestId("intent-empty")).toHaveCount(0);
      await expect(page.getByTestId("public-seat-log")).toHaveCount(0);
      await expect(page.getByTestId("seat-lead")).toContainText(
        `Current Bid ${formatUsd(panel.openingUsd)}`,
      );
      await expect(
        page
          .getByTestId("public-seat-waitlist-cta")
          .locator(".obsidian-arrow-fill-btn__text"),
      ).toHaveText(PUBLIC_COPY.hero.primaryCta);
      await expect(page.getByTestId("public-seat-waitlist-cta")).toHaveAttribute(
        "href",
        "/#waitlist",
      );
      await expect(
        page.getByText("Opening marks start the seat"),
      ).toHaveCount(0);
      const html = await page.content();
      expect(html).not.toContain("FEATURES.md");
      expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    }
  });

  test("homepage etch requirements and last-second FAQ land", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("etch-requirements")).toContainText(
      ETCH_REQUIREMENTS,
    );
    await expect(page.getByTestId("etch-section")).not.toContainText(
      "Wrap is a year of film",
    );
    await expect(page.getByTestId("faq-last-second-bid")).toContainText(
      "What happens if someone bids at the last second?",
    );
    await expect(page.getByTestId("faq-last-second-bid")).toContainText(
      "A qualifying last-second bid extends that panel’s closing time so other bidders have a fair chance to respond.",
    );
    await expect(page.getByTestId("hero-primary-cta")).toHaveAttribute(
      "href",
      "#panels",
    );
    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html).not.toContain("FEATURES.md");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("Bid Activity appears only after a real mark", async ({ page }) => {
    await page.goto("/signin");
    await page.getByTestId("signin-email").fill("panel-detail-qa@example.com");
    await page.getByTestId("signin-password").fill("test");
    await page.getByTestId("signin-submit").click();
    await expect(page.getByTestId("account-page")).toBeVisible();

    await page.goto("/panels/hood");
    await expect(page.getByTestId("public-seat-log")).toHaveCount(0);
    await expect(page.getByText("Standing intents")).toHaveCount(0);
    await page.getByTestId("intent-brand").fill("QA Lean Co");
    await page.getByTestId("intent-trade").fill("qa lean tools");
    await page.getByTestId("intent-standing").fill("2750");
    await page.getByTestId("intent-submit").click();
    await expect(page.getByTestId("intent-success")).toContainText(
      "not charged",
      { timeout: 10_000 },
    );
    await expect(page.getByTestId("seat-lead")).toContainText(
      "Current Bid $2,750",
    );
    await expect(page.getByTestId("public-seat-log")).toBeVisible();
    await expect(page.getByTestId("public-seat-log")).toContainText(
      "Bid Activity",
    );
    await expect(page.getByTestId("intent-list")).toContainText("QA Lean Co");
    await expect(page.getByText("Standing intents")).toHaveCount(0);
  });
});
