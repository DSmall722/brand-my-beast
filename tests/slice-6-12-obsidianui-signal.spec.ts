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
 * Slice 6.12 — ObsidianUI arrow-fill on hero primary CTA only.
 * Does not rewrite PUBLIC_COPY. Waitlist submit stays Notify me.
 */
test.describe("slice 6.12: obsidianui signal button", () => {
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
    expect(names.some((name) => name === "gsap" || name.includes("gsap"))).toBe(
      false,
    );
    expect(names.some((name) => name === "three")).toBe(false);
    expect(names.some((name) => name.includes("@react-three"))).toBe(false);
    expect(names.some((name) => name === "lenis")).toBe(false);
  });

  test("hero primary CTA is arrow-fill link; H1 and Notify me unchanged", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");

    const cta = page.getByTestId("hero-primary-cta");
    await expect(cta).toBeVisible();
    // Fill layer duplicates the label for the animation; assert the visible span.
    await expect(cta.locator(".obsidian-arrow-fill-btn__text")).toHaveText(
      PUBLIC_COPY.hero.primaryCta,
    );
    await expect(cta).toHaveAttribute("href", "#waitlist");
    await expect(cta).toHaveClass(/obsidian-arrow-fill-btn/);

    await expect(
      page.getByRole("link", { name: PUBLIC_COPY.hero.primaryCta }),
    ).toHaveAttribute("href", "#waitlist");

    const tag = await cta.evaluate((el) => el.tagName.toLowerCase());
    expect(tag).toBe("a");

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
  });
});
