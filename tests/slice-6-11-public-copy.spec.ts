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
 * Slice 6.11 — Wave 6 gate that `/` still matches PUBLIC_COPY.md H1 + Notify me.
 * Do not rewrite the rewrite. Copy ownership stays with 0.9 / PUBLIC_COPY.md.
 */
test.describe("slice 6.11: homepage matches PUBLIC_COPY H1 and Notify me", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
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

  test("PUBLIC_COPY module still holds locked H1 and Notify me", () => {
    expect(PUBLIC_COPY.hero.h1).toBe(
      "Advertise your brand on the truck that people already photograph",
    );
    expect(PUBLIC_COPY.waitlist.button).toBe("Contact BMB");
  });

  test("homepage renders locked H1 and Notify me verbatim", async ({ page }) => {
    await page.goto("/");

    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.locator("#hero-title")).toHaveText(
      "Advertise your brand on the truck that people already photograph",
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");

    const html = (await page.content()).toLowerCase();
    expect(html).toContain(
      "advertise your brand on the truck that people already photograph",
    );
    expect(html).toContain("contact bmb");
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
  });
});
