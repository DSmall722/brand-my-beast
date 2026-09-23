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
import { isWholeTruckIntentOpen } from "../src/lib/intent-store";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 9.5 — hide whole-truck control when pledged >= $120,000.
 * Unit + Playwright lock. CLOSE_AT stays null.
 */
test.describe("slice 9.5: hide whole-truck at buyout", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
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

  test("unit: whole-truck open only while pledged < $120,000", () => {
    expect(isWholeTruckIntentOpen(0)).toBe(true);
    expect(isWholeTruckIntentOpen(119_999)).toBe(true);
    expect(isWholeTruckIntentOpen(GOAL_USD)).toBe(false);
    expect(isWholeTruckIntentOpen(GOAL_USD + 1)).toBe(false);
    expect(isWholeTruckIntentOpen(Number.NaN)).toBe(false);
    expect(CLOSE_AT).toBeNull();
  });

  test("homepage shows whole-truck explanation while pledged is under buyout", async ({
    page,
  }) => {
    await page.goto("/#money");
    await expect(page.getByTestId("whole-truck-intent")).toHaveCount(0);
    await expect(page.getByTestId("want-all-panels")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-lead")).toHaveCount(0);
    // Slice 16.0a — heading + lead only; no public form or sign-in.
    await expect(page.getByTestId("whole-truck-signin")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-intent-form")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-met")).toHaveCount(0);
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });

  test("homepage hides whole-truck control when pledged >= $120,000", async ({
    page,
    request,
  }) => {
    const seed = await request.post("/api/test/seed-buyout");
    expect(seed.ok()).toBeTruthy();
    const body = (await seed.json()) as {
      ok: boolean;
      pledgedUsd: number;
      wholeTruckOpen: boolean;
      closeAt: string | null;
    };
    expect(body.ok).toBe(true);
    expect(body.pledgedUsd).toBe(GOAL_USD);
    expect(body.wholeTruckOpen).toBe(false);
    expect(body.closeAt).toBeNull();
    expect(CLOSE_AT).toBeNull();

    await page.goto("/#money");
    await expect(page.getByTestId("whole-truck-intent")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-intent-form")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-signin")).toHaveCount(0);
    await expect(page.getByTestId("whole-truck-met")).toHaveText(
      PUBLIC_COPY.board.wholeTruckMet,
    );
    await expect(page.getByTestId("raised-amount")).toContainText("120,000");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
