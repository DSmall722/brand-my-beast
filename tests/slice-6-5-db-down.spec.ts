import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
} from "../src/lib/campaign";
import {
  intentStoreUsesMemory,
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import { PUBLIC_COPY } from "../src/lib/public-copy";
import { joinWaitlist, resetWaitlistStoreForTests } from "../src/lib/waitlist";

const SUCCESS_CLAIM = /\b(you are on the list|joined|intent listed)\b/i;

/**
 * Slice 6.5 — failure copy when DB / write path is down.
 * Never claim join or listed intent if the write failed.
 */
test.describe("slice 6.5: DB-down failure copy", () => {
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

  test("waitlist + intent failure strings never claim success", () => {
    expect(PUBLIC_COPY.waitlist.unavailable.toLowerCase()).toContain(
      "not on the list",
    );
    expect(PUBLIC_COPY.waitlist.failed.toLowerCase()).toContain(
      "not on the list",
    );
    expect(PUBLIC_COPY.waitlist.unavailable.toLowerCase()).not.toMatch(
      /\bjoined\b/,
    );
    expect(PUBLIC_COPY.waitlist.failed.toLowerCase()).not.toMatch(/\bjoined\b/);
    expect(PUBLIC_COPY.waitlist.unavailable).not.toMatch(/you are on the list/i);
    expect(PUBLIC_COPY.waitlist.failed).not.toMatch(/you are on the list/i);
  });

  test("waitlist UI on 503 never shows joined / on the list", async ({
    page,
  }) => {
    await page.route("**/api/waitlist", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: PUBLIC_COPY.waitlist.unavailable,
          code: "unavailable",
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("waitlist-email").fill("db-down@example.com");
    await page.getByTestId("waitlist-submit").click();

    const status = page.getByTestId("waitlist-status");
    await expect(status).toHaveText(PUBLIC_COPY.waitlist.unavailable);
    await expect(status).toHaveClass(/is-error/);
    await expect(page.getByTestId("waitlist-next")).toHaveCount(0);

    const text = (await status.innerText()).toLowerCase();
    expect(text).not.toMatch(/\bjoined\b/);
    expect(text).not.toMatch(/you are on the list/);
    expect(text).toContain("not on the list");
  });

  test("waitlist UI on 500 never shows joined / on the list", async ({
    page,
  }) => {
    await page.route("**/api/waitlist", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          ok: false,
          error: PUBLIC_COPY.waitlist.failed,
          code: "failed",
        }),
      });
    });

    await page.goto("/");
    await page.getByTestId("waitlist-email").fill("write-fail@example.com");
    await page.getByTestId("waitlist-submit").click();

    const status = page.getByTestId("waitlist-status");
    await expect(status).toHaveText(PUBLIC_COPY.waitlist.failed);
    await expect(page.getByTestId("waitlist-next")).toHaveCount(0);
    const text = (await status.innerText()).toLowerCase();
    expect(text).not.toMatch(/\bjoined\b/);
    expect(text).not.toMatch(/you are on the list/);
  });

  test("intent postgres-without-db returns structured failure, not listed", async () => {
    await resetIntentStoreForTests();
    const prevMode = process.env.INTENT_MODE;
    const prevDb = process.env.DATABASE_URL;
    process.env.INTENT_MODE = "postgres";
    delete process.env.DATABASE_URL;

    expect(intentStoreUsesMemory()).toBe(false);

    try {
      const result = await placeIntentBid({
        panelId: "hood",
        userId: "user-db-down",
        brandLabel: "DB Down Co",
        tradeLabel: "failure-copy-trade",
        standingUsd: 2500,
      });
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.error.toLowerCase()).not.toMatch(/\bjoined\b/);
      expect(result.error.toLowerCase()).not.toMatch(/\bintent listed\b/);
      expect(result.error).toMatch(/not configured|could not record|no intent was saved/i);
    } finally {
      if (prevMode === undefined) delete process.env.INTENT_MODE;
      else process.env.INTENT_MODE = prevMode;
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
      await resetIntentStoreForTests();
    }
  });

  test("waitlist unavailable without db never returns ok", async () => {
    resetWaitlistStoreForTests();
    const prevMode = process.env.WAITLIST_MODE;
    const prevDb = process.env.DATABASE_URL;
    const prevNode = process.env.NODE_ENV;
    process.env.WAITLIST_MODE = "postgres";
    delete process.env.DATABASE_URL;
    process.env.NODE_ENV = "production";

    try {
      const result = await joinWaitlist("no-db@example.com");
      expect(result.ok).toBe(false);
      if (result.ok) return;
      expect(result.code).toBe("unavailable");
      expect(result.error.toLowerCase()).toContain("not on the list");
      expect(result.error.toLowerCase()).not.toMatch(/\bjoined\b/);
      expect(SUCCESS_CLAIM.test(result.error)).toBe(false);
    } finally {
      if (prevMode === undefined) delete process.env.WAITLIST_MODE;
      else process.env.WAITLIST_MODE = prevMode;
      if (prevDb === undefined) delete process.env.DATABASE_URL;
      else process.env.DATABASE_URL = prevDb;
      if (prevNode === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNode;
      resetWaitlistStoreForTests();
    }
  });
});
