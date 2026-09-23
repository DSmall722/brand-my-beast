import { expect, test } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD } from "../src/lib/campaign";

/**
 * Desktop layout polish after the full-width shell.
 * Floor $58,000 / buyout $120,000. CLOSE_AT stays null.
 */

test.describe("desktop layout polish", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
  });

  test("1440 desktop centers content, uses 4-4-3, and keeps steps in a row", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");

    const layout = await page.evaluate(() => {
      const box = (selector: string) => {
        const el = document.querySelector(selector);
        if (!el) return null;
        const rect = el.getBoundingClientRect();
        return { width: rect.width, left: rect.left, top: rect.top, right: rect.right };
      };
      const cards = [...document.querySelectorAll("[data-testid='panel-grid'] article")].map(
        (el) => {
          const rect = el.getBoundingClientRect();
          return {
            top: Math.round(rect.top),
            left: Math.round(rect.left),
            width: Math.round(rect.width),
          };
        },
      );
      const rows = new Map<number, { left: number; width: number }[]>();
      for (const card of cards) {
        const row = rows.get(card.top) ?? [];
        row.push(card);
        rows.set(card.top, row);
      }
      const story = [...document.querySelectorAll("#story .story-list > li")].map((el) => {
        const style = getComputedStyle(el);
        return {
          top: Math.round(el.getBoundingClientRect().top),
          shadow: style.boxShadow,
          background: style.backgroundImage,
        };
      });
      const title = document.querySelector("#hero-title");
      const primary = document.querySelector("[data-testid='hero-primary-cta']");
      const secondary = document.querySelector("[data-testid='hero-secondary-cta']");
      const actions = document.querySelector(".hero-actions");
      const primaryRect = primary?.getBoundingClientRect();
      const secondaryRect = secondary?.getBoundingClientRect();
      const actionsRect = actions?.getBoundingClientRect();
      const seat = document.querySelector("[data-testid='truck-seat-hood']");
      const seatBox = seat?.getBoundingClientRect();
      return {
        shell: box("header.shell"),
        preview: box("[data-testid='truck-view-seats']"),
        grid: box("[data-testid='panel-grid']"),
        etch: box("[data-testid='etch-requirements']"),
        rowCounts: [...rows.values()].map((row) => row.length),
        rowWidths: [...rows.values()].map((row) => row.map((card) => card.width)),
        rowLefts: [...rows.values()].map((row) => row[0]?.left ?? 0),
        rowRights: [...rows.values()].map((row) => {
          const last = row[row.length - 1];
          return last ? last.left + last.width : 0;
        }),
        storyTops: story.map((step) => step.top),
        storyShadows: story.map((step) => step.shadow),
        storyBackgrounds: story.map((step) => step.background),
        heroAlign: title ? getComputedStyle(title).textAlign : null,
        primaryLeft: primaryRect?.left ?? null,
        secondaryRight: secondaryRect?.right ?? null,
        actionsLeft: actionsRect?.left ?? null,
        actionsRight: actionsRect?.right ?? null,
        primaryClass: primary?.className ?? "",
        hoodHit: seatBox
          ? { width: seatBox.width, height: seatBox.height }
          : null,
        clientWidth: document.documentElement.clientWidth,
      };
    });

    expect(layout.shell).not.toBeNull();
    expect(layout.preview).not.toBeNull();
    expect(layout.grid).not.toBeNull();
    expect(layout.etch).not.toBeNull();
    const shellWidth = layout.shell!.width;
    expect(layout.preview!.width).toBeLessThan(shellWidth - 200);
    expect(layout.preview!.width).toBeGreaterThan(700);
    expect(layout.grid!.width).toBeLessThan(shellWidth - 80);
    expect(Math.abs(layout.etch!.width - layout.grid!.width)).toBeLessThanOrEqual(2);
    expect(
      Math.abs(layout.grid!.left - (layout.clientWidth - layout.grid!.width) / 2),
    ).toBeLessThanOrEqual(2);

    expect(layout.rowCounts).toEqual([4, 4, 3]);
    const firstWidth = layout.rowWidths[0][0];
    for (const row of layout.rowWidths) {
      for (const width of row) {
        expect(Math.abs(width - firstWidth)).toBeLessThanOrEqual(2);
      }
    }
    expect(layout.rowLefts[2]).toBeGreaterThan(layout.rowLefts[0] + 20);
    expect(layout.rowRights[2]).toBeLessThan(layout.rowRights[0] - 20);

    expect(layout.storyTops).toHaveLength(3);
    expect(new Set(layout.storyTops).size).toBe(1);
    for (const shadow of layout.storyShadows) {
      expect(shadow === "none" || shadow === "").toBe(true);
    }
    for (const background of layout.storyBackgrounds) {
      expect(background).toBe("none");
    }

    expect(layout.heroAlign === "start" || layout.heroAlign === "left").toBe(true);
    expect(layout.primaryClass).toContain("obsidian-arrow-fill-btn");
    expect(layout.primaryLeft).not.toBeNull();
    expect(layout.secondaryRight).not.toBeNull();
    expect(Math.abs((layout.primaryLeft as number) - (layout.actionsLeft as number))).toBeLessThanOrEqual(2);
    expect(Math.abs((layout.secondaryRight as number) - (layout.actionsRight as number))).toBeLessThanOrEqual(2);
    expect((layout.secondaryRight as number) - (layout.primaryLeft as number)).toBeGreaterThan(400);

    expect(layout.hoodHit).not.toBeNull();
    expect(layout.hoodHit!.width).toBeGreaterThan(80);
    expect(layout.hoodHit!.height).toBeGreaterThan(40);
  });

  test("terms and privacy prose use a wide centered column", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    for (const path of ["/terms", "/privacy"] as const) {
      await page.goto(path);
      const widths = await page.evaluate(() => {
        const main = document.querySelector("main.legal-page");
        const prose = document.querySelector(".legal-stub-body p");
        return {
          page: main?.getBoundingClientRect().width ?? 0,
          prose: prose?.getBoundingClientRect().width ?? 0,
          client: document.documentElement.clientWidth,
        };
      });
      expect(widths.page).toBeGreaterThan(720);
      expect(widths.page).toBeLessThan(widths.client - 200);
      expect(Math.abs(widths.prose - widths.page)).toBeLessThanOrEqual(4);
    }
  });

  test("seat still is a modest bump over the old 56rem column", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/panels/hood");
    const photo = await page.evaluate(() => {
      const stage = document.querySelector("[data-testid='seat-photo-stage']");
      const img = document.querySelector("[data-testid='seat-photo-stage'] img");
      const style = img ? getComputedStyle(img) : null;
      return {
        width: stage?.getBoundingClientRect().width ?? 0,
        objectFit: style?.objectFit ?? "",
        objectPosition: style?.objectPosition ?? "",
      };
    });
    expect(photo.width).toBeGreaterThan(980);
    expect(photo.width).toBeLessThan(1100);
    expect(photo.objectFit).toBe("contain");
    expect(photo.objectPosition).toBe("50% 50%");
  });
});
