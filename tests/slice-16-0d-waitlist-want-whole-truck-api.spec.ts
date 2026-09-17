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
import { loadBoardIntentStats } from "../src/lib/intent-store";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  getWaitlistByEmail,
  joinWaitlist,
  resetWaitlistStoreForTests,
} from "../src/lib/waitlist";

/**
 * Slice 16.0d — POST /api/waitlist accepts optional wantWholeTruck.
 * Invalid email still 400. Created 201 / exists 200. Not pledged.
 * CLOSE_AT null. No Stripe. SEATS_OPEN untouched.
 */

test.describe("slice 16.0d: waitlist API wantWholeTruck", () => {
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

  test("joinWaitlist stores wantWholeTruck; pledged stats stay $0", async () => {
    const before = await loadBoardIntentStats();
    expect(before.pledgedUsd).toBe(0);

    const created = await joinWaitlist("unit-16d-want@example.com", {
      wantWholeTruck: true,
    });
    expect(created).toEqual({ ok: true, status: "created" });
    expect(
      (await getWaitlistByEmail("unit-16d-want@example.com"))?.wantWholeTruck,
    ).toBe(true);

    const plain = await joinWaitlist("unit-16d-plain@example.com");
    expect(plain).toEqual({ ok: true, status: "created" });
    expect(
      (await getWaitlistByEmail("unit-16d-plain@example.com"))?.wantWholeTruck,
    ).toBe(false);

    const after = await loadBoardIntentStats();
    expect(after.pledgedUsd).toBe(0);
  });

  test("POST /api/waitlist accepts wantWholeTruck; invalid 400; created 201; exists 200", async ({
    request,
  }) => {
    const stamp = Date.now();
    const email = `api-16d-want-${stamp}@example.com`;

    const invalid = await request.post("/api/waitlist", {
      data: { email: "not-an-email", wantWholeTruck: true },
    });
    expect(invalid.status()).toBe(400);

    const created = await request.post("/api/waitlist", {
      data: { email, wantWholeTruck: true },
    });
    expect(created.status()).toBe(201);
    expect(await created.json()).toEqual({ ok: true, status: "created" });

    const exists = await request.post("/api/waitlist", {
      data: { email, wantWholeTruck: true },
    });
    expect(exists.status()).toBe(200);
    expect(await exists.json()).toEqual({ ok: true, status: "exists" });

    const omitted = await request.post("/api/waitlist", {
      data: { email: `api-16d-plain-${stamp}@example.com` },
    });
    expect(omitted.status()).toBe(201);

    const route = readFileSync(
      join(process.cwd(), "src/app/api/waitlist/route.ts"),
      "utf8",
    );
    expect(route).toMatch(/wantWholeTruck/);
    expect(route).not.toMatch(/loadBoardIntentStats/);

    const after = await loadBoardIntentStats();
    expect(after.pledgedUsd).toBe(0);
  });
});
