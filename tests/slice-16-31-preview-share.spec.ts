import { spawnSync } from "node:child_process";
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
import { findCloseAtViolations } from "../src/lib/close-at-null";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.31 — `npm run preview:share` prints the local URL
 * and "not the live domain." CLOSE_AT null. No Stripe.
 */

const NOTICE = "not the live domain.";

function previewShareOutput(port?: string): string {
  const env = { ...process.env };
  if (port === undefined) {
    delete env.PORT;
  } else {
    env.PORT = port;
  }
  const result = spawnSync("npm", ["run", "preview:share"], {
    cwd: process.cwd(),
    env,
    encoding: "utf8",
  });
  expect(result.status).toBe(0);
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

test.describe("slice 16.31: preview:share prints the local URL", () => {
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

  test("preview:share prints localhost and not the live domain", () => {
    const pkg = JSON.parse(
      readFileSync(join(process.cwd(), "package.json"), "utf8"),
    ) as { scripts?: { "preview:share"?: string } };
    expect(pkg.scripts?.["preview:share"]).toBe(
      "node scripts/preview-share.mjs",
    );

    const fallback = previewShareOutput();
    expect(fallback).toContain("http://localhost:3000");
    expect(fallback).toContain(NOTICE);
    expect(fallback).not.toContain("brandmybeast.com");
    expect(fallback.toLowerCase()).not.toMatch(/\blease\b/);

    const custom = previewShareOutput("4017");
    expect(custom).toContain("http://localhost:4017");
    expect(custom).toContain(NOTICE);
    expect(custom).not.toContain("http://localhost:3000");
  });
});
