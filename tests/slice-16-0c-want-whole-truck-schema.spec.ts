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
import { loadBoardIntentStats } from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  getWaitlistByEmail,
  joinWaitlist,
  resetWaitlistStoreForTests,
  waitlistStoreUsesMemory,
} from "../src/lib/waitlist";

/**
 * Slice 16.0c — waitlist_signups.want_whole_truck boolean default false.
 * Memory store carries the same field. No pledged math change.
 * API accept is 16.0d. CLOSE_AT null. No Stripe. SEATS_OPEN untouched.
 */

const MIGRATION = join(
  process.cwd(),
  "drizzle/0020_waitlist_want_whole_truck.sql",
);
const SCHEMA = join(process.cwd(), "src/lib/db/schema.ts");
const JOURNAL = join(process.cwd(), "drizzle/meta/_journal.json");

test.describe("slice 16.0c: want_whole_truck waitlist column", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(() => {
    process.env.WAITLIST_MODE = "memory";
    resetWaitlistStoreForTests();
  });

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

  test("migration + schema declare want_whole_truck default false", () => {
    expect(existsSync(MIGRATION)).toBe(true);
    const sql = readFileSync(MIGRATION, "utf8");
    expect(sql).toMatch(/want_whole_truck/);
    expect(sql).toMatch(/boolean/i);
    expect(sql).toMatch(/DEFAULT false/i);
    expect(sql).toMatch(/16\.0c/);

    const schema = readFileSync(SCHEMA, "utf8");
    expect(schema).toMatch(/wantWholeTruck:\s*boolean\("want_whole_truck"\)/);
    expect(schema).toMatch(/\.default\(false\)/);

    const journal = readFileSync(JOURNAL, "utf8");
    expect(journal).toContain("0020_waitlist_want_whole_truck");
  });

  test("memory join defaults wantWholeTruck false; pledged stats unchanged", async () => {
    expect(waitlistStoreUsesMemory({ WAITLIST_MODE: "memory" })).toBe(true);

    const before = await loadBoardIntentStats();
    expect(before.pledgedUsd).toBe(0);

    const joined = await joinWaitlist("want-whole-16c@example.com");
    expect(joined.ok).toBe(true);
    if (!joined.ok) return;
    expect(joined.status).toBe("created");

    const row = await getWaitlistByEmail("want-whole-16c@example.com");
    expect(row).not.toBeNull();
    expect(row?.wantWholeTruck).toBe(false);

    const after = await loadBoardIntentStats();
    expect(after.pledgedUsd).toBe(0);
    expect(after.pledgedUsd).toBe(before.pledgedUsd);
  });
});
