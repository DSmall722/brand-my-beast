import { expect, test } from "@playwright/test";
import { CLAIM_COPY } from "../src/lib/panel-claim";

test.describe("bmb-panel-claim-price e2e", () => {
  test.afterEach(async ({ request }) => {
    await request.post("/api/test/panel-claim", { data: { reset: true } });
    await request.post("/api/test/campaign-clock", { data: { reset: true } });
  });

  test("available / withdrawn / claimed panel states", async ({
    page,
    request,
  }) => {
    await request.post("/api/test/campaign-clock", {
      data: { live: true, now: "2026-10-07T16:00:00.000Z" },
    });

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-claim")).toHaveAttribute(
      "data-claim-state",
      "available",
    );
    await expect(page.getByTestId("panel-claim-heading")).toHaveText(
      CLAIM_COPY.availableHeading("Hood", 13_000),
    );
    await expect(page.getByTestId("panel-claim-cta")).toHaveText(
      CLAIM_COPY.availableCta,
    );
    await expect(page.getByTestId("whole-truck-buyout")).toBeVisible();

    await request.post("/api/test/panel-claim", {
      data: { panelId: "hood", claimStatus: "withdrawn" },
    });
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-claim")).toHaveAttribute(
      "data-claim-state",
      "withdrawn",
    );
    await expect(page.getByTestId("panel-claim-withdrawn")).toHaveText(
      CLAIM_COPY.withdrawn,
    );

    await request.post("/api/test/panel-claim", {
      data: { panelId: "hood", claimStatus: "claimed", claimedBrand: "Acme" },
    });
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-claim")).toHaveAttribute(
      "data-claim-state",
      "claimed",
    );
    await expect(page.getByTestId("panel-claim-claimed")).toContainText(
      "This panel is no longer taking bids",
    );
  });

  test("purchase banner and buyout hidden after lock", async ({
    page,
    request,
  }) => {
    await request.post("/api/test/campaign-clock", {
      data: { live: true, now: "2026-10-07T16:00:00.000Z" },
    });
    await request.post("/api/test/panel-claim", {
      data: { tierLocked: "purchase" },
    });
    await page.goto("/");
    await expect(page.getByTestId("purchase-lock-banner")).toHaveText(
      CLAIM_COPY.purchaseBanner,
    );
    await page.goto("/panels/hood");
    await expect(page.getByTestId("whole-truck-buyout")).toHaveCount(0);
  });
});
