import { readFileSync, readdirSync } from "node:fs";
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
 * Slice 7.1 — split src/app/page.tsx into section components.
 * Visible strings stay in PUBLIC_COPY. Do not change H1, lead, money, or add sections.
 */
test.describe("slice 7.1: page section components", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
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

  test("home section components exist and page composes them", () => {
    const homeDir = join(process.cwd(), "src/components/home");
    const files = readdirSync(homeDir).filter((f) => f.endsWith(".tsx"));
    expect(files.length).toBeGreaterThanOrEqual(12);

    const pageSrc = readFileSync(
      join(process.cwd(), "src/app/page.tsx"),
      "utf8",
    );
    expect(pageSrc).toContain('from "@/components/home/HomeHeroSection"');
    expect(pageSrc).toContain('from "@/components/home/HomeMoneySection"');
    expect(pageSrc).toContain('from "@/components/home/HomePanelsSection"');
    expect(pageSrc).toContain('from "@/components/home/HomeWaitlistSection"');
    expect(pageSrc).toContain("<HomeHeroSection");
    expect(pageSrc).toContain("<HomeWaitlistSection");
    // Mechanical split — page must not inline the hero H1 markup.
    expect(pageSrc).not.toMatch(/<h1 id="hero-title"/);
  });

  test("homepage keeps H1 from 0.9, Notify me, no lease / personal handle", async ({
    page,
  }) => {
    await page.goto("/");

    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    expect(PUBLIC_COPY.hero.h1).toBe(
      "Put your brand on the truck people already photograph.",
    );
    await expect(page.locator(".hero-lead")).toHaveText(PUBLIC_COPY.hero.lead);
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    expect(PUBLIC_COPY.waitlist.button).toBe("Contact BMB");
    await expect(page.getByTestId("floor-amount")).toHaveText(
      formatUsd(FLOOR_USD),
    );
    await expect(page.getByTestId("goal-amount")).toHaveText(
      formatUsd(GOAL_USD),
    );
    await expect(page.getByTestId("brand-wordmark")).toHaveText(
      PUBLIC_COPY.header.wordmark,
    );

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
    expect(html).not.toMatch(/\b(avenue|street|boulevard|road)\b/);
  });
});
