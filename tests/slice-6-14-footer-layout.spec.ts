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
 * Slice 6.14 — footer layout only.
 * Exact PUBLIC_COPY footer strings; mobile stack; no copy rewrite.
 */
test.describe("slice 6.14: footer layout", () => {
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

  test("homepage footer strings stay exact; stacked on mobile", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const footer = page.getByTestId("site-footer");
    const line = page.getByTestId("site-footer-line");
    const independent = page.getByTestId("site-footer-independent");

    await expect(line).toHaveText(PUBLIC_COPY.footer.line);
    await expect(independent).toHaveText(PUBLIC_COPY.footer.independent);
    expect(PUBLIC_COPY.footer.line).toBe(
      `${BRAND.name} · ${BRAND.handle} · ${BRAND.email}`,
    );
    expect(PUBLIC_COPY.footer.independent).toBe("Independent. Not Tesla.");

    const footerBox = await footer.boundingBox();
    const lineBox = await line.boundingBox();
    const independentBox = await independent.boundingBox();
    expect(footerBox).toBeTruthy();
    expect(lineBox).toBeTruthy();
    expect(independentBox).toBeTruthy();
    if (!footerBox || !lineBox || !independentBox) return;

    // Identity line sits above the independent line (stacked column).
    expect(independentBox.y).toBeGreaterThan(lineBox.y + lineBox.height - 2);
    // Footer stays on-screen width on a phone.
    expect(footerBox.x + footerBox.width).toBeLessThanOrEqual(390 + 1);

    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
    expect(html).not.toMatch(/\b(avenue|street|boulevard|road)\b/);
  });

  test("desktop still keeps exact footer strings", async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto("/");
    await expect(page.getByTestId("site-footer-line")).toHaveText(
      PUBLIC_COPY.footer.line,
    );
    await expect(page.getByTestId("site-footer-independent")).toHaveText(
      PUBLIC_COPY.footer.independent,
    );
  });
});
