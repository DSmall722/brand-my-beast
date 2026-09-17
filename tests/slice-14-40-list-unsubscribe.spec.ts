import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  CAN_SPAM_UNSUBSCRIBE_URL,
  waitlistListUnsubscribeHeaders,
} from "../src/emails";
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
import {
  joinWaitlist,
  resetWaitlistStoreForTests,
  setWaitlistMailerForTests,
  type WaitlistNotifyPayload,
} from "../src/lib/waitlist";

/**
 * Slice 14.40 — List-Unsubscribe header on waitlist mail.
 * CLOSE_AT null. No Stripe. Hold-mode untouched. No 30-day clock.
 */

const ROOT = process.cwd();

test.describe("slice 14.40: List-Unsubscribe on waitlist mail", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.WAITLIST_MODE = "memory";
    process.env.INTENT_MODE = "memory";
    resetWaitlistStoreForTests();
    setWaitlistMailerForTests(null);
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(() => {
    setWaitlistMailerForTests(null);
    resetWaitlistStoreForTests();
  });

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

  test("waitlistListUnsubscribeHeaders pin URL + One-Click", () => {
    const headers = waitlistListUnsubscribeHeaders();
    expect(headers["List-Unsubscribe"]).toContain(
      `<${CAN_SPAM_UNSUBSCRIBE_URL}>`,
    );
    expect(headers["List-Unsubscribe"]).toContain(
      `<mailto:${BRAND.email}?subject=unsubscribe>`,
    );
    expect(headers["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
  });

  test("waitlist confirm mail includes List-Unsubscribe headers", async () => {
    const sent: WaitlistNotifyPayload[] = [];
    setWaitlistMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "test" };
      },
    });

    const result = await joinWaitlist("list-unsub-1440@example.com");
    expect(result.ok).toBe(true);

    const confirm = sent.find((p) =>
      p.to.toLowerCase().includes("list-unsub-1440@example.com"),
    );
    expect(confirm).toBeTruthy();
    expect(confirm?.headers?.["List-Unsubscribe"]).toContain(
      CAN_SPAM_UNSUBSCRIBE_URL,
    );
    expect(confirm?.headers?.["List-Unsubscribe-Post"]).toBe(
      "List-Unsubscribe=One-Click",
    );
    expect(confirm?.text.toLowerCase()).not.toMatch(/\blease\b/);

    const waitlistSrc = readFileSync(
      join(ROOT, "src/lib/waitlist.ts"),
      "utf8",
    );
    expect(waitlistSrc).toContain("waitlistListUnsubscribeHeaders");
    expect(waitlistSrc).toContain("14.40");
  });
});
