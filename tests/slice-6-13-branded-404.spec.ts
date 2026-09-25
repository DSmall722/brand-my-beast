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
 * Slice 6.13 — branded 404.
 * Dark stainless chrome, wordmark, one line, Back to the board + Get on the list.
 */
test.describe("slice 6.13: branded 404", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe / gsap / three / lenis", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const names = [
      ...Object.keys(pkg.dependencies ?? {}),
      ...Object.keys(pkg.devDependencies ?? {}),
    ].map((name) => name.toLowerCase());
    expect(names.some((name) => name.includes("stripe"))).toBe(false);
    expect(names.some((name) => name.includes("gsap"))).toBe(false);
    expect(names.some((name) => name === "three")).toBe(false);
    expect(names.some((name) => name.includes("@react-three"))).toBe(false);
    expect(names.some((name) => name === "lenis")).toBe(false);
  });

  test("unknown route returns 404 with branded links and footer", async ({
    page,
  }) => {
    const response = await page.goto("/this-is-not-a-panel-route");
    expect(response?.status()).toBe(404);

    await expect(page.getByTestId("brand-wordmark")).toHaveText(BRAND.name);
    await expect(page.getByTestId("not-found-title")).toHaveText(
      "This page is not a panel.",
    );

    const home = page.getByTestId("not-found-home");
    await expect(home).toHaveText(PUBLIC_COPY.chrome.backToBoard);
    await expect(home).toHaveText("Back to the board");
    await expect(home).toHaveAttribute("href", "/");

    const waitlist = page.getByTestId("not-found-waitlist");
    await expect(waitlist).toHaveText(PUBLIC_COPY.hero.primaryCta);
    await expect(waitlist).toHaveText("Get on the list");
    await expect(waitlist).toHaveAttribute("href", "/#contactus");

    await expect(page.getByTestId("not-found-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    await expect(page.getByTestId("not-found-footer-independent")).toHaveCount(0);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
    expect(html).not.toMatch(/\bstreet\b/);
  });
});
