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
  MAGIC_LINK_FROM,
  resolveMagicLinkFrom,
} from "../src/lib/auth/mode";

/**
 * Slice 7.7 — magic-link From is BrandMyBeast <hello@brandmybeast.com>.
 * Assert the auth config default; do not send live mail.
 */
test.describe("slice 7.7: magic-link From is BrandMyBeast hello@", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
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

  test("MAGIC_LINK_FROM is BrandMyBeast <hello@brandmybeast.com>", () => {
    expect(MAGIC_LINK_FROM).toBe("BrandMyBeast <hello@brandmybeast.com>");
    expect(resolveMagicLinkFrom({})).toBe(
      "BrandMyBeast <hello@brandmybeast.com>",
    );
    expect(resolveMagicLinkFrom({ RESEND_FROM: "  " })).toBe(
      "BrandMyBeast <hello@brandmybeast.com>",
    );
    expect(
      resolveMagicLinkFrom({
        RESEND_FROM: "BrandMyBeast <hello@brandmybeast.com>",
      }),
    ).toBe("BrandMyBeast <hello@brandmybeast.com>");
  });

  test("auth config wires resolveMagicLinkFrom into Resend provider", () => {
    const authSrc = readFileSync(
      join(process.cwd(), "src/lib/auth/index.ts"),
      "utf8",
    );
    expect(authSrc).toContain("resolveMagicLinkFrom");
    expect(authSrc).toContain("from: resolveMagicLinkFrom()");
    expect(authSrc).not.toMatch(/\$\{BRAND\.name\}\s*<\$\{BRAND\.email\}>/);

    const modeSrc = readFileSync(
      join(process.cwd(), "src/lib/auth/mode.ts"),
      "utf8",
    );
    expect(modeSrc).toContain("MAGIC_LINK_FROM");
    expect(modeSrc).toContain("BrandMyBeast");
    expect(modeSrc).toContain("BRAND.email");
  });

  test("signin page documents hello@ From without lease", async ({ page }) => {
    await page.goto("/signin");
    const html = (await page.content()).toLowerCase();
    expect(html).not.toMatch(/\blease\b/);
    expect(html).not.toContain("close_at");
    expect(html).toContain("hello@brandmybeast.com");
  });
});
