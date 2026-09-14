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
    await expect(page.getByTestId("raised-hint")).toHaveText(
      "Under the floor: full refund.",
    );
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
});
