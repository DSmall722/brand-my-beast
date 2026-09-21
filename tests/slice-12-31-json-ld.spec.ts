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
import {
  buildHomeJsonLd,
  homeJsonLdIsSafe,
} from "../src/lib/home-json-ld";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 12.31 — JSON-LD Organization + Offer on `/` from PUBLIC_COPY.
 * No impression claims. CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.31: homepage JSON-LD Organization + Offer", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
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

  test("unit: graph is Organization + Offer from PUBLIC_COPY", () => {
    const graph = buildHomeJsonLd();
    expect(homeJsonLdIsSafe(graph)).toBe(true);
    expect(graph["@context"]).toBe("https://schema.org");
    const [org, offer] = graph["@graph"];
    expect(org?.["@type"]).toBe("Organization");
    expect(org?.name).toBe(BRAND.name);
    expect(org?.email).toBe(BRAND.email);
    expect(org?.description).toBe(PUBLIC_COPY.meta.description);
    expect(offer?.["@type"]).toBe("Offer");
    expect(offer?.name).toBe(PUBLIC_COPY.meta.title);
    expect(offer?.description).toBe(PUBLIC_COPY.hero.h1);
    expect(offer?.price).toBe(String(FLOOR_USD));
    const raw = JSON.stringify(graph).toLowerCase();
    expect(raw).not.toMatch(/\bimpression/);
    expect(raw).not.toMatch(/\bcpm\b/);
    expect(raw).not.toMatch(/\blease\b/);
  });

  test("homepage ships application/ld+json with Organization and Offer", async ({
    page,
  }) => {
    await page.goto("/");
    const script = page.getByTestId("home-json-ld");
    await expect(script).toHaveAttribute("type", "application/ld+json");
    const raw = await script.textContent();
    expect(raw).toBeTruthy();
    const parsed = JSON.parse(raw ?? "{}") as ReturnType<typeof buildHomeJsonLd>;
    expect(homeJsonLdIsSafe(parsed)).toBe(true);
    expect(parsed["@graph"][0]?.["@type"]).toBe("Organization");
    expect(parsed["@graph"][1]?.["@type"]).toBe("Offer");
    expect(parsed["@graph"][0]?.description).toBe(PUBLIC_COPY.meta.description);
    expect(parsed["@graph"][1]?.description).toBe(PUBLIC_COPY.hero.h1);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
