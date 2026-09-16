import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  createMagicLinkVerificationToken,
  peekMagicLinkVerificationToken,
  resetMagicLinkVerificationTokensForTests,
  useMagicLinkVerificationToken,
} from "../src/lib/auth/magic-link-token";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";

/**
 * Slice 12.19 — magic-link verification tokens are consumed once.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.19: magic-link consumed-once", () => {
  test.beforeEach(() => {
    resetMagicLinkVerificationTokensForTests();
  });

  test.afterEach(() => {
    resetMagicLinkVerificationTokensForTests();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
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

  test("Auth.js wiring deletes verification tokens on use", () => {
    const authSrc = readFileSync(
      join(process.cwd(), "src/lib/auth/index.ts"),
      "utf8",
    );
    expect(authSrc).toContain("verificationTokensTable: authVerificationTokens");
    expect(authSrc).toContain("DrizzleAdapter");

    const schemaSrc = readFileSync(
      join(process.cwd(), "src/lib/db/schema.ts"),
      "utf8",
    );
    expect(schemaSrc).toContain('pgTable(\n  "verificationToken"');
    expect(schemaSrc).toContain("authVerificationTokens");

    const adapterSrc = readFileSync(
      join(process.cwd(), "node_modules/@auth/drizzle-adapter/lib/pg.js"),
      "utf8",
    );
    expect(adapterSrc).toMatch(/async useVerificationToken/);
    expect(adapterSrc).toMatch(
      /delete\(verificationTokensTable\)[\s\S]*returning/,
    );
  });

  test("create then use consumes; second use returns null", async () => {
    const identifier = "once-12-19@example.com";
    const token = "magic-token-12-19-once";
    const expires = new Date(Date.now() + 60_000);

    const created = await createMagicLinkVerificationToken({
      identifier,
      token,
      expires,
    });
    expect(created.identifier).toBe(identifier);
    expect(created.token).toBe(token);
    expect(peekMagicLinkVerificationToken({ identifier, token })).toBeTruthy();

    const first = await useMagicLinkVerificationToken({ identifier, token });
    expect(first).toEqual({
      identifier,
      token,
      expires,
    });
    expect(peekMagicLinkVerificationToken({ identifier, token })).toBeNull();

    const second = await useMagicLinkVerificationToken({ identifier, token });
    expect(second).toBeNull();

    const third = await useMagicLinkVerificationToken({ identifier, token });
    expect(third).toBeNull();
  });

  test("expired token cannot be consumed", async () => {
    const identifier = "expired-12-19@example.com";
    const token = "expired-token";
    await createMagicLinkVerificationToken({
      identifier,
      token,
      expires: new Date(Date.now() - 1_000),
    });
    const used = await useMagicLinkVerificationToken({ identifier, token });
    expect(used).toBeNull();
    expect(peekMagicLinkVerificationToken({ identifier, token })).toBeNull();
  });
});
