import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import {
  findStripePackageNames,
  findStripePackagesInRootPackageJson,
  packageNameLooksLikeStripe,
  readRootPackageJson,
} from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 13.42 — CI fails if package.json gains stripe.
 * CLOSE_AT null. Hold-mode untouched. No Wave 15 wiring.
 */

test.describe("slice 13.42: CI fails if package.json gains stripe", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("unit: stripe package names are detected; unrelated deps are not", () => {
    expect(packageNameLooksLikeStripe("stripe")).toBe(true);
    expect(packageNameLooksLikeStripe("Stripe")).toBe(true);
    expect(packageNameLooksLikeStripe("@stripe/stripe-js")).toBe(true);
    expect(packageNameLooksLikeStripe("stripe-cli")).toBe(true);
    expect(packageNameLooksLikeStripe("next")).toBe(false);
    expect(packageNameLooksLikeStripe("@neondatabase/serverless")).toBe(false);
    expect(
      findStripePackageNames({
        dependencies: { next: "16.3.5", stripe: "^17.0.0" },
        devDependencies: { "@stripe/react-stripe-js": "^2.0.0" },
        optionalDependencies: { "nystripe-tool": "1.0.0" },
      }),
    ).toEqual(["stripe", "@stripe/react-stripe-js", "nystripe-tool"]);
    expect(
      findStripePackageNames({
        dependencies: { next: "16.3.5", resend: "^6.28.0" },
      }),
    ).toEqual([]);
  });

  test("root package.json has zero stripe dependencies — CI gate", () => {
    const pkg = readRootPackageJson();
    const hits = findStripePackagesInRootPackageJson();
    expect(hits).toEqual([]);
    expect(findStripePackageNames(pkg)).toEqual([]);
  });

  test("homepage still locked — no lease, money fences, public mail only", async ({
    request,
  }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("hello@brandmybeast.com");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
