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
  isEtchable,
} from "../src/lib/campaign";
import {
  etchControlsEnabled,
  etchLockCopy,
} from "../src/lib/etch-lock";

/**
 * Slice 10.3 — etch toggle disabled unless pledged >= $120,000.
 * Playwright on the seat. CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.3: etch toggle locked under buyout", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(async ({ request }) => {
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

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

  test("unit: etch controls need etchable panel + buyout", () => {
    const hood = PANELS.find((p) => p.id === "hood")!;
    const roof = PANELS.find((p) => p.id === "roof")!;
    expect(isEtchable(hood)).toBe(true);
    expect(etchControlsEnabled(hood, 0)).toBe(false);
    expect(etchControlsEnabled(hood, 119_999)).toBe(false);
    expect(etchControlsEnabled(hood, GOAL_USD)).toBe(true);
    expect(etchControlsEnabled(roof, GOAL_USD)).toBe(false);
    expect(etchLockCopy(0)).toContain("$120,000");
    expect(etchLockCopy(GOAL_USD)).toContain("unlocked");
  });

  test("seat: etch disabled under buyout; enabled at $120,000", async ({
    page,
    request,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-etchable",
      "true",
    );
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-etch-unlocked",
      "false",
    );
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "locked while raised is under $120,000",
    );

    const seed = await request.post("/api/test/seed-buyout");
    expect(seed.ok()).toBeTruthy();
    const body = (await seed.json()) as { pledgedUsd: number };
    expect(body.pledgedUsd).toBe(GOAL_USD);

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-etch-unlocked",
      "true",
    );
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-preview-toggles",
      "false",
    );
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("etch-lock-copy")).toContainText(
      "Etch unlocked at $120,000",
    );
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-finish",
      "wrap",
    );
    await expect(page.getByTestId("compositor-etch-mark")).toHaveCount(0);

    // Wrap-only panel does not render the Etch tab, even at buyout.
    await page.goto("/panels/roof");
    await expect(page.getByTestId("panel-mockup")).toHaveAttribute(
      "data-etchable",
      "false",
    );
    await expect(page.getByTestId("compositor-mode-etch")).toHaveCount(0);
    await expect(page.getByTestId("compositor-finish-label")).toHaveText(
      "Wrap only",
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");

    // Clear buyout seed so later suites still see pledged $0.
    const reset = await request.post("/api/test/reset-intents");
    expect(reset.ok()).toBeTruthy();
  });
});
