import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  TRUCK_EXISTS,
  formatUsd,
} from "../src/lib/campaign";

/**
 * Slice 12.40 — homepage does not statically import vapor P3–P5 boards while
 * TRUCK_EXISTS is false. CLOSE_AT null. No Stripe.
 */

const PAGE_PATH = join(process.cwd(), "src/app/page.tsx");
const SLOT_PATH = join(
  process.cwd(),
  "src/components/home/truck-exists-sections.tsx",
);

const VAPOR_STATIC_IMPORTS = [
  "HomeTruckExistsBoard",
  "HomeTruckExistsCommunity",
  "circuit-story-store",
  "sighting-store",
  "event-request-store",
  "SeasonTwoBoardCard",
  "SightingForm",
  "CircuitStoryForm",
];

test.describe("slice 12.40: no dead vapor imports on home when truck missing", () => {
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

  test("page.tsx has no static vapor board or store imports", () => {
    const src = readFileSync(PAGE_PATH, "utf8");
    for (const needle of VAPOR_STATIC_IMPORTS) {
      expect(src, `page.tsx must not statically import ${needle}`).not.toMatch(
        new RegExp(
          String.raw`^import\s+.*${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
          "m",
        ),
      );
    }
    expect(src).toContain("TruckExistsBoardSlot");
    expect(src).toContain("TruckExistsCommunitySlot");
  });

  test("truck-exists-sections gates dynamic imports on TRUCK_EXISTS", () => {
    const src = readFileSync(SLOT_PATH, "utf8");
    expect(src).toContain("if (!TRUCK_EXISTS) return null");
    expect(src).toMatch(/import\("\.\/HomeTruckExistsBoard"\)/);
    expect(src).toMatch(/import\("\.\/HomeTruckExistsCommunity"\)/);
    expect(src).toMatch(/import\("@\/lib\/circuit-story-store"\)/);
    expect(src).toMatch(/import\("@\/lib\/sighting-store"\)/);
    expect(src).toMatch(/import\("@\/lib\/event-request-store"\)/);
  });

  test("homepage hides vapor boards while truck is missing", async ({
    page,
  }) => {
    expect(TRUCK_EXISTS).toBe(false);
    await page.goto("/");
    await expect(page.getByTestId("home-main")).toHaveAttribute(
      "data-truck-exists",
      "false",
    );
    await expect(page.getByTestId("season-two")).toHaveCount(0);
    await expect(page.getByTestId("circuit-story")).toHaveCount(0);
    await expect(page.getByTestId("sightings")).toHaveCount(0);
    await expect(page.getByTestId("event-calendar")).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
