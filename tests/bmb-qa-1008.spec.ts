import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test, type Locator } from "@playwright/test";
import { PANELS, PUBLIC_SITE_ORIGIN } from "../src/lib/campaign";
import { panelBoardMarkFor, panelDisplayName } from "../src/lib/panel-board";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { hotspotsForView, type TruckViewId } from "../src/lib/truck-views";

async function box(locator: Locator) {
  const value = await locator.boundingBox();
  expect(value).toBeTruthy();
  return value!;
}

test.describe("BMB-QA-1008", () => {
  test("home tracker and JSON-LD drop buyout and fully funded", async ({
    page,
  }) => {
    await page.goto("/");
    const money = page.locator("#money");
    await expect(money).toContainText("Floor");
    await expect(money.getByTestId("floor-amount")).toHaveText("$58,000");
    await expect(money).not.toContainText(/buyout/i);
    await expect(money).not.toContainText(/fully funded/i);
    const json = await page.getByTestId("home-json-ld").textContent();
    expect(json?.toLowerCase()).not.toContain("fully funded");
    expect(json?.toLowerCase()).not.toContain("buyout");
    expect(json).toContain("58000");
  });

  test("bid_start fires from modal open, not submit", () => {
    const src = readFileSync(
      join(process.cwd(), "src/components/home/BidDesk.tsx"),
      "utf8",
    );
    const bidAt = src.search(/trackPanel\("bid_start"/);
    expect(bidAt).toBeGreaterThan(-1);
    expect(bidAt).toBeLessThan(src.indexOf("function onSubmit"));
    expect(src).toContain("trackedOpen");
    expect(src.slice(src.indexOf("function onSubmit"))).not.toContain("bid_start");
  });

  test("share image alt is the truck photo", async ({ page }) => {
    for (const path of ["/", "/panels/hood", "/leaderboard"]) {
      await page.goto(path);
      const og =
        (await page.locator('meta[property="og:image:alt"]').getAttribute("content")) ??
        "";
      expect(og, path).toBe(PUBLIC_COPY.hero.ogImageAlt);
      expect(og).not.toMatch(/Concept preview|Seats are|buyout/i);
      const tw = page.locator('meta[name="twitter:image:alt"]');
      if ((await tw.count()) > 0) {
        await expect(tw).toHaveAttribute("content", PUBLIC_COPY.hero.ogImageAlt);
      }
    }
  });

  test("canonical is per page", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      "href",
      PUBLIC_SITE_ORIGIN,
    );
    for (const id of ["hood", "rear-bumper"]) {
      await page.goto(`/panels/${id}`);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        "href",
        `${PUBLIC_SITE_ORIGIN}/panels/${id}`,
      );
    }
  });

  test("llms.txt drops the etch section, buyout, and closed copy", async ({
    request,
  }) => {
    const response = await request.get("/llms.txt");
    expect(response.ok()).toBeTruthy();
    const text = await response.text();
    expect(text).not.toMatch(/Immortal Etch/);
    expect(text).not.toMatch(/Buyout/);
    expect(text).not.toMatch(/not open/i);
    expect(text).toContain("Bidding is open");
  });

  test("contact rejects an invalid email without a POST", async ({ page }) => {
    let posted = false;
    await page.route("**/api/waitlist", async (route) => {
      posted = true;
      await route.abort();
    });
    await page.goto("/#contactus");
    await page.getByTestId("waitlist-email").fill("not-an-email");
    await page.getByTestId("waitlist-submit").click();
    const error = page.getByTestId("waitlist-email-error");
    await expect(error).toHaveText("Enter a valid email address.");
    await expect(page.getByTestId("waitlist-email")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    expect(posted).toBe(false);
  });

  test("panel helper, bid help, and privacy analytics", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByTestId("panels-lead")).toContainText(
      "Pick a panel to place a bid.",
    );
    await expect(page.locator("body")).not.toContainText("one-time email link");
    await page.goto("/signin");
    await expect(page.locator("body")).not.toContainText("one-time email link");
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-cookies")).toContainText(
      "Vercel Web Analytics",
    );
  });

  test("public pages drop etch and buyout data attributes", async ({ page }) => {
    await page.goto("/");
    const home = await page.content();
    expect(home).not.toContain("data-etchable");
    expect(home).not.toContain("data-etch-unlocked");
    expect(home).not.toContain("data-buyout");
    await page.goto("/panels/driver-door");
    const seat = await page.content();
    expect(seat).not.toContain("data-etchable");
    expect(seat).not.toContain("data-buyout");
  });

  test("bumper line matches the other wrap sentence", async ({ page }) => {
    await page.goto("/panels/front-bumper");
    await expect(page.getByTestId("seat-wrap-line")).toHaveText(
      "Vinyl wrap for 12 months after installation.",
    );
    await page.goto("/panels/rear-bumper");
    await expect(page.getByTestId("seat-wrap-line")).toHaveText(
      PUBLIC_COPY.seat.bumperWrapOnly,
    );
  });

  test("empty day by day stays off the home page", async ({ page, request }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    await page.goto("/");
    await expect(page.getByTestId("day-by-day")).toHaveCount(0);
  });

  test("Esc and Close return focus to the control that opened the bid", async ({
    page,
  }) => {
    await page.goto("/");
    const card = page.getByTestId("panel-link-hood");
    await card.click();
    await expect(page.getByTestId("bid-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("bid-modal")).toHaveCount(0);
    await expect(card).toBeFocused();

    await card.click();
    await page.getByTestId("bid-modal-close").click();
    await expect(card).toBeFocused();

    await page.goto("/panels/hood");
    const bid = page.getByTestId("seat-primary-cta");
    await bid.click();
    await expect(page.getByTestId("bid-modal")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(bid).toBeFocused();
    await bid.click();
    await page.getByTestId("bid-modal-close").click();
    await expect(bid).toBeFocused();
  });

  test("hotspot labels use the card display name", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const views: TruckViewId[] = ["front", "driver", "passenger", "rear"];
    for (const view of views) {
      await page.getByTestId(`truck-view-${view}`).click();
      const names = hotspotsForView(view).map((spot) =>
        panelDisplayName(panelBoardMarkFor(spot.panelId).name),
      );
      for (const spot of hotspotsForView(view)) {
        const mark = panelBoardMarkFor(spot.panelId);
        const card = panelDisplayName(mark.name);
        const seat = page.getByTestId(`truck-seat-${spot.panelId}`);
        await expect(seat).toHaveAttribute(
          "aria-label",
          new RegExp(`^${card}, (open|held) seat$`),
        );
        await expect(seat).toHaveAttribute(
          "data-seat-label",
          `(${mark.n}) ${card}`,
        );
      }
      const links = page.getByTestId("truck-seat-links").locator("a");
      await expect(links).toHaveText(names);
    }
    expect(panelDisplayName(PANELS.find((row) => row.id === "front-bumper")!.name)).toBe(
      "Front Bumper",
    );
  });

  test("phone tap targets are at least 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    expect((await box(page.getByRole("link", { name: "Contact BMB" }))).height).toBeGreaterThanOrEqual(44);
    for (let n = 1; n <= 11; n += 1) {
      const chip = await box(page.getByTestId(`panel-legend-${n}`));
      expect(chip.height, `legend ${n}`).toBeGreaterThanOrEqual(44);
      expect(chip.width, `legend ${n}`).toBeGreaterThanOrEqual(44);
    }
    for (const id of [
      "truck-view-front",
      "truck-view-driver",
      "truck-view-passenger",
      "truck-view-rear",
    ]) {
      const tab = await box(page.getByTestId(id));
      expect(tab.height, id).toBeGreaterThanOrEqual(44);
      expect(tab.width, id).toBeGreaterThanOrEqual(44);
    }
    const views: TruckViewId[] = ["front", "driver", "passenger", "rear"];
    for (const view of views) {
      await page.getByTestId(`truck-view-${view}`).click();
      const seats = page.locator("a[data-testid^='truck-seat-']");
      const count = await seats.count();
      for (let i = 0; i < count; i += 1) {
        const hit = await box(seats.nth(i));
        expect(hit.height, `${view} seat ${i}`).toBeGreaterThanOrEqual(44);
        expect(hit.width, `${view} seat ${i}`).toBeGreaterThanOrEqual(44);
      }
      const chips = page.locator("a.truck-name-chip-link");
      const chipCount = await chips.count();
      for (let i = 0; i < chipCount; i += 1) {
        const hit = await box(chips.nth(i));
        expect(hit.height, `${view} chip ${i}`).toBeGreaterThanOrEqual(44);
        expect(hit.width, `${view} chip ${i}`).toBeGreaterThanOrEqual(44);
      }
    }
    expect((await box(page.locator(".waitlist-whole-truck"))).height).toBeGreaterThanOrEqual(44);
    await page.getByTestId("panel-link-hood").click();
    const close = await box(page.getByTestId("bid-modal-close"));
    expect(close.height).toBeGreaterThanOrEqual(44);
    expect(close.width).toBeGreaterThanOrEqual(44);
    await page.goto("/panels/hood");
    const panels = await box(page.locator(".seat-masthead .eyebrow a"));
    expect(panels.height).toBeGreaterThanOrEqual(44);
    expect(panels.width).toBeGreaterThanOrEqual(44);
  });

  test("phone home does not overflow and the floor label is fully on the bar", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    expect(overflow.scrollWidth).toBeLessThanOrEqual(391);
    const label = page.getByTestId("vault-floor-label");
    await expect(label).toContainText("$58,000");
    const labelBox = await box(label);
    const well = await box(page.getByTestId("vault-legend"));
    expect(labelBox.x).toBeGreaterThanOrEqual(well.x - 1);
    expect(labelBox.x + labelBox.width).toBeLessThanOrEqual(well.x + well.width + 1);
  });

  test("bid modal drops logo and website fields and names the logo email", async ({
    page,
    request,
  }) => {
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
    const opened = await request.post("/api/test/campaign-clock", {
      data: { live: true, now: "2026-10-06T16:00:00.000Z" },
    });
    expect(opened.ok()).toBeTruthy();
    await page.goto("/");
    await page.getByTestId("panel-link-hood").click();
    const modal = page.getByTestId("bid-modal");
    await expect(modal).toBeVisible();
    await expect(page.getByTestId("bid-modal-logo")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-website")).toHaveCount(0);
    await expect(page.getByTestId("bid-modal-logo-send")).toHaveText(
      PUBLIC_COPY.bidDesk.logoSend,
    );
    await request.post("/api/test/campaign-clock", { data: { reset: true } });
  });

  test("passenger chip hit boxes (8) and (9) do not intersect", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await page.getByTestId("truck-view-passenger").click();
    const eight = await box(
      page.locator(
        "a.truck-name-chip-link[data-seat-id='passenger-rear-quarter'] .truck-name-chip-hit",
      ),
    );
    const nine = await box(
      page.locator(
        "a.truck-name-chip-link[data-seat-id='passenger-bed'] .truck-name-chip-hit",
      ),
    );
    const overlap =
      eight.x < nine.x + nine.width &&
      eight.x + eight.width > nine.x &&
      eight.y < nine.y + nine.height &&
      eight.y + eight.height > nine.y;
    expect(overlap).toBe(false);
  });
});
