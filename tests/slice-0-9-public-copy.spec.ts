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
 * Slice 0.9 — homepage strings match PUBLIC_COPY.md v2 verbatim.
 * Do not rewrite the rewrite.
 */
test.describe("slice 0.9: PUBLIC_COPY v2 on /", () => {
  test("money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
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

  test("PUBLIC_COPY module matches locked H1, lead, and Notify me", () => {
    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(PUBLIC_COPY.hero.h1).toBe(
      "Put your brand on the truck people already photograph.",
    );
    expect(PUBLIC_COPY.hero.lead).toBe("concept photo");
    expect(PUBLIC_COPY.hero.caption).toBe("concept photo");
    expect(md).toContain("- Lead: `concept photo`");
    expect(md).toContain("- Hero caption: `concept photo`");
    expect(md).not.toMatch(/- Lead: `Concept preview`/);
    expect(PUBLIC_COPY.waitlist.button).toBe("Contact BMB");
    expect(PUBLIC_COPY.board.raisedLabel.toLowerCase()).not.toContain(
      "pledged intent",
    );
    expect(PUBLIC_COPY.board.raisedHint.toLowerCase()).not.toMatch(/\bp3\b/);
    expect(PUBLIC_COPY.etch.whyBuyout.toLowerCase()).not.toMatch(
      /operator[- ]financ/,
    );
    const blob = JSON.stringify(PUBLIC_COPY).toLowerCase();
    expect(blob).not.toMatch(/\blease\b/);
    expect(blob).not.toContain("close_at");
  });

  test("homepage renders locked H1, Notify me, no lease / P3 / close date", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.locator(".hero-lead")).toHaveText(PUBLIC_COPY.hero.lead);
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("floor-amount")).toHaveText(
      formatUsd(FLOOR_USD),
    );
    await expect(page.getByTestId("goal-amount")).toHaveText(
      formatUsd(GOAL_USD),
    );
    await expect(page.getByTestId("raised-label")).toHaveText(
      PUBLIC_COPY.board.raisedLabel,
    );

    const html = await page.content();
    const lower = html.toLowerCase();
    expect(lower).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(lower).not.toMatch(/\bp3\b/);
    expect(lower).not.toMatch(/pledged intent/);
    expect(lower).not.toMatch(/operator[- ]financ/);
    expect(html).toContain(PUBLIC_COPY.hero.h1);
    expect(html).toContain("concept photo");
    expect(html).toContain("Contact BMB");
  });
});
