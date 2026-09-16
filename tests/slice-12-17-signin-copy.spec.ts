import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { enabledAuthProviders } from "../src/lib/auth/mode";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { PUBLIC_COPY } from "../src/lib/public-copy";

/**
 * Slice 12.17 — sign-in page copy from PUBLIC_COPY.
 * No “test login” string in live mode. CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.17: sign-in PUBLIC_COPY; no test login in live", () => {
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

  test("PUBLIC_COPY.signIn strings match; live-facing copy has no test login", () => {
    const copy = PUBLIC_COPY.signIn;
    expect(copy.heading).toBe("Sign in");
    expect(copy.lead).toContain("does not charge cards");
    expect(copy.magicLinkHint).toContain("one-time link");
    expect(copy.magicLinkButton).toBe("Email me a sign-in link");
    expect(copy.credentialsButton).toBe("Sign in");
    expect(copy.missingProvidersLead).toContain("RESEND_API_KEY");

    const liveFacing = [
      copy.heading,
      copy.lead,
      copy.magicLinkHint,
      copy.magicLinkButton,
      copy.credentialsButton,
      copy.missingProvidersLead,
    ].join("\n");
    expect(liveFacing.toLowerCase()).not.toMatch(/test login/);
    expect(liveFacing.toLowerCase()).not.toMatch(/\blease\b/);
    expect(liveFacing).not.toMatch(/CLOSE_AT/);

    const md = readFileSync(join(process.cwd(), "PUBLIC_COPY.md"), "utf8");
    expect(md).toContain("## Sign in");
    expect(md).toContain(copy.lead);
  });

  test("live mode never enables test-login without hatch; live copy is clean", () => {
    expect(
      enabledAuthProviders({
        AUTH_MODE: "live",
        RESEND_API_KEY: "re_test",
        DATABASE_URL: "postgres://localhost/bmb",
      }),
    ).not.toContain("test-login");

    const pageSrc = readFileSync(
      join(process.cwd(), "src/app/signin/page.tsx"),
      "utf8",
    );
    expect(pageSrc).toContain("PUBLIC_COPY.signIn");
    expect(pageSrc).not.toMatch(/AUTH_ENABLE_TEST_LOGIN/);
    // Live missing-providers block uses PUBLIC_COPY only — no hatch env named in UI.
    expect(pageSrc).toContain("copy.missingProvidersLead");

    const authSrc = readFileSync(
      join(process.cwd(), "src/lib/auth/index.ts"),
      "utf8",
    );
    expect(authSrc.toLowerCase()).not.toMatch(/name:\s*"test login"/);
  });

  test("signin page renders PUBLIC_COPY lead in test mode", async ({
    page,
  }) => {
    await page.goto("/signin");
    await expect(page.getByTestId("signin-page")).toBeVisible();
    await expect(page.getByTestId("signin-lead")).toHaveText(
      PUBLIC_COPY.signIn.lead,
    );
    await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
    await expect(page.getByTestId("test-login-hint")).toContainText(
      PUBLIC_COPY.signIn.testHint,
    );
    await expect(page.getByTestId("signin-submit")).toHaveText(
      PUBLIC_COPY.signIn.credentialsButton,
    );

    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
    expect(html.toLowerCase()).not.toMatch(/test login/);
  });
});
