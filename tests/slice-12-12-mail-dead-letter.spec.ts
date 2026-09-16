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
  appendMailDeadLetter,
  listMailDeadLetters,
  mailDeadLetterUsesMemory,
  resetMailDeadLettersForTests,
  retryMailDeadLetter,
  setMailDeadLetterMailerForTests,
} from "../src/lib/mail-dead-letter";
import {
  notifyIntentStatus,
  setIntentStatusMailerForTests,
} from "../src/lib/intent-status-mail";
import type { IntentBid } from "../src/lib/intent";

/**
 * Slice 12.12 — dead-letter for failed Resend; operator can retry.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.12: mail dead-letter + operator retry", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    resetMailDeadLettersForTests();
    setIntentStatusMailerForTests(null);
    setMailDeadLetterMailerForTests(null);
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(() => {
    setIntentStatusMailerForTests(null);
    setMailDeadLetterMailerForTests(null);
    resetMailDeadLettersForTests();
  });

  test("campaign money fences stay locked — CLOSE_AT null", () => {
    expect(FLOOR_USD).toBe(58_000);
    expect(GOAL_USD).toBe(120_000);
    expect(CLOSE_AT).toBeNull();
    expect(BRAND.name).toBe("BrandMyBeast");
    expect(formatUsd(FLOOR_USD)).toBe("$58,000");
    expect(formatUsd(GOAL_USD)).toBe("$120,000");
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

  test("Production never uses mail dead-letter memory", () => {
    expect(mailDeadLetterUsesMemory({ VERCEL_ENV: "production" })).toBe(false);
    expect(
      mailDeadLetterUsesMemory({
        VERCEL_ENV: "production",
        INTENT_MODE: "memory",
      }),
    ).toBe(false);
    expect(mailDeadLetterUsesMemory({ INTENT_MODE: "memory" })).toBe(true);
  });

  test("migration creates mail_dead_letters table", () => {
    const sql = readFileSync(
      join(process.cwd(), "drizzle/0017_mail_dead_letters.sql"),
      "utf8",
    );
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS "mail_dead_letters"/);
    expect(sql).toMatch(/"kind"/);
    expect(sql).toMatch(/"body_text"/);
    expect(sql).toMatch(/"status"/);
    expect(sql.toLowerCase()).not.toMatch(/payment_method/);
    expect(sql).not.toMatch(/\bCLOSE_AT\b/);
  });

  test("failed intent status send lands in dead-letter; retry clears it", async () => {
    setIntentStatusMailerForTests({
      send: async () => {
        throw new Error("Resend 429");
      },
    });

    const bid: IntentBid = {
      id: "bid-12-12",
      panelId: "hood",
      userId: "test:deadletter@example.com",
      brandLabel: "Dead Co",
      tradeLabel: "dead trade",
      standingUsd: 2500,
      depositUsd: 500,
      status: "listed",
      createdAt: "2026-09-16T00:00:00.000Z",
      updatedAt: "2026-09-16T00:00:00.000Z",
      artworkUrl: null,
      proxyMaxUsd: null,
      floorSaveUsd: null,
      idempotencyKey: null,
      deletedAt: null,
    };

    await notifyIntentStatus({ kind: "listed", bid });
    const queued = await listMailDeadLetters();
    expect(queued).toHaveLength(1);
    expect(queued[0]?.kind).toBe("intent-status");
    expect(queued[0]?.status).toBe("pending");
    expect(queued[0]?.error).toMatch(/429/);
    expect(queued[0]?.toAddress).toBe("deadletter@example.com");

    const sent: Array<{ to: string; subject: string }> = [];
    setMailDeadLetterMailerForTests({
      send: async (payload) => {
        sent.push({ to: payload.to, subject: payload.subject });
      },
    });

    const retried = await retryMailDeadLetter(queued[0]!.id);
    expect(retried.ok).toBe(true);
    if (!retried.ok) return;
    expect(retried.row.status).toBe("sent");
    expect(retried.row.retriedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe("deadletter@example.com");
  });

  test("appendMailDeadLetter stores operator-digest kind", async () => {
    const row = await appendMailDeadLetter({
      kind: "operator-digest",
      from: "hello@brandmybeast.com",
      to: "hello@brandmybeast.com",
      subject: "digest",
      text: "body",
      error: new Error("timeout"),
    });
    expect(row.status).toBe("pending");
    expect(row.kind).toBe("operator-digest");
    const listed = await listMailDeadLetters();
    expect(listed.some((item) => item.id === row.id)).toBe(true);
  });
});
