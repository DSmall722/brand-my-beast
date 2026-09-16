import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

/**
 * Slice 11.9 — vercel.json git deploy policy; no preview / cron / nested projects.
 * Dual-accept (Hobby hold vs restore):
 *   - hold-mode: `deploymentEnabled === false` (all auto Git deploys off)
 *   - restore:   `{ "*": false, "main": true }` (main-only)
 * Accepting both shapes keeps this lock green after restore without a
 * follow-up test rewrite. See docs/VERCEL-HOLD.md restore checklist.
 */
test.describe("slice 11.9: vercel.json stays main-only", () => {
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

  test("vercel.json is hold-mode pause or main-only; no preview / cron / nested", () => {
    const root = process.cwd();
    const vercelPath = join(root, "vercel.json");
    expect(existsSync(vercelPath)).toBe(true);

    const config = JSON.parse(readFileSync(vercelPath, "utf8")) as {
      git?: { deploymentEnabled?: Record<string, boolean> | boolean };
      crons?: unknown;
    };
    const enabled = config.git?.deploymentEnabled;
    // Dual-accept: full pause (hold) OR main-only (post-restore).
    if (enabled === false) {
      expect(enabled).toBe(false);
    } else {
      expect(enabled && typeof enabled === "object").toBe(true);
      if (!enabled || typeof enabled !== "object") return;
      expect(enabled["*"]).toBe(false);
      expect(enabled.main).toBe(true);
    }
    expect(config.crons).toBeUndefined();

    // One vercel.json at repo root — no nested project configs.
    const nested = readdirSync(root, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
      .flatMap((entry) => {
        const candidate = join(root, entry.name, "vercel.json");
        return existsSync(candidate) ? [candidate] : [];
      });
    expect(nested).toEqual([]);
  });
});
