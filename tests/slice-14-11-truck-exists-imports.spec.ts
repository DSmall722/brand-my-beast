import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  TRUCK_EXISTS,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 14.11 — while TRUCK_EXISTS is false, app routes must not statically
 * import plaque / sighting / circuit / Season 2 modules. Extends 12.40.
 * CLOSE_AT null. No Stripe. No clock. Hold-mode untouched.
 */

const ROOT = process.cwd();
const APP_DIR = join(ROOT, "src/app");
const SLOT_PATH = join(
  ROOT,
  "src/components/home/truck-exists-sections.tsx",
);

const SKIP_DIR = new Set(["node_modules", ".git", ".next"]);

/** Static import targets that pull vapor boards into the truck-missing graph. */
const VAPOR_STATIC_FROM = [
  "@/lib/cabin-plaque",
  "@/lib/cabin-plaque-store",
  "@/lib/circuit-story",
  "@/lib/circuit-story-store",
  "@/lib/sighting",
  "@/lib/sighting-store",
  "@/lib/sighting-bounty-cards",
  "@/lib/season-two",
  "@/components/CabinPlaqueForm",
  "@/components/SeasonTwoBoardCard",
  "@/components/SightingForm",
  "@/components/CircuitStoryForm",
  "@/components/SightingBountyCardsCard",
];

function listSourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    if (SKIP_DIR.has(name)) continue;
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...listSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(name)) {
      out.push(full);
    }
  }
  return out;
}

function staticImportOffenders(src: string): string[] {
  const hits: string[] = [];
  for (const mod of VAPOR_STATIC_FROM) {
    const escaped = mod.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Exact module path: allow `@/lib/sighting-store` vs `@/lib/sighting`.
    const re = new RegExp(
      String.raw`^import\s+[\s\S]*?from\s+["']${escaped}["']`,
      "m",
    );
    if (re.test(src)) hits.push(mod);
  }
  return hits;
}

test.describe("slice 14.11: no vapor imports while truck missing", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("TRUCK_EXISTS stays false in default CI / Playwright env", () => {
    expect(TRUCK_EXISTS).toBe(false);
    expect(process.env.TRUCK_EXISTS ?? "").not.toMatch(/^(true|1)$/i);
  });

  test("src/app has no static plaque / sighting / circuit / Season 2 imports", () => {
    const offenders: string[] = [];
    for (const file of listSourceFiles(APP_DIR)) {
      const src = readFileSync(file, "utf8");
      const hits = staticImportOffenders(src);
      for (const mod of hits) {
        offenders.push(`${relative(ROOT, file)} → ${mod}`);
      }
    }
    expect(offenders, offenders.join("\n")).toEqual([]);
  });

  test("truck-exists-sections gates dynamic imports on TRUCK_EXISTS", () => {
    const src = readFileSync(SLOT_PATH, "utf8");
    expect(src).toContain("if (!TRUCK_EXISTS) return null");
    expect(src).toMatch(/import\("\.\/HomeTruckExistsBoard"\)/);
    expect(src).toMatch(/import\("\.\/HomeTruckExistsCommunity"\)/);
    expect(src).toMatch(/import\("@\/lib\/circuit-story-store"\)/);
    expect(src).toMatch(/import\("@\/lib\/sighting-store"\)/);
    // No static top-level import of vapor stores in the slot file.
    expect(staticImportOffenders(src)).toEqual([]);
  });

  test("truck-gated vapor APIs still 404 and use dynamic store imports", () => {
    for (const rel of [
      "src/app/api/plaque/route.ts",
      "src/app/api/sighting/route.ts",
      "src/app/api/circuit-story/route.ts",
    ]) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      expect(src).toContain("truckMissingResponse");
      expect(src).toMatch(/await import\(/);
      expect(staticImportOffenders(src)).toEqual([]);
    }
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
    await expect(page.getByTestId("cabin-plaque-form")).toHaveCount(0);
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
  });
});
