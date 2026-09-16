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
  hashEmailForLog,
  logMagicLinkRequest,
  resetStructuredLogsForTests,
} from "../src/lib/structured-log";

/**
 * Slice 13.34 — magic-link request logs hashed email only (ties 12.41).
 * CLOSE_AT null. No Stripe. Hold-mode untouched.
 */

test.describe("slice 13.34: magic-link request hashed email log", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    resetStructuredLogsForTests();
    const res = await request.post("/api/test/rate-limit", {
      data: { reset: true },
    });
    expect(res.ok()).toBeTruthy();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
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

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { git?: { deploymentEnabled?: boolean } };
    expect(vercel.git?.deploymentEnabled).toBe(false);
  });

  test("logMagicLinkRequest stores hash only — never raw email", () => {
    const email = "magic-link-1334@brandmybeast.com";
    const entry = logMagicLinkRequest(email, "requested");
    expect(entry.event).toBe("magic-link.request");
    expect(entry.status).toBe("requested");
    expect(entry.emailHash).toBe(hashEmailForLog(email));
    expect(entry.emailHash).toHaveLength(16);
    const blob = JSON.stringify(entry);
    expect(blob.toLowerCase()).not.toContain(email.toLowerCase());
    expect(blob).not.toMatch(/@brandmybeast\.com/i);
    expect(blob).not.toMatch(/gmail\.com/i);

    const limited = logMagicLinkRequest(email, "rate_limited");
    expect(limited.status).toBe("rate_limited");
    expect(limited.emailHash).toBe(hashEmailForLog(email));
  });

  test("auth action + test harness wire hashed magic-link logs", () => {
    const authSrc = readFileSync(
      join(process.cwd(), "src/app/actions/auth.ts"),
      "utf8",
    );
    expect(authSrc).toContain("logMagicLinkRequest");
    expect(authSrc).toContain('"rate_limited"');
    expect(authSrc).toContain('"requested"');

    const harnessSrc = readFileSync(
      join(process.cwd(), "src/app/api/test/magic-link-rate/route.ts"),
      "utf8",
    );
    expect(harnessSrc).toContain("logMagicLinkRequest");
  });

  test("POST /api/test/magic-link-rate accepts request without echoing email", async ({
    request,
  }) => {
    const email = `slice-1334-${Date.now()}@example.com`;
    const res = await request.post("/api/test/magic-link-rate", {
      data: { email },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      ok: boolean;
      emailed?: boolean;
      note?: string;
    };
    expect(body.ok).toBe(true);
    expect(body.emailed).toBe(false);
    const raw = JSON.stringify(body).toLowerCase();
    expect(raw).not.toContain(email.toLowerCase());
    expect(raw).not.toMatch(/@example\.com/);
  });
});
