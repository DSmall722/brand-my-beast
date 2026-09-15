import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  TRUCK_EXISTS,
  formatUsd,
} from "../src/lib/campaign";

const TRUCK_GATED_POST_PATHS = [
  "/api/plaque",
  "/api/sighting",
  "/api/event-request",
  "/api/circuit-story",
] as const;

/**
 * Slice 7.2 — truck-gated public APIs return 404 while TRUCK_EXISTS is false.
 */
test.describe("slice 7.2: truck-gated public APIs", () => {
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

  test("TRUCK_EXISTS stays false in default CI / Playwright env", () => {
    expect(TRUCK_EXISTS).toBe(false);
    expect(process.env.TRUCK_EXISTS ?? "").not.toMatch(/^(true|1)$/i);
  });

  test("truck-gated POSTs return 404 while truck is missing", async ({
    request,
  }) => {
    expect(TRUCK_EXISTS).toBe(false);

    for (const path of TRUCK_GATED_POST_PATHS) {
      const res = await request.post(path, {
        data: {
          name: "Should Not Land",
          email: "gate@example.com",
          corridorId: "charlotte",
          kindId: "campus",
          note: "truck gate",
          requestedDate: "2026-11-07",
        },
      });
      expect(res.status(), `${path} must 404`).toBe(404);
    }
  });

  test("homepage still has no lease / personal identity", async ({ page }) => {
    await page.goto("/");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toMatch(/@gmail\.com/);
    expect(html).not.toContain("close_at");
  });
});
