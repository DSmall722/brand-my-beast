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
import { cabinPlaqueStoreUsesMemory } from "../src/lib/cabin-plaque-store";
import { circuitStoryStoreUsesMemory } from "../src/lib/circuit-story-store";
import { contentRightsStoreUsesMemory } from "../src/lib/content-rights-store";
import { leftoverStoreUsesMemory } from "../src/lib/leftover-store-mode";
import { sightingStoreUsesMemory } from "../src/lib/sighting-store";

/**
 * Slice 7.4 — leftover plaque / sighting / circuit / content-rights stores
 * never use in-memory Maps in Production (same rule as 6.7).
 */
test.describe("slice 7.4: no leftover memory stores in Production", () => {
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

  test("Production never uses leftover memory stores", () => {
    const prodVercel = { VERCEL_ENV: "production" };
    const prodNode = { NODE_ENV: "production" };
    const misSet = {
      VERCEL_ENV: "production",
      LEFTOVER_STORE_MODE: "memory",
    };

    expect(leftoverStoreUsesMemory(prodVercel)).toBe(false);
    expect(leftoverStoreUsesMemory(prodNode)).toBe(false);
    expect(leftoverStoreUsesMemory(misSet)).toBe(false);

    expect(cabinPlaqueStoreUsesMemory(prodVercel)).toBe(false);
    expect(sightingStoreUsesMemory(prodVercel)).toBe(false);
    expect(circuitStoryStoreUsesMemory(prodVercel)).toBe(false);
    expect(contentRightsStoreUsesMemory(prodVercel)).toBe(false);

    expect(cabinPlaqueStoreUsesMemory(prodNode)).toBe(false);
    expect(sightingStoreUsesMemory(prodNode)).toBe(false);
    expect(circuitStoryStoreUsesMemory(prodNode)).toBe(false);
    expect(contentRightsStoreUsesMemory(prodNode)).toBe(false);
  });

  test("CI / local still allows leftover memory stores", () => {
    expect(leftoverStoreUsesMemory({})).toBe(true);
    expect(leftoverStoreUsesMemory({ LEFTOVER_STORE_MODE: "memory" })).toBe(
      true,
    );
    expect(leftoverStoreUsesMemory({ NODE_ENV: "test" })).toBe(true);
    expect(leftoverStoreUsesMemory({ VERCEL_ENV: "preview" })).toBe(true);
    expect(leftoverStoreUsesMemory({ LEFTOVER_STORE_MODE: "off" })).toBe(false);

    expect(cabinPlaqueStoreUsesMemory({})).toBe(true);
    expect(sightingStoreUsesMemory({})).toBe(true);
    expect(circuitStoryStoreUsesMemory({})).toBe(true);
    expect(contentRightsStoreUsesMemory({})).toBe(true);
  });

  test("four leftover store modules call leftoverStoreUsesMemory", () => {
    for (const rel of [
      "src/lib/cabin-plaque-store.ts",
      "src/lib/sighting-store.ts",
      "src/lib/circuit-story-store.ts",
      "src/lib/content-rights-store.ts",
    ]) {
      const src = readFileSync(join(process.cwd(), rel), "utf8");
      expect(src).toContain('from "./leftover-store-mode"');
      expect(src).toContain("leftoverStoreUsesMemory()");
    }
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
  });
});
