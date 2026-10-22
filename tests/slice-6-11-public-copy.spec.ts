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

test.describe("slice 6.11: homepage matches PUBLIC_COPY H1 and Notify me", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(35_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBe("2026-12-31T17:00:00.000Z");
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$35,000");
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
    expect(names.some((name) => name !== "stripe" && name.toLowerCase().includes("stripe"))).toBe(
      false,
    );
  });

  test("PUBLIC_COPY module still holds locked H1 and Notify me", () => {
    expect(PUBLIC_COPY.hero.h1).toBe(
      "Advertise your brand on the truck that people already photograph",
    );
    expect(PUBLIC_COPY.waitlist.button).toBe("Send");
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
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Send");

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
