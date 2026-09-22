import { expect, test } from "@playwright/test";
import {
  PANELS,
  formatUsd,
  isEtchable,
} from "../src/lib/campaign";
import { panelSeatH1 } from "../src/lib/panel-board";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * QA pass 1816pm — lean seat pages + Immortal Etch requirements + last-second FAQ.
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

  test("homepage keeps hero order and adds etch requirements plus last-second FAQ", async ({
    page,
  }) => {
    await page.goto("/");
    const heroPanel = page.getByTestId("hero-primary-cta");
    await expect(heroPanel.locator(".obsidian-arrow-fill-btn__text")).toHaveText(
      "Bid on a Panel",
    );
    await expect(heroPanel).toHaveAttribute("href", "#panels");
    const heroContact = page.getByTestId("hero-secondary-cta");
    await expect(heroContact).toHaveText("Contact BMB");
    await expect(heroContact).toHaveAttribute("href", "#waitlist");

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
    const faq = page.getByTestId("faq-last-second-bid");
    await expect(faq.locator("dt")).toHaveText(
      "What happens if someone bids at the last second?",
    );
    await expect(faq.locator("dd")).toHaveText(
      "A qualifying last-second bid extends that panel’s closing time so others have a fair chance to respond.",
    );

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
      await expect(page.getByTestId("panel-mockup")).toBeVisible();
      await expect(page.getByTestId("seat-lead")).toContainText(
        `Current Bid ${formatUsd(panel.openingUsd)}`,
      );
      await expect(page.getByTestId("seat-context")).toBeVisible();
      if (isEtchable(panel)) {
        await expect(page.getByTestId("seat-finish")).toContainText(
          "Immortal Etch Locked",
        );
        await expect(page.getByTestId("seat-context")).toContainText(
          "Immortal Etch unlocks at $120,000",
        );
      } else {
        await expect(page.getByTestId("seat-finish")).toHaveText("Wrap only");
        await expect(page.getByTestId("seat-finish")).not.toContainText(
          "Immortal Etch Locked",
        );
      }
      const cta = page.getByTestId("seat-primary-cta");
      await expect(cta).toBeVisible();
      await expect(cta).toHaveAttribute("data-cta", "bid");
      await expect(cta).toHaveText("Bid");
      await expect(cta).toHaveAttribute(
        "href",
        `/signin?callbackUrl=/panels/${panel.id}`,
      );
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
