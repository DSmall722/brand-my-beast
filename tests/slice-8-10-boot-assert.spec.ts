import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  assertTestLoginNotInProduction,
  enabledAuthProviders,
} from "../src/lib/auth/mode";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

/**
 * Slice 8.10 — boot assert: AUTH_ENABLE_TEST_LOGIN cannot be on in Production.
 */
test.describe("slice 8.10: test-login boot assert", () => {
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

  test("assertTestLoginNotInProduction throws when both flags set", () => {
    expect(() =>
      assertTestLoginNotInProduction({
        VERCEL_ENV: "production",
        AUTH_ENABLE_TEST_LOGIN: "1",
      }),
    ).toThrow(/AUTH_ENABLE_TEST_LOGIN cannot be on when VERCEL_ENV=production/);

    expect(() =>
      assertTestLoginNotInProduction({
        VERCEL_ENV: "production",
        AUTH_ENABLE_TEST_LOGIN: "0",
      }),
    ).not.toThrow();

    expect(() =>
      assertTestLoginNotInProduction({
        VERCEL_ENV: "preview",
        AUTH_ENABLE_TEST_LOGIN: "1",
      }),
    ).not.toThrow();
  });

  test("enabledAuthProviders refuses test-login in Vercel Production", () => {
    expect(() =>
      enabledAuthProviders({
        VERCEL_ENV: "production",
        AUTH_ENABLE_TEST_LOGIN: "1",
        AUTH_MODE: "live",
      }),
    ).toThrow(/AUTH_ENABLE_TEST_LOGIN/);

    expect(
      enabledAuthProviders({
        VERCEL_ENV: "production",
        AUTH_MODE: "live",
      }),
    ).not.toContain("test-login");

    expect(
      enabledAuthProviders({
        AUTH_MODE: "test",
      }),
    ).toContain("test-login");
  });

  test("instrumentation.ts registers the boot assert", () => {
    const src = readFileSync(
      join(process.cwd(), "src/instrumentation.ts"),
      "utf8",
    );
    expect(src).toContain("assertTestLoginNotInProduction");
    expect(src).toContain("register");
    const mode = readFileSync(
      join(process.cwd(), "src/lib/auth/mode.ts"),
      "utf8",
    );
    expect(mode).toContain("assertTestLoginNotInProduction");
    expect(mode.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
