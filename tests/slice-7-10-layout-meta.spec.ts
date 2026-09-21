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
 * Slice 7.10 — layout.tsx title + description match PUBLIC_COPY meta.
 * Assert rendered HTML from the app under test — not the live tab.
 */
test.describe("slice 7.10: layout meta matches PUBLIC_COPY", () => {
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

  test("PUBLIC_COPY.meta matches the locked PUBLIC_COPY.md strings", () => {
    expect(PUBLIC_COPY.meta.title).toBe(
      "BrandMyBeast — Advertise your brand on the truck that people already photograph",
    );
    expect(PUBLIC_COPY.meta.title).not.toMatch(/advertise on a Cybertruck/i);
    expect(PUBLIC_COPY.meta.description).toBe(
      "Eleven companies. One Cyberbeast. Join the list. Hit $58,000 and the truck is ordered and wrapped for a year. Miss it and nobody pays.",
    );
    expect(PUBLIC_COPY.meta.description).not.toMatch(/Bid on a panel/);
  });

  test("layout.tsx wires title and description from PUBLIC_COPY.meta", () => {
    const src = readFileSync(
      join(process.cwd(), "src/app/layout.tsx"),
      "utf8",
    );
    expect(src).toContain("title: PUBLIC_COPY.meta.title");
    expect(src).toContain("description: PUBLIC_COPY.meta.description");
    expect(src).not.toMatch(/title:\s*["']BrandMyBeast["']/);
  });

  test("homepage document title and meta description match PUBLIC_COPY", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveTitle(PUBLIC_COPY.meta.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      "content",
      PUBLIC_COPY.meta.description,
    );
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
  });
});
