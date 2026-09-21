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
import {
  isVercelGitHoldOrMainOnlyRestore,
  vercelJsonIsHoldOrMainOnlyRestore,
} from "../src/lib/vercel-git-deploy";

/**
 * Slice 6.15 — vercel.json git deploy policy (repo-side).
 * Dual-accept (Hobby hold vs restore):
 *   - hold-mode: `deploymentEnabled === false` (all auto Git deploys off)
 *   - restore:   `{ "*": false, "main": true }` (main-only)
 * Accepting both shapes keeps this lock green after restore without a
 * follow-up test rewrite. No PUBLIC_COPY / hero / waitlist rewrite.
 */
test.describe("slice 6.15: vercel main-only deploys", () => {
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

  test("vercel.json is hold-mode pause or main-only restore", () => {
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const config = JSON.parse(raw) as {
      git?: { deploymentEnabled?: Record<string, boolean> | boolean };
    };
    const enabled = config.git?.deploymentEnabled;
    // Dual-accept: full pause (hold) OR main-only (post-restore).
    if (enabled === false) {
      expect(enabled).toBe(false);
      return;
    }
    expect(enabled && typeof enabled === "object").toBe(true);
    if (!enabled || typeof enabled !== "object") return;
    expect(enabled["*"]).toBe(false);
    expect(enabled.main).toBe(true);
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
    expect(isVercelGitHoldOrMainOnlyRestore(true)).toBe(false);
  });

  test("homepage still matches PUBLIC_COPY H1 and Notify me", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.locator("#hero-title")).toHaveText(PUBLIC_COPY.hero.h1);
    await expect(page.locator("#hero-title")).toHaveText(
      "Put your brand on the truck people already photograph.",
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText(
      PUBLIC_COPY.waitlist.button,
    );
    await expect(page.getByTestId("waitlist-submit")).toHaveText("Contact BMB");

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
  });
});
