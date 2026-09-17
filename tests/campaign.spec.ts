import { expect, test, type Page } from "@playwright/test";
import {
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

const HERO_TITLE = PUBLIC_COPY.hero.h1;

async function expectHeroTitleUnclipped(page: Page) {
  const title = page.locator("#hero-title");
  await expect(title).toBeVisible();
  await expect(title).toHaveText(HERO_TITLE);
  await page.evaluate(() => document.fonts.ready);

  const metrics = await title.evaluate((el) => {
    const hero = el.closest(".hero");
    if (!(hero instanceof HTMLElement)) {
      throw new Error("hero container missing");
    }

    const range = document.createRange();
    range.selectNodeContents(el);
    const textRects = [...range.getClientRects()];
    const lastGlyph = textRects.at(-1);
    const heroRect = hero.getBoundingClientRect();

    return {
      text: (el.textContent ?? "").replace(/\s+/g, ""),
      overflowX: el.scrollWidth - el.clientWidth,
      lastGlyphRight: lastGlyph?.right ?? 0,
      heroRight: heroRect.right,
    };
  });

  expect(metrics.text).toBe(HERO_TITLE.replace(/\s+/g, ""));
  expect(metrics.overflowX).toBeLessThanOrEqual(1);
  expect(metrics.lastGlyphRight).toBeLessThanOrEqual(metrics.heroRight + 1);
}

test.describe("P1 waitlist campaign locks", () => {
  test("renders brand, floor, buyout, and bidding-not-open copy", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("brand-wordmark")).toHaveText("BrandMyBeast");
    const heroTruck = page.getByTestId("hero-truck-preview");
    await expect(heroTruck).toBeVisible();
    await expect(heroTruck).toHaveAttribute("href", "/panels/hood");
    await expect(heroTruck.locator("img")).toHaveAttribute(
      "src",
      "/hero-truck-preview.jpg",
    );
    await expect(heroTruck.locator("img")).toHaveAttribute(
      "alt",
      PUBLIC_COPY.hero.imageAlt,
    );
    await expect(page.getByTestId("hero-preview-label")).toContainText(
      "Board preview",
    );
    await expect(page.getByTestId("hero-preview-label")).toContainText(
      "bare stainless",
    );
    await expect(page.locator("#hero-title")).toHaveText(HERO_TITLE);
    await expect(page.getByRole("heading", { name: PUBLIC_COPY.board.heading })).toBeVisible();
    await expect(page.getByTestId("floor-amount")).toHaveText(
      formatUsd(FLOOR_USD),
    );
    await expect(page.getByTestId("goal-amount")).toHaveText(
      formatUsd(GOAL_USD),
    );
    await expect(page.getByTestId("raised-amount")).toHaveText(formatUsd(0));
    await expect(page.getByTestId("whole-truck-intent")).toBeVisible();
    await expect(page.getByTestId("whole-truck-heading")).toHaveText(
      PUBLIC_COPY.board.wholeTruckHeading,
    );
    await expect(page.getByTestId("whole-truck-lead")).toHaveText(
      PUBLIC_COPY.board.wholeTruckLead,
    );
    // Slice 16.0a — public `/` explanation only; no sign-in CTA / form.
    await expect(page.getByTestId("whole-truck-signin")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-intent-form")).toHaveCount(0);
    await expect(page.getByTestId("raised-label")).toHaveText(
      PUBLIC_COPY.board.raisedLabel,
    );
    expect(PUBLIC_COPY.board.raisedLabel.toLowerCase()).toContain("pledged so far");
    expect(PUBLIC_COPY.board.raisedHint.toLowerCase()).not.toMatch(/\bp3\b/);
    expect(PUBLIC_COPY.board.raisedHint.toLowerCase()).not.toMatch(
      /operator[- ]financ/,
    );
    expect(PUBLIC_COPY.board.raisedHint.toLowerCase()).toMatch(/refund/);
    await expect(page.getByTestId("raised-hint")).toHaveText(
      PUBLIC_COPY.board.raisedHint,
    );
    await expect(page.getByTestId("close-copy")).toHaveText(
      PUBLIC_COPY.board.clockWhenCloseNull,
    );
    await expect(page.getByTestId("shortfall-ticker")).toBeVisible();
    await expect(page.getByTestId("shortfall-floor-label")).toHaveText(
      PUBLIC_COPY.board.shortfallFloorLabel,
    );
    await expect(page.getByTestId("shortfall-goal-label")).toHaveText(
      PUBLIC_COPY.board.shortfallBuyoutLabel,
    );
    await expect(page.getByTestId("open-seats-label")).toHaveText(
      PUBLIC_COPY.board.openSeatsLabel,
    );
    await expect(page.getByTestId("shortfall-floor")).toHaveText(formatUsd(FLOOR_USD));
    await expect(page.getByTestId("shortfall-goal")).toHaveText(formatUsd(GOAL_USD));
    await expect(page.getByTestId("open-seats")).toHaveText(`12 of ${PANELS.length}`);
    const shortfallTicker = page.getByTestId("shortfall-ticker");
    await expect(shortfallTicker).toHaveAttribute(
      "aria-label",
      /dollars to floor and open seats/i,
    );
    await expect(shortfallTicker).toHaveAttribute("aria-label", /no impressions/i);
    const shortfallText = (await shortfallTicker.innerText()).toLowerCase();
    expect(shortfallText).not.toMatch(/impression|cpm|reach/i);
    await expect(page.getByTestId("floor-progress-copy")).toHaveText("0% of floor");
    await expect(page.getByTestId("goal-progress-copy")).toHaveText("0% of buyout");
    await expect(page.getByTestId("visual-vault")).toBeVisible();
    await expect(page.getByTestId("vault-marker-floor")).toBeVisible();
    await expect(page.getByTestId("vault-marker-goal")).toBeVisible();
    await expect(page.getByTestId("vault-marker-floor")).toHaveAttribute(
      "data-mark-usd",
      String(FLOOR_USD),
    );
    await expect(page.getByTestId("vault-marker-goal")).toHaveAttribute(
      "data-mark-usd",
      String(GOAL_USD),
    );
    await expect(page.getByTestId("vault-marker-floor")).toHaveAttribute(
      "data-mark-pct",
      String(Math.round((FLOOR_USD / GOAL_USD) * 1000) / 10),
    );
    await expect(page.getByTestId("vault-marker-goal")).toHaveAttribute(
      "data-mark-pct",
      "100",
    );
    await expect(page.getByTestId("vault-marker-floor")).toHaveAttribute(
      "style",
      new RegExp(
        `left:\\s*${Math.round((FLOOR_USD / GOAL_USD) * 1000) / 10}%`,
      ),
    );
    await expect(page.getByTestId("vault-marker-goal")).toHaveAttribute(
      "style",
      /left:\s*100%/,
    );
    expect(await page.getByTestId("vault-marker-floor").count()).toBe(1);
    expect(await page.getByTestId("vault-marker-goal").count()).toBe(1);
    expect(
      await page
        .getByTestId("visual-vault")
        .getByTestId("vault-marker-floor")
        .count(),
    ).toBe(1);
    expect(
      await page
        .getByTestId("visual-vault")
        .getByTestId("vault-marker-goal")
        .count(),
    ).toBe(1);
    await expect(page.getByTestId("vault-floor-label")).toHaveText(
      `${PUBLIC_COPY.board.vaultFloorMarkLabel} ${formatUsd(FLOOR_USD)}`,
    );
    await expect(page.getByTestId("vault-goal-label")).toHaveText(
      `${PUBLIC_COPY.board.vaultBuyoutMarkLabel} ${formatUsd(GOAL_USD)}`,
    );

    await expect(page.getByTestId("etch-section")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: PUBLIC_COPY.etch.heading }),
    ).toBeVisible();
    await expect(page.getByTestId("questions-section")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: PUBLIC_COPY.questions.heading }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: PUBLIC_COPY.waitlist.heading }),
    ).toBeVisible();

    await expect(page.getByTestId("wreck-refund-faq")).toBeVisible();
    await expect(page.getByTestId("wreck-refund-rules")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: PUBLIC_COPY.wreck.heading }),
    ).toBeVisible();
    await expect(page.getByTestId("wreck-refund-faq")).toContainText(
      PUBLIC_COPY.wreck.lead,
    );
    for (const item of PUBLIC_COPY.wreck.items) {
      await expect(page.getByTestId(`wreck-title-${item.id}`)).toHaveText(
        item.q,
      );
      await expect(page.getByTestId(`wreck-body-${item.id}`)).toHaveText(
        item.a,
      );
    }
    await expect(page.getByTestId("wreck-body-campaign-miss")).toHaveText(
      PUBLIC_COPY.wreck.items.find((item) => item.id === "campaign-miss")!.a,
    );
    await expect(page.getByTestId("wreck-body-wrap-pro-rata")).toContainText(
      "pro-rata",
    );
    await expect(page.getByTestId("wreck-body-immortal-fragment")).toContainText(
      "vault certificate",
    );
    const wreckHtml = (
      await page.getByTestId("wreck-refund-faq").innerText()
    ).toLowerCase();
    expect(wreckHtml).not.toMatch(
      /force majeure|indemnif|arbitration|consequential damages|hereby|hereinafter|jurisdiction|statute|\blease\b|stripe/i,
    );
    await expect(page.getByTestId("home-main")).toHaveAttribute(
      "data-truck-exists",
      "false",
    );
    for (const board of [
      "vault-certificate",
      "retired-vinyl",
      "season-two",
      "rain-night-lighting",
      "truck-order-tracker",
      "weekly-mileage-ledger",
      "landmark-proof-log",
      "city-time-heatmap",
      "qr-nfc-scan-counter",
      "city-ping-winner",
      "charge-stop-slots",
      "route-detour-buyout",
      "clemson-saturday-lock",
      "sighting-bounty-cards",
      "circuit-story",
      "sightings",
      "event-calendar",
      "cabin-plaque",
    ] as const) {
      await expect(page.getByTestId(board)).toHaveCount(0);
    }

    await expect(page.getByTestId("raised-hint")).toHaveText(
      PUBLIC_COPY.board.raisedHint,
    );
    await expect(page.getByTestId("floor-hint")).toHaveText(
      PUBLIC_COPY.board.floorHint,
    );
    await expect(page.getByTestId("goal-hint")).toHaveText(
      PUBLIC_COPY.board.buyoutHint,
    );
  });

  test("shows twelve panels with etch locked under buyout", async ({
    page,
  }) => {
    await page.goto("/");
    const cards = page.getByTestId("panel-grid").locator("article");
    await expect(cards).toHaveCount(12);

    for (const panel of PANELS) {
      const card = page.getByTestId(`panel-${panel.id}`);
      await expect(card).toBeVisible();
      if (isEtchable(panel)) {
        await expect(card).toHaveAttribute("data-etchable", "true");
        await expect(card).toHaveAttribute("data-etch-unlocked", "false");
        await expect(page.getByTestId(`etch-lock-${panel.id}`)).toHaveText(
          PUBLIC_COPY.panels.badgeEtch,
        );
      } else {
        await expect(card).toHaveAttribute("data-etchable", "false");
        await expect(
          card.getByText(PUBLIC_COPY.panels.badgeWrap, { exact: true }),
        ).toBeVisible();
      }
    }
  });

  test("slice 1.7: homepage panel cards link to the seat page", async ({
    page,
  }) => {
    await page.goto("/");
    for (const panel of PANELS) {
      await expect(page.getByTestId(`panel-link-${panel.id}`)).toHaveAttribute(
        "href",
        `/panels/${panel.id}`,
      );
    }

    await page.getByTestId("panel-link-hood").click();
    await expect(page).toHaveURL(/\/panels\/hood$/);
    await expect(page.getByTestId("panel-intent-page")).toBeVisible();
    await expect(page.getByTestId("public-seat-label")).toHaveText(
      "Public seat",
    );
    await expect(page.getByRole("heading", { level: 1 })).toContainText(/hood/i);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("keeps banned identity, lease, and process notes out of the HTML", async ({
    page,
  }) => {
    await page.goto("/");
    const html = await page.content();
    const lower = html.toLowerCase();
    expect(lower).not.toMatch(/\blease\b/);
    expect(lower).not.toContain("gmail.com");
    expect(html).toContain("@BrandMyBeast");
    expect(html).toContain("hello@brandmybeast.com");
    expect(html).toContain(HERO_TITLE);
    expect(html).toContain(PUBLIC_COPY.etch.heading);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("Close date unset");
    expect(lower).not.toContain("soft auction");
    expect(html).not.toContain("Opening marks");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toContain("30-day clock");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("Auction clock");
    expect(html).not.toContain("Rules draft");
    expect(html).not.toContain("No close clock on P2");
    expect(html).not.toContain("Stripe capture");
    expect(html).not.toMatch(/\bP2\b/);
    expect(html).not.toContain("No invented miles");
    expect(html).not.toContain("No invented scan counts");
    expect(html).not.toContain("No invented city hours");
    expect(html).not.toContain("Cabin plaque");
  });

  test("slice 5.4: public homepage has no wrap-shop header link", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("brand-wordmark")).toHaveText("BrandMyBeast");
    await expect(page.getByTestId("shop-nav-link")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /wrap shop/i })).toHaveCount(0);
    await expect(page.getByTestId("floor-amount")).toHaveText(
      formatUsd(FLOOR_USD),
    );
    await expect(page.getByTestId("goal-amount")).toHaveText(
      formatUsd(GOAL_USD),
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });

  test("shows the full hero title without clipping", async ({ page }) => {
    await page.goto("/");
    await expectHeroTitleUnclipped(page);
  });

  test("shows the full hero title on a 375px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expectHeroTitleUnclipped(page);
  });

  test("shows the full hero title on a 900px viewport", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 800 });
    await page.goto("/");
    await expectHeroTitleUnclipped(page);
  });

  test("serves a favicon at /favicon.ico", async ({ request }) => {
    const response = await request.get("/favicon.ico");
    expect(response.status()).toBe(200);
    const type = response.headers()["content-type"] ?? "";
    expect(type).toMatch(/image|icon|octet-stream/i);
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  test("accepts waitlist email in memory mode", async ({ page, request }) => {
    const email = `bidder-${Date.now()}@example.com`;

    const created = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      status: "created",
    });

    const again = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(again.status()).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, status: "exists" });

    await page.goto("/");
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("waitlist-email")).toHaveAttribute(
      "placeholder",
      PUBLIC_COPY.waitlist.placeholder,
    );
    await page.getByTestId("waitlist-email").fill(email);

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/waitlist") && res.request().method() === "POST",
      ),
      page.getByTestId("waitlist-submit").click(),
    ]);

    expect(response.status()).toBe(200);
    await expect(page.getByTestId("waitlist-status")).toHaveText(
      PUBLIC_COPY.waitlist.already,
    );
    await expect(page.getByTestId("waitlist-next")).toBeVisible();
    await expect(page.getByTestId("waitlist-browse-panels")).toHaveAttribute(
      "href",
      "/#panels",
    );
    await expect(page.getByTestId("waitlist-signin-intent")).toHaveCount(0);
    await expect(page.getByTestId("waitlist-next")).toContainText(
      "stay on the list",
    );
    await expect(page.getByTestId("waitlist-next")).toContainText(
      "cards are not charged yet",
    );
  });

  test("waitlist API contract: created 201, exists 200, invalid 400", async ({
    page,
    request,
  }) => {
    const email = `contract-${Date.now()}@example.com`;

    const created = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      status: "created",
    });

    const exists = await request.post("/api/waitlist", {
      data: { email },
    });
    expect(exists.status()).toBe(200);
    expect(await exists.json()).toMatchObject({
      ok: true,
      status: "exists",
    });

    const invalid = await request.post("/api/waitlist", {
      data: { email: "not-an-email" },
    });
    expect(invalid.status()).toBe(400);
    expect(await invalid.json()).toMatchObject({
      ok: false,
      code: "invalid",
    });

    const missing = await request.post("/api/waitlist", {
      data: {},
    });
    expect(missing.status()).toBe(400);
    expect(await missing.json()).toMatchObject({
      ok: false,
      code: "invalid",
    });

    await page.goto("/");
    const fresh = `fresh-${Date.now()}@example.com`;
    await page.getByTestId("waitlist-email").fill(fresh);
    const [uiCreated] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/waitlist") &&
          res.request().method() === "POST",
      ),
      page.getByTestId("waitlist-submit").click(),
    ]);
    expect(uiCreated.status()).toBe(201);
    await expect(page.getByTestId("waitlist-status")).toHaveText(
      PUBLIC_COPY.waitlist.success,
    );
  });

  test("cabin plaque API 404s while truck is missing (no homepage UI)", async ({
    page,
    request,
  }) => {
    const name = `Plaque ${Date.now()}`;
    await page.goto("/");
    await expect(page.getByTestId("cabin-plaque")).toHaveCount(0);

    const created = await request.post("/api/plaque", {
      data: { name },
    });
    expect(created.status()).toBe(404);

    await page.goto("/");
    await expect(page.getByTestId("cabin-plaque")).toHaveCount(0);
    const html = await page.content();
    expect(html).not.toContain(name);
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
  });

  test("circuit story request 404s while truck is missing", async ({
    page,
    request,
  }) => {
    const email = `circuit-${Date.now()}@example.com`;
    await page.goto("/");
    await expect(page.getByTestId("circuit-story")).toHaveCount(0);

    const created = await request.post("/api/circuit-story", {
      data: { email, corridorId: "charlotte", note: "Proof after install" },
    });
    expect(created.status()).toBe(404);

    await page.goto("/");
    await expect(page.getByTestId("circuit-story")).toHaveCount(0);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toMatch(/\b\d+\s*impressions\b/i);
  });

  test("public sighting board 404s while truck is missing", async ({
    page,
    request,
  }) => {
    const note = `Grocery lot wrap ${Date.now()}`;
    await page.goto("/");
    await expect(page.getByTestId("sightings")).toHaveCount(0);

    const created = await request.post("/api/sighting", {
      data: { corridorId: "atlanta", note },
    });
    expect(created.status()).toBe(404);

    await page.goto("/");
    await expect(page.getByTestId("sightings")).toHaveCount(0);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toMatch(/\b\d+\s*impressions\b/i);
  });

  test("event request calendar 404s while truck is missing", async ({
    page,
    request,
  }) => {
    const email = `event-${Date.now()}@example.com`;
    await page.goto("/");
    await expect(page.getByTestId("event-calendar")).toHaveCount(0);

    const created = await request.post("/api/event-request", {
      data: {
        email,
        kindId: "campus",
        requestedDate: "2026-11-07",
        note: "After install",
      },
    });
    expect(created.status()).toBe(404);

    await page.goto("/");
    await expect(page.getByTestId("event-calendar")).toHaveCount(0);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toMatch(/\b\d+\s*impressions\b/i);
  });
});
