import { existsSync, readFileSync } from "node:fs";
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
import {
  DRIZZLE_JOURNAL_RELATIVE,
  findDrizzleJournalViolations,
  listDrizzleMigrationFiles,
  readDrizzleJournal,
} from "../src/lib/drizzle-migrations";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 13.44 — Drizzle journal checked in.
 * No “push from laptop” as the only path. CLOSE_AT null. No Stripe.
 */

const RUNBOOK = join(process.cwd(), "docs/DRIZZLE-MIGRATE.md");
const JOURNAL = join(process.cwd(), DRIZZLE_JOURNAL_RELATIVE);

test.describe("slice 13.44: Drizzle journal checked in", () => {
  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(findCloseAtViolations()).toEqual([]);
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
  });

  test("package.json has no stripe", () => {
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });

  test("vercel.json hold-mode stays deploymentEnabled false", () => {
    expect(vercelJsonIsHoldOrMainOnlyRestore()).toBe(true);
  });

  test("drizzle/meta/_journal.json exists and matches every SQL tag", () => {
    expect(existsSync(JOURNAL)).toBe(true);
    expect(findDrizzleJournalViolations()).toEqual([]);
    const journal = readDrizzleJournal();
    expect(journal.dialect).toBe("postgresql");
    expect(journal.entries.length).toBe(listDrizzleMigrationFiles().length);
    expect(journal.entries.length).toBeGreaterThanOrEqual(20);
    expect(journal.entries.at(-1)?.tag).toBe("0020_waitlist_want_whole_truck");
  });

  test("runbook says journal is checked in; laptop db:push is not the only path", () => {
    expect(existsSync(RUNBOOK)).toBe(true);
    const text = readFileSync(RUNBOOK, "utf8");
    expect(text).toContain("13.44");
    expect(text).toContain("drizzle/meta/_journal.json");
    expect(text).toMatch(/checked[\s-]?in/i);
    expect(text).toMatch(/db:push/i);
    expect(text).toMatch(/not the (production|only) path|not the only way/i);
    expect(text).toMatch(/\$58,000/);
    expect(text).toMatch(/\$120,000/);
    expect(text).toMatch(/CLOSE_AT/);
    expect(text).toMatch(/No lease/i);
    expect(text.toLowerCase()).not.toContain("gmail.com");
    expect(text.toLowerCase()).not.toContain("stripe setupintent");
  });

  test("homepage still locked while journal lands", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).toContain("BrandMyBeast");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).not.toContain("CLOSE_AT");
  });
});
