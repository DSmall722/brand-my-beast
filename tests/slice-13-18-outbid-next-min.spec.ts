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
import { intentStatusEmailTemplate } from "../src/emails/intent-status";
import { nextStandingUsd, type IntentBid } from "../src/lib/intent";
import {
  buildIntentStatusMail,
  resetIntentStatusMailerForTests,
  setIntentStatusMailerForTests,
  type IntentStatusMailPayload,
} from "../src/lib/intent-status-mail";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

function sampleBid(overrides: Partial<IntentBid> = {}): IntentBid {
  return {
    id: "bid-1318",
    panelId: "hood",
    userId: "test:outbid@example.com",
    brandLabel: "Outbid Co",
    tradeLabel: "outbid tools",
    standingUsd: 2500,
    depositUsd: 500,
    status: "outbid",
    createdAt: "2026-09-16T12:00:00.000Z",
    updatedAt: "2026-09-16T12:00:00.000Z",
    artworkUrl: null,
    proxyMaxUsd: null,
    floorSaveUsd: null,
    idempotencyKey: null,
    deletedAt: null,
    ...overrides,
  };
}

/**
 * Slice 13.18 — outbid email includes next minimum (9.2).
 */
test.describe("slice 13.18: outbid email includes next minimum", () => {
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
    const raw = readFileSync(join(process.cwd(), "vercel.json"), "utf8");
    const cfg = JSON.parse(raw) as {
      git?: { deploymentEnabled?: boolean | Record<string, boolean> };
    };
    expect(cfg.git?.deploymentEnabled).toBe(false);
  });

  test("template includes next minimum from 9.2 math", () => {
    const standing = 3000;
    const nextMin = nextStandingUsd(standing);
    expect(nextMin).toBe(3300);

    const mail = intentStatusEmailTemplate({
      kind: "outbid",
      bid: sampleBid({ standingUsd: 2500 }),
      nextMinimumUsd: nextMin,
    });
    expect(mail.subject).toMatch(/Outbid/i);
    expect(mail.text).toContain("Next minimum to reclaim the seat: $3,300.");
    expect(mail.text.toLowerCase()).toContain("no card was charged");
    expect(mail.text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(
      buildIntentStatusMail({
        kind: "outbid",
        bid: sampleBid({ standingUsd: 2500 }),
        nextMinimumUsd: nextMin,
      }),
    ).toEqual(mail);
  });

  test("placeIntentBid outbid mail carries next minimum", async () => {
    const sent: IntentStatusMailPayload[] = [];
    setIntentStatusMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice1318";

    const first = await placeIntentBid({
      panelId: "hood",
      userId: "test:first1318@example.com",
      brandLabel: "First 1318",
      tradeLabel: "first snacks",
      standingUsd: 2500,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    const challengerStanding = 3000;
    const expectedNext = nextStandingUsd(challengerStanding);
    expect(expectedNext).toBe(3300);

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "test:second1318@example.com",
      brandLabel: "Second 1318",
      tradeLabel: "second tools",
      standingUsd: challengerStanding,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    const outbidMail = sent.find(
      (mail) =>
        mail.to === "first1318@example.com" &&
        mail.subject.toLowerCase().includes("outbid"),
    );
    expect(outbidMail).toBeTruthy();
    expect(outbidMail!.text).toContain(
      `Next minimum to reclaim the seat: ${formatUsd(expectedNext)}.`,
    );
    expect(outbidMail!.text.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("approve demotion outbid mail carries next minimum", async () => {
    const sent: IntentStatusMailPayload[] = [];
    setIntentStatusMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice1318b";

    const prior = await placeIntentBid({
      panelId: "tailgate",
      userId: "test:prior1318@example.com",
      brandLabel: "Prior 1318",
      tradeLabel: "prior snacks",
      standingUsd: 2500,
    });
    expect(prior.ok).toBe(true);
    if (!prior.ok) return;
    await setIntentStatus(prior.bid.id, "approved", { note: "seat" });

    const challenger = await placeIntentBid({
      panelId: "tailgate",
      userId: "test:chal1318@example.com",
      brandLabel: "Chal 1318",
      tradeLabel: "chal tools",
      standingUsd: 2750,
    });
    expect(challenger.ok).toBe(true);
    if (!challenger.ok) return;

    sent.length = 0;
    const approved = await setIntentStatus(challenger.bid.id, "approved", {
      note: "new seat",
    });
    expect(approved.ok).toBe(true);

    const expectedNext = nextStandingUsd(2750);
    const outbidMail = sent.find(
      (mail) =>
        mail.to === "prior1318@example.com" &&
        mail.subject.toLowerCase().includes("outbid"),
    );
    expect(outbidMail).toBeTruthy();
    expect(outbidMail!.text).toContain(
      `Next minimum to reclaim the seat: ${formatUsd(expectedNext)}.`,
    );
  });

  test("homepage HTML has no lease", async ({ page }) => {
    await page.goto("/");
    const html = await page.content();
    expect(html.toLowerCase()).not.toMatch(/\blease\b/);
    expect(html).toContain("BrandMyBeast");
  });
});
