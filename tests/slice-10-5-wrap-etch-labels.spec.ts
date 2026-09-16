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
  compositorEtchMarkLabel,
  compositorFinishLabel,
  compositorModeLabel,
  compositorWrapFilmLabel,
  stainlessCompositorCopyIsSafe,
} from "../src/lib/stainless-compositor";

/**
 * Slice 10.5 — wrap vs etch labels from PUBLIC_COPY only.
 * No “permanent vinyl.” CLOSE_AT null. No Stripe.
 */
test.describe("slice 10.5: wrap vs etch labels from PUBLIC_COPY", () => {
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

  test("unit: compositor labels are PUBLIC_COPY only — never permanent vinyl", () => {
    expect(compositorModeLabel("wrap")).toBe(PUBLIC_COPY.compositor.modeWrap);
    expect(compositorModeLabel("etch")).toBe(PUBLIC_COPY.compositor.modeEtch);
    expect(compositorFinishLabel("wrap", true)).toBe(
      PUBLIC_COPY.compositor.finishWrapEtchable,
    );
    expect(compositorFinishLabel("wrap", false)).toBe(
      PUBLIC_COPY.compositor.finishWrapOnly,
    );
    expect(compositorFinishLabel("etch", true)).toBe(
      PUBLIC_COPY.compositor.finishEtch,
    );
    expect(compositorFinishLabel("etch", true)).toContain("$120,000");
    expect(compositorFinishLabel("wrap", false)).toBe(
      PUBLIC_COPY.panels.badgeWrap,
    );
    expect(compositorWrapFilmLabel()).toBe(PUBLIC_COPY.compositor.wrapFilm);
    expect(compositorEtchMarkLabel()).toBe(PUBLIC_COPY.compositor.etchMark);

    const blob = [
      PUBLIC_COPY.compositor.modeWrap,
      PUBLIC_COPY.compositor.modeEtch,
      PUBLIC_COPY.compositor.finishWrapEtchable,
      PUBLIC_COPY.compositor.finishWrapOnly,
      PUBLIC_COPY.compositor.finishEtch,
      PUBLIC_COPY.compositor.wrapFilm,
      PUBLIC_COPY.compositor.etchMark,
    ].join("\n");
    expect(blob.toLowerCase()).not.toContain("permanent vinyl");
    expect(stainlessCompositorCopyIsSafe()).toBe(true);
    expect(stainlessCompositorCopyIsSafe("Immortal etch. permanent vinyl.")).toBe(
      false,
    );
  });

  test("seat: wrap and etch mode labels match PUBLIC_COPY; no permanent vinyl", async ({
    page,
  }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("compositor-mode-wrap")).toHaveText(
      PUBLIC_COPY.compositor.modeWrap,
    );
    await expect(page.getByTestId("compositor-mode-etch")).toHaveText(
      PUBLIC_COPY.compositor.modeEtch,
    );
    await expect(page.getByTestId("compositor-finish-label")).toHaveText(
      PUBLIC_COPY.compositor.finishWrapEtchable,
    );
    await expect(page.getByTestId("compositor-wrap-film")).toHaveText(
      PUBLIC_COPY.compositor.wrapFilm,
    );

    await page.goto("/panels/roof");
    await expect(page.getByTestId("compositor-finish-label")).toHaveText(
      PUBLIC_COPY.compositor.finishWrapOnly,
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toContain("permanent vinyl");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });
});
