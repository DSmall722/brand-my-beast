import { expect, test } from "@playwright/test";
import { FLOOR_USD, PANELS, formatUsd } from "../src/lib/campaign";
import { depositUsdForMark } from "../src/lib/intent";
import { PUBLIC_COPY } from "../src/lib/public-copy";

const OPEN_NOW = "2026-10-06T16:00:00.000Z";
const FAQ_CLOSE =
  "Bidding closes Monday, November 2, 2026 at 12:00 PM ET. A bid in the last 10 minutes pushes the close back 10 minutes.";
const TRUCK_ALT = `Cybertruck with the ${PANELS.length} ad panels outlined`;
const HERO_ALT =
  "Example wrap on the BrandMyBeast truck. Seats are open for bids.";
const HERO_CAPTION = "Example wrap. Your brand here.";
const FLOOR_HINT = `Miss the ${formatUsd(FLOOR_USD)} goal and every deposit is refunded.`;
const NO_EM = /[\u2014\u2013]/;

test.describe("BMB-QA-2-FIX2 bid form, copy, a11y", () => {
  test.afterEach(async ({ request }) => {
    await request.post("/api/test/campaign-clock", { data: { reset: true } });
  });

  test("open seat bid form shows inline errors and blocks an invalid place bid", async ({
    page,
    request,
  }) => {
    test.setTimeout(90_000);
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: OPEN_NOW },
    });
    expect(opened.ok()).toBeTruthy();

    const bids: string[] = [];
    page.on("request", (req) => {
      if (req.url().includes("/api/bid") && req.method() === "POST") {
        bids.push(req.url());
      }
    });

    await page.goto("/panels/rear-bumper");
    await page.getByTestId("seat-primary-cta").click();
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    await expect(modal).toHaveAttribute("data-bid-window", "intent");

    const minimum = (await page.getByTestId("bid-modal-minimum").innerText()).trim();
    const brand = page.getByTestId("bid-modal-brand");
    const amount = page.getByTestId("bid-modal-amount");
    const brandError = page.getByTestId("bid-modal-brand-error");
    const amountError = page.getByTestId("bid-modal-amount-error");
    const submit = page.getByTestId("bid-modal-submit");

    await expect(brandError).toHaveCount(0);
    await expect(brand).not.toHaveAttribute("aria-invalid", "true");
    await brand.focus();
    await brand.blur();
    await expect(brandError).toHaveText("Enter your brand name.");
    await expect(brand).toHaveAttribute("aria-invalid", "true");
    await expect(brand).toHaveAttribute("aria-describedby", /.+/);
    const brandDescribedBy = await brand.getAttribute("aria-describedby");
    await expect(brandError).toHaveAttribute("id", brandDescribedBy ?? "");
    await expect(submit).toBeDisabled();

    await amount.fill("1");
    await expect(amountError).toHaveText(
      `Minimum bid for this seat is ${minimum}.`,
    );
    await expect(amount).toHaveAttribute("aria-invalid", "true");
    const amountDescribedBy = await amount.getAttribute("aria-describedby");
    await expect(amountError).toHaveAttribute("id", amountDescribedBy ?? "");
    await expect(page.getByTestId("bid-modal-deposit")).toHaveCount(0);
    await expect(submit).toBeDisabled();

    for (const bad of ["abc", "12.5", "0", "-5"]) {
      await amount.fill(bad);
      await expect(amountError).toHaveText("Enter a bid in whole dollars.");
      await expect(page.getByTestId("bid-modal-deposit")).toHaveCount(0);
      await expect(submit).toBeDisabled();
    }

    await amount.fill(minimum.replace(/[^0-9]/g, ""));
    await expect(amountError).toHaveCount(0);
    await expect(amount).not.toHaveAttribute("aria-invalid", "true");
    await expect(page.getByTestId("bid-modal-deposit")).toBeVisible();
    await expect(page.getByTestId("bid-modal-deposit")).toContainText("20%");
    await expect(submit).toBeDisabled();

    await brand.fill("Fix Two Brand");
    await expect(brandError).toHaveCount(0);
    await expect(brand).not.toHaveAttribute("aria-invalid", "true");
    await page.getByTestId("bid-modal-trade").fill("tools");
    await page.getByTestId("bid-modal-email").fill("fix2@example.com");
    await expect(submit).toBeEnabled();
    await expect(submit).toHaveText(
      `Place bid · Pay ${formatUsd(depositUsdForMark(Number(minimum.replace(/[^0-9]/g, ""))))} deposit`,
    );
    expect(bids).toEqual([]);
    expect(HERO_CAPTION).not.toMatch(NO_EM);
  });

  test("FAQ, tracker, hero, truck alt, and day-by-day copy", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    await page.goto("/");

    const close = page.getByTestId("faq-close-date");
    await expect(close).toContainText(FAQ_CLOSE);
    await expect(close).not.toContainText("not sold yet");
    expect(PUBLIC_COPY.questions.items.find((item) => "id" in item && item.id === "close-date")?.a).toBe(
      FAQ_CLOSE,
    );

    await expect(page.getByTestId("floor-hint")).toHaveText(FLOOR_HINT);
    expect(PUBLIC_COPY.board.floorHint).toBe(FLOOR_HINT);

    const caption = page.getByTestId("hero-caption");
    await expect(caption).toBeVisible();
    await expect(caption).toHaveText(HERO_CAPTION);
    const hero = page.getByTestId("truck-img-hero");
    await expect(hero).toHaveAttribute("alt", HERO_ALT);
    await expect(hero).not.toHaveAttribute("alt", /not sold yet/);
    expect(PUBLIC_COPY.hero.imageAlt).toBe(HERO_ALT);
    expect(PUBLIC_COPY.hero.imageAlt).not.toMatch(NO_EM);
    expect(PUBLIC_COPY.hero.caption).not.toMatch(NO_EM);

    await expect(page.getByTestId("truck-img-board-front")).toHaveAttribute(
      "alt",
      TRUCK_ALT,
    );
    expect(PUBLIC_COPY.board.truckImageAlt).toBe(TRUCK_ALT);
    expect(TRUCK_ALT).toBe("Cybertruck with the 11 ad panels outlined");

    const ticker = page.getByTestId("shortfall-ticker");
    const label = (await ticker.getAttribute("aria-label")) ?? "";
    expect(label).not.toMatch(/no impressions/i);
    expect(label).toBe(
      `${formatUsd(FLOOR_USD)} still needed to fund the wrap; ${PANELS.length} seats open.`,
    );

    const history = page.getByTestId("day-by-day");
    await expect(history).toHaveAttribute("data-empty", "true");
    await expect(history.getByTestId("day-by-day-empty")).toHaveText("No bids yet.");
    await expect(history).not.toContainText("Be the first");

    for (const text of [FAQ_CLOSE, FLOOR_HINT, HERO_ALT, HERO_CAPTION, TRUCK_ALT, label, "No bids yet."]) {
      expect(text).not.toMatch(NO_EM);
    }
  });

  test("legal pages name the update date and head every privacy section", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("legal-updated")).toHaveText(
      "Last updated: Oct 6, 2026",
    );
    const privacyHeads = [
      "What we collect",
      "Bids",
      "Payments",
      "How we use it",
      "Who processes it",
      "How long we keep it",
      "Access and deletion",
      "Cookies",
      "Contact",
    ];
    for (const name of privacyHeads) {
      await expect(
        page.getByRole("heading", { level: 2, name }),
      ).toBeVisible();
    }
    await expect(page.getByTestId("privacy-retention")).toContainText(
      "Contact emails are kept until we have answered or you ask us to delete them.",
    );
    await expect(page.getByTestId("privacy-retention")).not.toContainText(
      "waitlist",
    );

    await page.goto("/terms");
    await expect(page.getByTestId("legal-updated")).toHaveText(
      "Last updated: Oct 6, 2026",
    );
    await expect(
      page.getByRole("heading", { level: 2, name: "Agreement" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 2, name: "The product" }),
    ).toBeVisible();
    expect("Last updated: Oct 6, 2026").not.toMatch(NO_EM);
  });
});
