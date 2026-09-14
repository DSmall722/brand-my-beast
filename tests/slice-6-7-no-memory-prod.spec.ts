import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
} from "../src/lib/campaign";
import { intentStoreUsesMemory } from "../src/lib/intent-store";
import { waitlistStoreUsesMemory } from "../src/lib/waitlist";

/**
 * Slice 6.7 — Production never uses in-memory waitlist or intent ledgers.
 * Memory remains CI/local only. FEATURES board scaffolds stay out of scope.
 */
test.describe("slice 6.7: no in-memory stores in Production", () => {
  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(BRAND.handle).toBe("@BrandMyBeast");
    expect(BRAND.email).toBe("hello@brandmybeast.com");
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

  test("Production never uses the memory intent store", () => {
    expect(
      intentStoreUsesMemory({
        VERCEL_ENV: "production",
        INTENT_MODE: "memory",
      }),
    ).toBe(false);
    expect(
      intentStoreUsesMemory({
        VERCEL_ENV: "production",
        DATABASE_URL: "postgres://example",
      }),
    ).toBe(false);
    expect(intentStoreUsesMemory({ INTENT_MODE: "memory" })).toBe(true);
    expect(intentStoreUsesMemory({})).toBe(true);
    expect(
      intentStoreUsesMemory({ DATABASE_URL: "postgres://example" }),
    ).toBe(false);
  });

  test("Production never uses the memory waitlist store", () => {
    expect(
      waitlistStoreUsesMemory({
        VERCEL_ENV: "production",
        WAITLIST_MODE: "memory",
      }),
    ).toBe(false);
    expect(
      waitlistStoreUsesMemory({
        VERCEL_ENV: "production",
        DATABASE_URL: "postgres://example",
      }),
    ).toBe(false);
    expect(waitlistStoreUsesMemory({ WAITLIST_MODE: "memory" })).toBe(true);
    expect(
      waitlistStoreUsesMemory({ WAITLIST_MODE: "postgres" }),
    ).toBe(false);
    expect(
      waitlistStoreUsesMemory({ DATABASE_URL: "postgres://example" }),
    ).toBe(false);
    expect(
      waitlistStoreUsesMemory({ NODE_ENV: "production" }),
    ).toBe(false);
    expect(waitlistStoreUsesMemory({})).toBe(true);
  });
});
