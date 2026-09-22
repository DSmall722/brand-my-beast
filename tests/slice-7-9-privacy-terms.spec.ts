import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 7.9 — /privacy and /terms stubs from CAMPAIGN + PUBLIC_COPY only.
 * Footer links them. No invented legal terms.
 */
test.describe("slice 7.9: privacy and terms stubs", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ];
    expect(names.some((name) => name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("footer links privacy and terms; keeps PUBLIC_COPY strings", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("site-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    await expect(page.getByTestId("site-footer-independent")).toHaveCount(0);
    await expect(page.getByTestId("footer-privacy-link")).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(page.getByTestId("footer-terms-link")).toHaveAttribute(
      "href",
      "/terms",
    );
  });

  test("privacy stub uses hello@ and PUBLIC_COPY lines only", async ({
    page,
  }) => {
    await page.goto("/privacy");
    await expect(page.getByTestId("privacy-page")).toBeVisible();
    await expect(page.getByTestId("privacy-contact")).toContainText(
      BRAND.email,
    );
    await expect(page.getByTestId("privacy-waitlist")).toContainText(
      PUBLIC_COPY.waitlist.idleNote,
    );
    // Slice 13.39 — waitlist retention locked on the privacy stub.
    await expect(page.getByTestId("privacy-waitlist-retention")).toHaveText(
      PUBLIC_COPY.waitlist.retention,
    );
    await expect(page.getByTestId("privacy-independent")).toContainText(
      PUBLIC_COPY.footer.independent,
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
    expect(html).not.toMatch(/gdpr|ccpa|liability|indemnif|arbitration/);
  });

  test("terms page renders approved sections", async ({ page }) => {
    await page.goto("/terms");
    await expect(page.getByTestId("terms-page")).toBeVisible();
    await expect(
      page.getByRole("heading", { level: 1, name: "Terms of Use" }),
    ).toBeVisible();
    await expect(page.getByTestId("terms-intro")).toHaveText(
      `${BRAND.name} ("we," "us") operates ${BRAND.domain}. By using the site, joining the waitlist, creating an account, or placing a bid, you agree to these terms.`,
    );
    await expect(page.getByTestId("terms-product")).toHaveText(
      `${BRAND.name} auctions advertising inventory on panels of a Tesla Cybertruck (the "Beast"). Inventory may be vinyl wrap, Immortal Etch, or both, as shown for each seat. Buying a seat buys display space on the vehicle under the rules for that seat. It does not buy the truck, a share of the truck, or a guarantee of views, clicks, sales, or media coverage.`,
    );
    await expect(page.getByTestId("terms-eligibility")).toHaveText(
      "You must be at least 18 and able to form a binding contract. You are responsible for activity under your account. Attempts to manipulate the auction are not allowed.",
    );
    await expect(page.getByTestId("terms-bids")).toHaveText(
      'Opening prices and buyout levels are shown on the board. Displayed "Current Bid" amounts are opening prices until a live bid is placed on that seat. A bid you place is an offer to buy that seat at that price. If you win, you owe the winning amount (or the buyout amount, if you buy out) under the payment instructions we send. Deposits shown on the board apply toward the balance when you win. If you win and do not pay the remaining balance as required, your deposit is non-refundable and the seat passes to the next highest bidder under the same payment rules. We may also reject or cancel a win for prohibited content or fraud.',
    );
    await expect(page.getByTestId("terms-artwork")).toHaveText(
      "You must submit creative that you have the right to use. We may approve, reject, or require changes for fit, safety, legality, or brand standards. Banned or restricted categories (including illegal products, hate, and content we reasonably refuse) will not run. Approved artwork may be installed as wrap and/or etch per the seat. Vinyl wrap duration after installation is as stated on the seat or campaign materials. Immortal Etch unlocks only under the published etch rules and price thresholds.",
    );
    await expect(page.getByTestId("terms-role")).toHaveText(
      "We run the board, collect payment as described, and coordinate install on the Beast. Schedules can slip for weather, shop capacity, vehicle availability, or artwork delays. We are not liable for lost business, reputational harm, or expected marketing results tied to the campaign.",
    );
    await expect(page.getByTestId("terms-marks")).toHaveText(
      `You keep ownership of your logos and creative. You grant us a license to display them on the Beast and to show them on the site and in campaign materials. ${BRAND.name} names and marks stay ours. Do not imply endorsement beyond the paid display.`,
    );
    await expect(page.getByTestId("terms-privacy")).toHaveText(
      "How we handle personal data is in the Privacy policy at /privacy.",
    );
    await expect(page.getByTestId("terms-privacy").locator("a")).toHaveAttribute(
      "href",
      "/privacy",
    );
    await expect(page.getByTestId("terms-changes")).toHaveText(
      `We may update these terms by posting a new version on this page. Continued use after a post means you accept the update. Questions: ${BRAND.email}.`,
    );
    await expect(page.getByTestId("terms-contact")).toHaveAttribute(
      "href",
      `mailto:${BRAND.email}`,
    );
    await expect(page.getByTestId("terms-law")).toHaveText(
      "These terms are governed by the laws of the State of South Carolina, without regard to conflict-of-law rules. Venue for disputes is the state or federal courts serving Columbia, South Carolina, unless applicable law requires otherwise.",
    );
    for (const heading of [
      "The product",
      "Eligibility",
      "Bids and payment",
      "Artwork",
      "Our role",
      "Your content and our marks",
      "Privacy",
      "Changes and contact",
      "Governing law",
    ]) {
      await expect(page.getByRole("heading", { level: 2, name: heading })).toBeVisible();
    }
    const text = await page.locator("main").innerText();
    expect(text).not.toContain("\u2014");
    expect(text).not.toContain("\u2013");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("gmail.com");
  });
});
