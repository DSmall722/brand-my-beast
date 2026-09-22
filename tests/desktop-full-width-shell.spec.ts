import { expect, test, type Page } from "@playwright/test";
import { CLOSE_AT, FLOOR_USD, GOAL_USD } from "../src/lib/campaign";

/**
 * Desktop content uses the viewport. Side inset stays 1rem.
 * Phone shell stays `100% - 2rem`. Hero photo stays full-bleed under 720px.
 */

const SHELLS = [
  "header.shell",
  "#money",
  "#panels",
  "#etch",
  "#questions",
  "[data-testid='site-footer']",
] as const;

type Measure = {
  clientWidth: number;
  scrollWidth: number;
  shells: { selector: string; width: number | null }[];
  photo: number | null;
  overlay: number | null;
  panelGrid: number | null;
  faqAnswer: number | null;
  storyCopy: number | null;
  etchRequirements: number | null;
  proseCap: number;
};

async function measure(page: Page): Promise<Measure> {
  return page.evaluate((selectors) => {
    const widthOf = (selector: string) => {
      const el = document.querySelector(selector);
      if (!el) return null;
      return el.getBoundingClientRect().width;
    };
    const probe = document.createElement("div");
    probe.style.width = "62ch";
    probe.style.position = "absolute";
    probe.style.visibility = "hidden";
    document.body.appendChild(probe);
    const proseCap = probe.getBoundingClientRect().width;
    probe.remove();
    return {
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
      shells: selectors.map((selector) => ({
        selector,
        width: widthOf(selector),
      })),
      photo: widthOf("[data-testid='hero-photo-well']"),
      overlay: widthOf(".hero-overlay"),
      panelGrid: widthOf("[data-testid='panel-grid']"),
      faqAnswer: widthOf("#questions .questions-item dd"),
      storyCopy: widthOf(".story-step-copy"),
      etchRequirements: widthOf("[data-testid='etch-requirements']"),
      proseCap,
    };
  }, [...SHELLS]);
}

function expectWidth(actual: number | null, expected: number, label: string) {
  expect(actual, label).not.toBeNull();
  expect(Math.abs((actual as number) - expected), label).toBeLessThanOrEqual(1);
}

test.describe("desktop shell fills the viewport", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1920, height: 1080 },
  ] as const) {
    test(`shell, hero, and grids fill ${viewport.width}px with a 1rem gutter`, async ({
      page,
    }) => {
      await page.setViewportSize(viewport);
      await page.goto("/");
      const box = await measure(page);
      const shellWidth = box.clientWidth - 32;

      expect(box.clientWidth).toBeGreaterThan(1120);
      expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
      expect(shellWidth).toBeGreaterThan(1120);

      for (const shell of box.shells) {
        expectWidth(shell.width, shellWidth, shell.selector);
      }
      expectWidth(box.photo, shellWidth, "hero photo");
      expectWidth(box.overlay, shellWidth, "hero overlay");
      expectWidth(box.panelGrid, shellWidth, "panel grid");

      expect(box.faqAnswer).not.toBeNull();
      expect(box.storyCopy).not.toBeNull();
      expect(box.etchRequirements).not.toBeNull();
      expect(box.faqAnswer as number).toBeLessThanOrEqual(box.proseCap + 1);
      expect(box.storyCopy as number).toBeLessThanOrEqual(box.proseCap + 1);
      expect(box.etchRequirements as number).toBeLessThanOrEqual(box.proseCap + 1);
      expect(box.faqAnswer as number).toBeLessThan(shellWidth - 400);
    });
  }

  test("phone shell stays inset and the hero photo stays full bleed", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const box = await measure(page);
    const shellWidth = box.clientWidth - 32;

    expect(box.clientWidth).toBeLessThanOrEqual(390);
    expect(box.scrollWidth).toBeLessThanOrEqual(box.clientWidth + 1);
    expect(shellWidth).toBeLessThan(1120);

    for (const shell of box.shells) {
      expectWidth(shell.width, shellWidth, shell.selector);
    }
    expectWidth(box.photo, box.clientWidth, "hero photo");
    expectWidth(box.overlay, shellWidth, "hero overlay");
  });
});
