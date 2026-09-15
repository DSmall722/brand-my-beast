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
  buildOperatorDigest,
  formatOperatorDigestText,
  isAuthorizedCronRequest,
  operatorDigestRecipients,
  resetOperatorDigestMailerForTests,
  sendOperatorDigest,
  setOperatorDigestMailerForTests,
  type OperatorDigestMailPayload,
} from "../src/lib/operator-digest";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  joinWaitlist,
  resetWaitlistStoreForTests,
} from "../src/lib/waitlist";

/**
 * Slice 8.2 — operator digest function + cron route in repo.
 * Do not register a Vercel cron until the hold lifts.
 */
test.describe("slice 8.2: operator digest + cron route", () => {
  test.beforeEach(async () => {
    await resetIntentStoreForTests();
    resetWaitlistStoreForTests();
    resetOperatorDigestMailerForTests();
  });

  test.afterEach(async () => {
    await resetIntentStoreForTests();
    resetWaitlistStoreForTests();
    resetOperatorDigestMailerForTests();
    delete process.env.RESEND_API_KEY;
    delete process.env.CRON_SECRET;
    delete process.env.OPERATOR_EMAILS;
  });

  test("campaign money fences stay locked", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
  });

  test("package.json has no stripe; vercel.json has no crons", () => {
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

    const vercel = JSON.parse(
      readFileSync(join(process.cwd(), "vercel.json"), "utf8"),
    ) as { crons?: unknown };
    expect(vercel.crons).toBeUndefined();
  });

  test("buildOperatorDigest counts pending, waitlist, pledged", async () => {
    await joinWaitlist("digest-wl@example.com");
    const listed = await placeIntentBid({
      panelId: "hood",
      userId: "test:pending@example.com",
      brandLabel: "PendingCo",
      tradeLabel: "mugs",
      standingUsd: 2_500,
    });
    expect(listed.ok).toBe(true);

    const approve = await placeIntentBid({
      panelId: "tailgate",
      userId: "test:approved@example.com",
      brandLabel: "ApprovedCo",
      tradeLabel: "hats",
      standingUsd: 3_000,
    });
    expect(approve.ok).toBe(true);
    if (!approve.ok) return;
    await setIntentStatus(approve.bid.id, "approved");

    const digest = await buildOperatorDigest();
    expect(digest.pendingCount).toBeGreaterThanOrEqual(1);
    expect(digest.waitlistCount).toBeGreaterThanOrEqual(1);
    expect(digest.pledgedUsd).toBe(3_000);
    expect(digest.shortfallFloorUsd).toBe(FLOOR_USD - 3_000);
    expect(digest.shortfallGoalUsd).toBe(GOAL_USD - 3_000);
    expect(digest.floorUsd).toBe(58_000);
    expect(digest.goalUsd).toBe(120_000);
    expect(digest.closeAt).toBeNull();

    const text = formatOperatorDigestText(digest);
    expect(text).toContain("Pending intents:");
    expect(text).toContain("CLOSE_AT: null");
    expect(text).toContain("Does not post to X.");
    expect(text.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("sendOperatorDigest uses mocked Resend to hello@", async () => {
    const sent: OperatorDigestMailPayload[] = [];
    setOperatorDigestMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice82";
    delete process.env.OPERATOR_EMAILS;

    expect(operatorDigestRecipients({})).toEqual([BRAND.email]);
    const result = await sendOperatorDigest();
    expect(result.skipped).toBe(false);
    expect(result.sent).toBe(1);
    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("hello@brandmybeast.com");
    expect(sent[0]!.from).toContain("hello@brandmybeast.com");
    expect(sent[0]!.text.toLowerCase()).not.toMatch(/\blease\b/);
  });

  test("cron route requires Bearer CRON_SECRET; runs digest when authorized", async ({
    request,
  }) => {
    expect(
      isAuthorizedCronRequest(
        new Request("http://localhost/api/cron/operator-digest", {
          headers: { authorization: "Bearer wrong" },
        }),
        { CRON_SECRET: "expected" },
      ),
    ).toBe(false);
    expect(
      isAuthorizedCronRequest(
        new Request("http://localhost/api/cron/operator-digest"),
        {},
      ),
    ).toBe(false);

    const denied = await request.get("/api/cron/operator-digest");
    expect(denied.status()).toBe(401);

    const stillDenied = await request.get("/api/cron/operator-digest", {
      headers: { authorization: "Bearer wrong" },
    });
    expect(stillDenied.status()).toBe(401);

    const sent: OperatorDigestMailPayload[] = [];
    setOperatorDigestMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice82";

    // CRON_SECRET is set on the Playwright webServer (playwright.config.ts).
    const ok = await request.get("/api/cron/operator-digest", {
      headers: { authorization: "Bearer playwright-cron-secret" },
    });
    expect(ok.status()).toBe(200);
    const body = (await ok.json()) as {
      ok: boolean;
      digest: { floorUsd: number; goalUsd: number; closeAt: string | null };
    };
    expect(body.ok).toBe(true);
    expect(body.digest.floorUsd).toBe(58_000);
    expect(body.digest.goalUsd).toBe(120_000);
    expect(body.digest.closeAt).toBeNull();
  });
});
