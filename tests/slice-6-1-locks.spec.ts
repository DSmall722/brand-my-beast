import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchUnlocked,
} from "../src/lib/campaign";
import {
  etchControlsEnabled,
  etchLockCopy,
} from "../src/lib/etch-lock";

/**
 * Slice 6.1 — single Playwright contract for standing money / identity locks.
 * Broader coverage lives in campaign/intent suites; this is the merge-gate proof.
 */
test.describe("slice 6.1: floor, buyout, etch lock, no lease, no personal handle", () => {
  test("campaign constants stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(isEtchUnlocked(0)).toBe(false);
    expect(isEtchUnlocked(119_999)).toBe(false);
    expect(isEtchUnlocked(GOAL_USD)).toBe(true);
    expect(etchLockCopy(0)).toContain("Etch stays locked until buyout");
    expect(etchLockCopy(GOAL_USD)).toContain("unlocked");
    const hood = PANELS.find((panel) => panel.id === "hood");
    expect(hood).toBeTruthy();
    if (!hood) return;
    expect(etchControlsEnabled(hood, 0)).toBe(false);
    expect(etchControlsEnabled(hood, GOAL_USD)).toBe(true);
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

  test("homepage shows floor and buyout; no lease or personal handle", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByTestId("brand-wordmark")).toHaveText(BRAND.name);
    await expect(page.getByTestId("floor-amount")).toHaveText(
      formatUsd(FLOOR_USD),
    );
    await expect(page.getByTestId("goal-amount")).toHaveText(
      formatUsd(GOAL_USD),
    );
    await expect(page.getByTestId("raised-amount")).toHaveText(formatUsd(0));

    const html = await page.content();
    const lower = html.toLowerCase();
    expect(html).toContain(BRAND.handle);
    expect(html).toContain(BRAND.email);
    expect(lower).not.toMatch(/\blease\b/);
    expect(lower).not.toContain("gmail.com");
    expect(html).not.toContain("CLOSE_AT");
    expect(html).not.toContain("Close date unset");
  });

  test("seat etch controls stay locked under buyout", async ({ page }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-mockup")).toHaveCount(0);
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("etch-lock-copy")).toHaveCount(0);
    await expect(page.getByTestId("stainless-compositor-lead")).toHaveCount(0);
    await expect(page.getByTestId("seat-lead")).toContainText(
      "Immortal Etch Locked",
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html.toLowerCase()).not.toContain("gmail.com");
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain(BRAND.name);
  });
});
