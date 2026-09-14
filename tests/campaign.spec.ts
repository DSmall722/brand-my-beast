import { expect, test } from "@playwright/test";
import {
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "../src/lib/campaign";

test.describe("P1 waitlist campaign locks", () => {
  test("renders brand, floor, buyout, and unset close date", async ({
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
    await expect(page.getByTestId("close-copy")).toContainText(
      "Close date unset",
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
        await expect(page.getByTestId(`etch-lock-${panel.id}`)).toContainText(
          "Etch locked",
        );
      } else {
        await expect(card).toHaveAttribute("data-etchable", "false");
        await expect(card.getByText("Wrap only")).toBeVisible();
      }
    }
  });

  test("keeps banned identity and lease language out of the HTML", async ({
    page,
  }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html.toLowerCase()).not.toContain("gmail.com");
    expect(html).toContain("@BrandMyBeast");
    expect(html).toContain("hello@brandmybeast.com");
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
  });
});
