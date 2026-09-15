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

/**
 * Slice 7.8 — `/robots.txt` + `/sitemap` include `/` and `/panels/*` only.
 * `/operator` is not listed.
 */
test.describe("slice 7.8: robots + sitemap public surface only", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.domain).toBe("brandmybeast.com");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
    expect(PANELS).toHaveLength(12);
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

  test("robots.txt allows / and /panels/; disallows /operator", async ({
    request,
  }) => {
    const res = await request.get("/robots.txt");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toMatch(/Allow:\s*\/\b/);
    expect(body).toMatch(/Allow:\s*\/panels\//);
    expect(body).toMatch(/Disallow:\s*\/operator/);
    expect(body).toContain("https://brandmybeast.com/sitemap.xml");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("sitemap.xml lists home and twelve panels only", async ({
    request,
  }) => {
    const res = await request.get("/sitemap.xml");
    expect(res.ok()).toBeTruthy();
    const body = await res.text();
    expect(body).toContain("<loc>https://brandmybeast.com</loc>");
    for (const panel of PANELS) {
      expect(body).toContain(
        `<loc>https://brandmybeast.com/panels/${panel.id}</loc>`,
      );
    }
    expect(body).not.toContain("/operator");
    expect(body).not.toContain("/account");
    expect(body).not.toContain("/partner");
    expect(body).not.toContain("/signin");
    expect(body.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("source files exist and omit operator from sitemap", () => {
    const robots = readFileSync(
      join(process.cwd(), "src/app/robots.ts"),
      "utf8",
    );
    const sitemap = readFileSync(
      join(process.cwd(), "src/app/sitemap.ts"),
      "utf8",
    );
    expect(robots).toContain('"/operator"');
    expect(robots).toContain('"/panels/"');
    expect(sitemap).toContain("PANELS");
    expect(sitemap).toContain("/panels/");
    expect(sitemap).not.toMatch(/url:.*\/operator/);
    expect(sitemap).not.toContain('"/operator"');
    expect(sitemap).not.toContain("'/operator'");
  });
});
