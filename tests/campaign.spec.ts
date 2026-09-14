import { expect, test, type Page } from "@playwright/test";
import {
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "../src/lib/campaign";

async function expectHeroTitleUnclipped(page: Page) {
  const title = page.locator("#hero-title");
  await expect(title).toBeVisible();
  await expect(title).toHaveText("BrandMyBeast");
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

  expect(metrics.text).toBe("BrandMyBeast");
  expect(metrics.overflowX).toBeLessThanOrEqual(1);
  expect(metrics.lastGlyphRight).toBeLessThanOrEqual(metrics.heroRight + 1);
}

test.describe("P1 waitlist campaign locks", () => {
  test("renders brand, floor, buyout, and auction clock copy", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("brand-wordmark")).toHaveText("BrandMyBeast");
    await expect(page.getByTestId("floor-amount")).toHaveText(
      formatUsd(FLOOR_USD),
    );
    await expect(page.getByTestId("goal-amount")).toHaveText(
      formatUsd(GOAL_USD),
    );
    await expect(page.getByTestId("raised-amount")).toHaveText(formatUsd(0));
    await expect(page.getByTestId("close-copy")).toHaveText(
      "Auction clock starts when bidding opens.",
    );
    await expect(page.getByTestId("shortfall-ticker")).toBeVisible();
    await expect(page.getByTestId("shortfall-floor")).toHaveText(formatUsd(FLOOR_USD));
    await expect(page.getByTestId("shortfall-goal")).toHaveText(formatUsd(GOAL_USD));
    await expect(page.getByTestId("open-seats")).toHaveText(`12 of ${PANELS.length}`);
    await expect(page.getByTestId("floor-progress-copy")).toHaveText("0% of floor");
    await expect(page.getByTestId("goal-progress-copy")).toHaveText("0% of buyout");
    await expect(page.getByTestId("visual-vault")).toBeVisible();
    await expect(page.getByTestId("vault-marker-floor")).toBeVisible();
    await expect(page.getByTestId("vault-marker-goal")).toBeVisible();
    await expect(page.getByTestId("vault-floor-label")).toHaveText(
      `Floor ${formatUsd(FLOOR_USD)}`,
    );
    await expect(page.getByTestId("vault-goal-label")).toHaveText(
      `Buyout ${formatUsd(GOAL_USD)}`,
    );

    await expect(page.getByTestId("wreck-refund-rules")).toBeVisible();
    await expect(page.getByTestId("wreck-title-campaign-miss")).toHaveText(
      "Campaign miss",
    );
    await expect(page.getByTestId("wreck-body-campaign-miss")).toContainText(
      "full refund",
    );
    await expect(page.getByTestId("wreck-body-wrap-pro-rata")).toContainText(
      "pro-rata",
    );
    await expect(page.getByTestId("wreck-body-immortal-fragment")).toContainText(
      "vault certificate",
    );
    await expect(page.getByTestId("vault-certificate")).toBeVisible();
    await expect(page.getByTestId("vault-certificate-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("vault-certificate-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("vault-cert-buyout-unlock")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("vault-cert-not-cash")).toContainText(
      "Not a cash refund",
    );
    await expect(page.getByTestId("vault-cert-floor-miss")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("retired-vinyl")).toBeVisible();
    await expect(page.getByTestId("retired-vinyl-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("retired-vinyl-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("retired-vinyl-wrap-term")).toContainText(
      "12 months from install",
    );
    await expect(page.getByTestId("retired-vinyl-not-cash")).toContainText(
      "No livestream",
    );
    await expect(page.getByTestId("retired-vinyl-floor-miss")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("season-two")).toBeVisible();
    await expect(page.getByTestId("season-two-lead")).toContainText("$58,000");
    await expect(page.getByTestId("season-two-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("season-two-lead")).toContainText(
      "not a gift",
    );
    await expect(page.getByTestId("season-two-new-buy")).toContainText(
      "new buy",
    );
    await expect(page.getByTestId("season-two-no-first-refusal")).toContainText(
      "not sold",
    );
    await expect(page.getByTestId("rain-night-lighting")).toBeVisible();
    await expect(page.getByTestId("rain-night-lighting-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("rain-night-lighting-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("rain-night-lighting-lead")).toContainText(
      "Not a livestream",
    );
    await expect(
      page.getByTestId("rain-night-lighting-buyout-unlock"),
    ).toContainText("$120,000");
    await expect(
      page.getByTestId("rain-night-lighting-no-livestream"),
    ).toContainText("Not a close clock");
    await expect(page.getByTestId("rain-night-lighting-floor-miss")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("truck-order-tracker")).toBeVisible();
    await expect(page.getByTestId("truck-order-tracker-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("truck-order-tracker-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("truck-order-tracker-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("truck-order-tracker-floor-unlock"),
    ).toContainText("$58,000");
    await expect(page.getByTestId("truck-order-tracker-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("truck-order-tracker-buyout-context"),
    ).toContainText("$120,000");
    await expect(page.getByTestId("weekly-mileage-ledger")).toBeVisible();
    await expect(page.getByTestId("weekly-mileage-ledger-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("weekly-mileage-ledger-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("weekly-mileage-ledger-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("weekly-mileage-ledger-empty-until-truck"),
    ).toContainText("No invented weekly miles");
    await expect(page.getByTestId("weekly-mileage-ledger-empty")).toContainText(
      "No weekly rows yet",
    );
    await expect(page.getByTestId("weekly-mileage-ledger-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("landmark-proof-log")).toBeVisible();
    await expect(page.getByTestId("landmark-proof-log-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("landmark-proof-log-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("landmark-proof-log-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("landmark-proof-log-empty-until-truck"),
    ).toContainText("No invented landmark visits");
    await expect(page.getByTestId("landmark-proof-log-empty")).toContainText(
      "No landmark proofs yet",
    );
    await expect(page.getByTestId("landmark-proof-log-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("city-time-heatmap")).toBeVisible();
    await expect(page.getByTestId("city-time-heatmap-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("city-time-heatmap-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("city-time-heatmap-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("city-time-heatmap-empty-until-truck"),
    ).toContainText("No invented city dwell");
    await expect(page.getByTestId("city-time-heatmap-empty")).toContainText(
      "No city heat yet",
    );
    await expect(page.getByTestId("city-time-heatmap-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("qr-nfc-scan-counter")).toBeVisible();
    await expect(page.getByTestId("qr-nfc-scan-counter-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("qr-nfc-scan-counter-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("qr-nfc-scan-counter-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("qr-nfc-scan-counter-empty-until-truck"),
    ).toContainText("No invented scan counts");
    await expect(page.getByTestId("qr-nfc-scan-counter-empty")).toContainText(
      "No scans yet",
    );
    await expect(page.getByTestId("qr-nfc-scan-counter-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("city-ping-winner")).toBeVisible();
    await expect(page.getByTestId("city-ping-winner-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("city-ping-winner-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("city-ping-winner-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("city-ping-winner-empty-until-truck"),
    ).toContainText("No invented city pings");
    await expect(page.getByTestId("city-ping-winner-empty")).toContainText(
      "No city pings yet",
    );
    await expect(page.getByTestId("city-ping-winner-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("charge-stop-slots")).toBeVisible();
    await expect(page.getByTestId("charge-stop-slots-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("charge-stop-slots-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("charge-stop-slots-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("charge-stop-slots-empty-until-truck"),
    ).toContainText("No invented takeover prices");
    await expect(page.getByTestId("charge-stop-slots-empty")).toContainText(
      "No charge-stop slots yet",
    );
    await expect(page.getByTestId("charge-stop-slots-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("route-detour-buyout")).toBeVisible();
    await expect(page.getByTestId("route-detour-buyout-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("route-detour-buyout-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("route-detour-buyout-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("route-detour-buyout-empty-until-truck"),
    ).toContainText("No invented buyout prices");
    await expect(page.getByTestId("route-detour-buyout-empty")).toContainText(
      "No route detours yet",
    );
    await expect(page.getByTestId("route-detour-buyout-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("clemson-saturday-lock")).toBeVisible();
    await expect(page.getByTestId("clemson-saturday-lock-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("clemson-saturday-lock-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("clemson-saturday-lock-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("clemson-saturday-lock-empty-until-truck"),
    ).toContainText("No invented lock fee");
    await expect(page.getByTestId("clemson-saturday-lock-empty")).toContainText(
      "No Saturday lock yet",
    );
    await expect(page.getByTestId("clemson-saturday-lock-no-vin")).toContainText(
      "No reserved VIN",
    );
    await expect(page.getByTestId("sighting-bounty-cards")).toBeVisible();
    await expect(page.getByTestId("sighting-bounty-cards-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("sighting-bounty-cards-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("sighting-bounty-cards-lead")).toContainText(
      "No reserved VIN",
    );
    await expect(
      page.getByTestId("sighting-bounty-cards-empty-until-truck"),
    ).toContainText("No invented bounty dollars");
    await expect(page.getByTestId("sighting-bounty-cards-empty")).toContainText(
      "No bounty cards yet",
    );
    await expect(page.getByTestId("sighting-bounty-cards-no-vin")).toContainText(
      "No reserved VIN",
    );

    await expect(page.getByTestId("raised-hint")).toContainText(
      "Under the floor: full refund.",
    );

    await expect(page.getByTestId("raised-hint")).toContainText("not charged");
    await expect(page.getByTestId("floor-hint")).toHaveText(
      "Order the Cyberbeast. Fund the wrap.",
    );
    await expect(page.getByTestId("goal-hint")).toHaveText(
      "Campaign buys the truck. Etch unlocks.",
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
          "Etch at $120k",
        );
      } else {
        await expect(card).toHaveAttribute("data-etchable", "false");
        await expect(card.getByText("Wrap", { exact: true })).toBeVisible();
      }
    }
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
    expect(lower).not.toContain("money path");
    expect(html).not.toContain("Close date unset");
    expect(lower).not.toContain("soft auction");
    expect(html).not.toContain("Opening marks");
    expect(html).not.toMatch(/etch locked under/i);
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toContain("30-day clock");
    expect(html).not.toContain("FEATURES.md");
  });

  test("shows the full BrandMyBeast hero title without clipping", async ({
    page,
  }) => {
    await page.goto("/");
    await expectHeroTitleUnclipped(page);
  });

  test("shows the full BrandMyBeast hero title on a 375px viewport", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/");
    await expectHeroTitleUnclipped(page);
  });

  test("shows the full BrandMyBeast hero title on a 900px viewport", async ({
    page,
  }) => {
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
    await page.getByTestId("waitlist-email").fill(email);

    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/waitlist") && res.request().method() === "POST",
      ),
      page.getByTestId("waitlist-submit").click(),
    ]);

    expect(response.status()).toBe(200);
    await expect(page.getByTestId("waitlist-status")).toContainText(
      "already on the list",
    );
    await expect(page.getByTestId("waitlist-next")).toBeVisible();
    await expect(page.getByTestId("waitlist-browse-panels")).toHaveAttribute(
      "href",
      "/#panels",
    );
    await expect(page.getByTestId("waitlist-signin-intent")).toHaveAttribute(
      "href",
      "/signin?callbackUrl=/panels/hood",
    );
    await expect(page.getByTestId("waitlist-next")).toContainText(
      "no Stripe capture",
    );
  });

  test("cabin plaque reserves a name without a bid or charge", async ({
    page,
    request,
  }) => {
    const name = `Plaque ${Date.now()}`;
    await page.goto("/");
    await expect(page.getByTestId("cabin-plaque")).toBeVisible();
    await expect(page.getByTestId("cabin-plaque-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("cabin-plaque-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("cabin-plaque-lead")).toContainText(
      "Not a panel seat",
    );

    const created = await request.post("/api/plaque", {
      data: { name },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      status: "created",
      name,
    });

    const again = await request.post("/api/plaque", {
      data: { name },
    });
    expect(again.status()).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, status: "exists" });

    await page.goto("/");
    await expect(page.getByTestId("cabin-plaque-list")).toContainText(name);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
  });

  test("circuit story request saves without tweet or impressions", async ({
    page,
    request,
  }) => {
    const email = `circuit-${Date.now()}@example.com`;
    await page.goto("/");
    await expect(page.getByTestId("circuit-story")).toBeVisible();
    await expect(page.getByTestId("circuit-story-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("circuit-story-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("circuit-story-lead")).toContainText(
      "No invented impressions",
    );

    const created = await request.post("/api/circuit-story", {
      data: { email, corridorId: "charlotte", note: "Proof after install" },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      status: "created",
      corridorId: "charlotte",
    });

    const again = await request.post("/api/circuit-story", {
      data: { email, corridorId: "charlotte" },
    });
    expect(again.status()).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, status: "exists" });

    await page.goto("/");
    await expect(page.getByTestId("circuit-story-list")).toContainText(
      "Charlotte",
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toMatch(/\b\d+\s*impressions\b/i);
  });

  test("public sighting board posts without bounty or impressions", async ({
    page,
    request,
  }) => {
    const note = `Grocery lot wrap ${Date.now()}`;
    await page.goto("/");
    await expect(page.getByTestId("sightings")).toBeVisible();
    await expect(page.getByTestId("sighting-lead")).toContainText("$58,000");
    await expect(page.getByTestId("sighting-lead")).toContainText("$120,000");
    await expect(page.getByTestId("sighting-lead")).toContainText("No bounty");

    const created = await request.post("/api/sighting", {
      data: { corridorId: "atlanta", note },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      status: "created",
      corridorId: "atlanta",
      note,
    });

    const again = await request.post("/api/sighting", {
      data: { corridorId: "atlanta", note },
    });
    expect(again.status()).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, status: "exists" });

    await page.goto("/");
    await expect(page.getByTestId("sighting-list")).toContainText("Atlanta");
    await expect(page.getByTestId("sighting-list")).toContainText(note);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toMatch(/\b\d+\s*impressions\b/i);
  });

  test("event request calendar saves without livestream or close clock", async ({
    page,
    request,
  }) => {
    const email = `event-${Date.now()}@example.com`;
    await page.goto("/");
    await expect(page.getByTestId("event-calendar")).toBeVisible();
    await expect(page.getByTestId("event-calendar-lead")).toContainText(
      "$58,000",
    );
    await expect(page.getByTestId("event-calendar-lead")).toContainText(
      "$120,000",
    );
    await expect(page.getByTestId("event-calendar-lead")).toContainText(
      "No livestream",
    );
    await expect(page.getByTestId("event-calendar-lead")).toContainText(
      "No reserved VIN",
    );

    const created = await request.post("/api/event-request", {
      data: {
        email,
        kindId: "campus",
        requestedDate: "2026-11-07",
        note: "After install",
      },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toMatchObject({
      ok: true,
      status: "created",
      kindId: "campus",
    });

    const again = await request.post("/api/event-request", {
      data: { email, kindId: "campus" },
    });
    expect(again.status()).toBe(200);
    expect(await again.json()).toMatchObject({ ok: true, status: "exists" });

    await page.goto("/");
    await expect(page.getByTestId("event-calendar-list")).toContainText(
      "Campus",
    );
    await expect(page.getByTestId("event-calendar-list")).toContainText(
      "2026-11-07",
    );
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("FEATURES.md");
    expect(html).not.toContain("South Carolina home loop");
    expect(html).not.toContain("Florida panhandle");
    expect(html).not.toMatch(/\b\d+\s*impressions\b/i);
  });

  test("event request form posts a new campus stop", async ({ page }) => {
    const email = `event-form-${Date.now()}@example.com`;
    await page.goto("/");
    await page.getByTestId("event-calendar-email").fill(email);
    await page.getByTestId("event-calendar-kind-campus").check();
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/event-request") &&
          res.request().method() === "POST",
      ),
      page.getByTestId("event-calendar-submit").click(),
    ]);
    expect(response.status()).toBe(201);
    await expect(page.getByTestId("event-calendar-status")).toContainText(
      "Event request saved",
    );
  });

  test("sighting form posts a new corridor note", async ({ page }) => {
    const note = `Form wrap ${Date.now()}`;
    await page.goto("/");
    await page.getByTestId("sighting-corridor-i77").check();
    await page.getByTestId("sighting-note").fill(note);
    const [response] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/sighting") &&
          res.request().method() === "POST",
      ),
      page.getByTestId("sighting-submit").click(),
    ]);
    expect(response.status()).toBe(201);
    await expect(page.getByTestId("sighting-status")).toContainText(
      "Sighting posted",
    );
  });
});
