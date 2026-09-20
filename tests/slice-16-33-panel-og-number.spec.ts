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
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { panelBoardMarkFor, panelSeatH1 } from "../src/lib/panel-board";
import { panelOpenGraphTitle } from "../src/lib/panel-open-graph";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.33 — OG image for `/panels/[id]` includes the number and name.
 * Title from 14.16 stays `{name} — BrandMyBeast`. CLOSE_AT null. No Stripe.
 */

const OG_SRC = join(process.cwd(), "src/app/panels/[panelId]/opengraph-image.tsx");

function pngSize(body: Buffer): { width: number; height: number } {
  expect(body.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
  expect(body.subarray(12, 16).toString("ascii")).toBe("IHDR");
  return {
    width: body.readUInt32BE(16),
    height: body.readUInt32BE(20),
  };
}

test.describe("slice 16.33: panel OG image includes number and name", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json is hold-mode or main-only restore", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("panel OG source draws the board number and the panel name", () => {
    const src = readFileSync(OG_SRC, "utf8");
    expect(src).toContain("panelBoardMarkFor");
    expect(src).toContain("panelSeatH1");
    expect(src).toContain("{String(mark.n)}");
    expect(src).toContain("{panel.name}");
    expect(src.toLowerCase()).not.toMatch(/\blease\b/);
    expect(src).not.toContain("artwork");

    const door = PANELS.find((row) => row.id === "driver-door");
    expect(door).toBeTruthy();
    expect(panelBoardMarkFor("driver-door").n).toBe(3);
    expect(panelSeatH1(door!)).toBe("3 · Driver door");
  });

  test("driver-door OG image is its own 1200x630 png", async ({
    page,
    request,
  }) => {
    const door = await request.get("/panels/driver-door/opengraph-image");
    expect(door.status()).toBe(200);
    expect(door.headers()["content-type"] ?? "").toMatch(/image\/png/i);
    const doorBody = await door.body();
    expect(pngSize(doorBody)).toEqual({ width: 1200, height: 630 });

    const hood = await request.get("/panels/hood/opengraph-image");
    expect(hood.status()).toBe(200);
    const hoodBody = await hood.body();
    expect(Buffer.compare(doorBody, hoodBody)).not.toBe(0);

    const quarter = await request.get(
      "/panels/passenger-rear-quarter/opengraph-image",
    );
    expect(quarter.status()).toBe(200);
    expect(pngSize(await quarter.body())).toEqual({ width: 1200, height: 630 });

    const home = await request.get("/opengraph-image");
    expect(home.status()).toBe(200);
    expect(Buffer.compare(doorBody, await home.body())).not.toBe(0);

    await page.goto("/panels/driver-door");
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      "content",
      /\/panels\/driver-door\/opengraph-image/i,
    );
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
      "content",
      panelOpenGraphTitle(PANELS.find((row) => row.id === "driver-door")!),
    );
    await expect(page.locator("h1")).toContainText("3");
    await expect(page.locator("h1")).toContainText("Driver door");
  });
});
