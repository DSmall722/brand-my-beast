import { expect, test } from "@playwright/test";
import {
  failedWinnerEmailSubject,
  intentStatusEmailTemplate,
} from "../src/emails/intent-status";
import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  formatUsd,
} from "../src/lib/campaign";
import { findCloseAtViolations } from "../src/lib/close-at-null";
import type { IntentBid } from "../src/lib/intent";
import {
  placeIntentBid,
  resetIntentStoreForTests,
} from "../src/lib/intent-store";
import {
  resetIntentStatusMailerForTests,
  setIntentStatusMailerForTests,
  type IntentStatusMailPayload,
} from "../src/lib/intent-status-mail";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { panelBoardMarkFor } from "../src/lib/panel-board";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";

/**
 * Slice 16.26 — failed-winner (outbid) email subject includes the panel number.
 * FEATURES.md stays off /. CLOSE_AT null. No Stripe.
 */

const PANEL_ID = "driver-door" as const;

function sampleBid(): IntentBid {
  return {
    id: "bid-1626",
    panelId: PANEL_ID,
    userId: "test:outbid1626@example.com",
    brandLabel: "Subject Co",
    tradeLabel: "subject trade",
    standingUsd: 1600,
    depositUsd: 320,
    status: "outbid",
    createdAt: "2026-09-18T00:00:00.000Z",
    updatedAt: "2026-09-18T00:00:00.000Z",
    artworkUrl: null,
    proxyMaxUsd: null,
    floorSaveUsd: null,
    idempotencyKey: null,
    deletedAt: null,
  };
}

test.describe("slice 16.26: failed-winner email subject includes panel number", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    resetIntentStatusMailerForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(() => {
    resetIntentStatusMailerForTests();
    delete process.env.RESEND_API_KEY;
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

  test("outbid subject is the board number, not only the slug", () => {
    const mark = panelBoardMarkFor(PANEL_ID);
    expect(mark.n).toBe(3);
    const subject = failedWinnerEmailSubject(PANEL_ID);
    expect(subject).toBe(`Outbid on ${mark.n} · ${mark.name}`);
    expect(subject).toContain(String(mark.n));
    expect(subject).not.toBe(`Outbid on ${PANEL_ID}`);

    const mail = intentStatusEmailTemplate({
      kind: "outbid",
      bid: sampleBid(),
      nextMinimumUsd: 1760,
    });
    expect(mail.subject).toBe(subject);
    expect(mail.text.toLowerCase()).toContain("no card was charged");
    expect(mail.text.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("outbid mail send uses the numbered subject", async () => {
    const mark = panelBoardMarkFor(PANEL_ID);
    const sent: IntentStatusMailPayload[] = [];
    setIntentStatusMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice1626";

    const first = await placeIntentBid({
      panelId: PANEL_ID,
      userId: "test:first1626@example.com",
      brandLabel: "First 1626",
      tradeLabel: "first trade",
      standingUsd: 1600,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const second = await placeIntentBid({
      panelId: PANEL_ID,
      userId: "test:second1626@example.com",
      brandLabel: "Second 1626",
      tradeLabel: "second trade",
      standingUsd: 2000,
    });
    expect(second.ok).toBe(true);

    const outbidMail = sent.find(
      (mail) =>
        mail.to === "first1626@example.com" &&
        mail.subject.toLowerCase().includes("outbid"),
    );
    expect(outbidMail).toBeTruthy();
    expect(outbidMail!.subject).toBe(failedWinnerEmailSubject(PANEL_ID));
    expect(outbidMail!.subject).toContain(String(mark.n));
    expect(outbidMail!.subject).toContain(mark.name);
    expect(outbidMail!.text.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("homepage still does not render FEATURES.md", async ({ request }) => {
    const res = await request.get("/");
    expect(res.ok()).toBeTruthy();
    const html = await res.text();
    expect(html).not.toContain("FEATURES.md");
    expect(html).toContain("$58,000");
    expect(html).toContain("$120,000");
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
  });
});
