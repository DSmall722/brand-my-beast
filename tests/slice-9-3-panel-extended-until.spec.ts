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
import {
  assertCloseAtUntouched,
  panelExtendedUntilCopy,
  parsePanelExtendedUntil,
} from "../src/lib/panel-extension";
import {
  getPanelExtendedUntil,
  resetPanelExtensionStoreForTests,
  setPanelExtendedUntil,
} from "../src/lib/panel-extension-store";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 9.3 — panelExtendedUntil field + PUBLIC_COPY-safe copy.
 * Do not set CLOSE_AT.
 */
test.describe("slice 9.3: panelExtendedUntil", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetPanelExtensionStoreForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(() => assertCloseAtUntouched()).not.toThrow();
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

  test("migration adds panel_extensions without CLOSE_AT column", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0010_panel_extended_until.sql"),
      "utf8",
    );
    expect(sql).toMatch(/panel_extensions/);
    expect(sql).toMatch(/extended_until/);
    expect(sql).not.toMatch(/CLOSE_AT/);
    expect(sql.toLowerCase()).not.toMatch(/stripe/);
  });

  test("PUBLIC_COPY panelExtension never names CLOSE_AT", () => {
    const blob = JSON.stringify(PUBLIC_COPY.panelExtension);
    expect(blob).not.toContain("CLOSE_AT");
    expect(blob.toLowerCase()).not.toMatch(/\blease\b/);
    expect(PUBLIC_COPY.panelExtension.unset).toContain("does not charge cards");
    expect(PUBLIC_COPY.panelExtension.setTail).toContain(
      "not a campaign close date",
    );
  });

  test("parse + copy stay PUBLIC_COPY-safe", () => {
    expect(parsePanelExtendedUntil("").ok).toBe(true);
    expect(parsePanelExtendedUntil("not-a-date").ok).toBe(false);

    const unset = panelExtendedUntilCopy(null);
    expect(unset.isSet).toBe(false);
    expect(unset.body).toBe(PUBLIC_COPY.panelExtension.unset);
    expect(unset.body).not.toContain("CLOSE_AT");

    const until = "2026-09-20T12:00:00.000Z";
    const set = panelExtendedUntilCopy(until);
    expect(set.isSet).toBe(true);
    expect(set.body).toContain(until);
    expect(set.body).toContain(PUBLIC_COPY.panelExtension.setLead);
    expect(set.body).toContain(PUBLIC_COPY.panelExtension.setTail);
    expect(set.body).not.toContain("CLOSE_AT");
    expect(CLOSE_AT).toBeNull();
  });

  test("setPanelExtendedUntil stores field and never sets CLOSE_AT", async () => {
    expect(await getPanelExtendedUntil("hood")).toBeNull();

    const until = "2026-09-20T18:30:00.000Z";
    const set = await setPanelExtendedUntil("hood", until);
    expect(set.ok).toBeTruthy();
    if (!set.ok) return;
    expect(set.panelExtendedUntil).toBe(until);
    expect(await getPanelExtendedUntil("hood")).toBe(until);
    expect(CLOSE_AT).toBeNull();

    const clear = await setPanelExtendedUntil("hood", null);
    expect(clear.ok).toBeTruthy();
    if (!clear.ok) return;
    expect(clear.panelExtendedUntil).toBeNull();
    expect(await getPanelExtendedUntil("hood")).toBeNull();
    expect(CLOSE_AT).toBeNull();
  });

  test("seat shows unset extension copy without CLOSE_AT", async ({ page }) => {
    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-extended-until")).toBeVisible();
    await expect(page.getByTestId("panel-extended-until")).toHaveAttribute(
      "data-extended",
      "false",
    );
    await expect(page.getByTestId("panel-extended-until-copy")).toHaveText(
      PUBLIC_COPY.panelExtension.unset,
    );
    const html = await page.content();
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
  });

  test("seat shows set extension timestamp; CLOSE_AT still null", async ({
    page,
    request,
  }) => {
    const until = "2026-09-21T09:00:00.000Z";
    const seed = await request.post("/api/test/panel-extended-until", {
      data: { panelId: "hood", panelExtendedUntil: until },
    });
    expect(seed.ok()).toBeTruthy();
    const body = (await seed.json()) as {
      ok: boolean;
      panelExtendedUntil: string | null;
      closeAt: string | null;
    };
    expect(body.ok).toBe(true);
    expect(body.panelExtendedUntil).toBe(until);
    expect(body.closeAt).toBeNull();
    expect(CLOSE_AT).toBeNull();

    await page.goto("/panels/hood");
    await expect(page.getByTestId("panel-extended-until")).toHaveAttribute(
      "data-extended",
      "true",
    );
    await expect(page.getByTestId("panel-extended-until")).toHaveAttribute(
      "data-until",
      until,
    );
    const expected = panelExtendedUntilCopy(until).body;
    await expect(page.getByTestId("panel-extended-until-copy")).toHaveText(
      expected,
    );
    const html = await page.content();
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain(until);
  });
});
