import { expect, test } from "@playwright/test";
import {
  PANELS,
  isEtchable,
} from "../src/lib/campaign";
import { panelSeatH1 } from "../src/lib/panel-board";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * QA pass 1816pm — lean seat pages + Immortal Etch requirements + locked buyer FAQ.
 * Preview only. Does not flip CLOSE_AT or money locks.
 */

const REMOVED = [
  "Public seat",
  "Seat open",
  "Seat held",
  "Adjacent seats",
  "Neighboring seats",
  "Opening marks",
  "One brand per trade",
  "Soft-close extension",
  "Intent only. Amount does not charge.",
  "Standing intents",
  "Seat log",
  "Sign in to download a seat PNG",
  "Download seat PNG",
  "No gradients",
  "No 8-pt type",
  "Art notes",
  "No intents yet",
  "No marks yet on this seat",
] as const;

test.describe("panel detail cleanup", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
    await request.post("/api/test/seats-open", { data: { reset: true } });
  });

  test("homepage keeps hero order and adds etch requirements plus locked buyer FAQ", async ({
    page,
  }) => {
    await page.goto("/");
    const heroPanel = page.getByTestId("hero-primary-cta");
    await expect(heroPanel.locator(".obsidian-arrow-fill-btn__text")).toHaveText(
      "Bid on a Panel",
    );
    await expect(heroPanel).toHaveJSProperty("tagName", "A");
    await expect(heroPanel).toHaveAttribute("href", "#panels");
    const heroContact = page.getByTestId("hero-secondary-cta");
    await expect(heroContact).toHaveText("Contact BMB");
    await expect(heroContact).toHaveAttribute("href", "#how-it-works");

    const requirements = page.getByTestId("etch-requirements");
    await expect(requirements).toHaveText(PUBLIC_COPY.etch.requirements);
    const reqStyle = await requirements.evaluate((el) => {
      const style = getComputedStyle(el);
      return { fontFamily: style.fontFamily, fontSize: style.fontSize };
    });
    const bodyStyle = await page.locator(".questions-item dd").first().evaluate((el) => {
      const style = getComputedStyle(el);
      return { fontFamily: style.fontFamily, fontSize: style.fontSize };
    });
    expect(reqStyle.fontFamily).toBe(bodyStyle.fontFamily);
    expect(reqStyle.fontSize).toBe(bodyStyle.fontSize);
    await expect(page.getByTestId("faq-last-second-bid")).toHaveCount(0);
    const faq = page.getByTestId("faq-outbid");
    await expect(faq.locator("dt")).toHaveText(
      "What if someone outbids me?",
    );
    await expect(faq.locator("dd")).toContainText(
      "The 20% is an authorization, not a captured charge",
    );
    await expect(page.getByTestId("faq-campaign-miss")).toContainText(
      "Every hold is released",
    );
    await expect(page.getByTestId("faq-close-date")).toContainText("TBD");

    const html = await page.content();
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("FEATURES.md");
  });

  test("all 11 seat pages stay lean detail pages with a bid CTA", async ({
    page,
  }) => {
    expect(PANELS).toHaveLength(11);
    for (const panel of PANELS) {
      await page.goto(`/panels/${panel.id}`);
      await expect(page.getByTestId("panel-intent-page")).toBeVisible();
      await expect(page.getByTestId("panel-seat-h1")).toHaveText(
        panelSeatH1(panel),
      );
      await expect(page.getByTestId("panel-mockup")).toHaveCount(0);
      await expect(page.getByTestId("seat-photo-stage")).toBeVisible();
      await expect(page.getByTestId("seat-lead")).toContainText(
        isEtchable(panel)
          ? PUBLIC_COPY.seat.wrapTwelveMonths
          : PUBLIC_COPY.seat.bumperWrapOnly,
      );
      await expect(page.getByTestId("seat-lead")).not.toContainText("Current Bid");
      if (isEtchable(panel)) {
        await expect(page.getByTestId("seat-finish")).toContainText(
          "Immortal Etch Locked",
        );
      } else {
        await expect(page.getByTestId("seat-finish")).toHaveText(
          PUBLIC_COPY.seat.bumperWrapOnly,
        );
        await expect(page.getByTestId("seat-finish")).not.toContainText(
          "Immortal Etch Locked",
        );
      }
      await expect(page.getByTestId("seat-context")).toHaveCount(0);
      const cta = page.getByTestId("seat-primary-cta");
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("data-cta", "bid");
      await expect(cta).toHaveText("Bid");
      await expect(cta).toHaveRole("button");
      const href = await cta.getAttribute("href");
      expect(href ?? "").not.toContain("/signin");
      await expect(page.getByTestId("public-seat-log")).toHaveCount(0);
      await expect(page.getByTestId("intent-list")).toHaveCount(0);

      const visible = await page.getByTestId("panel-intent-page").innerText();
      for (const phrase of REMOVED) {
        expect(visible, `${panel.id} still shows “${phrase}”`).not.toContain(
          phrase,
        );
      }
    }
  });

  test("closed seats use a contact CTA instead of a dead page", async ({
    page,
    request,
  }) => {
    const closed = await request.post("/api/test/seats-open", {
      data: { open: false },
    });
    expect(closed.ok()).toBeTruthy();
    try {
      await page.goto("/panels/hood");
      const cta = page.getByTestId("seat-primary-cta");
      await expect(cta).toHaveAttribute("data-cta", "contact");
      await expect(cta).toHaveText("Contact BMB");
      await expect(cta).toHaveAttribute("href", "/#waitlist");
      await expect(page.getByTestId("intent-bid-form")).toHaveCount(0);
      await expect(page.getByTestId("intent-signin-needed")).toHaveCount(0);
    } finally {
      await request.post("/api/test/seats-open", { data: { reset: true } });
    }
  });
});
