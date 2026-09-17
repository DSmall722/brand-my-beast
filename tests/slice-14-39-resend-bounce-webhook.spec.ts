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
import {
  listMailDeadLetters,
  resetMailDeadLettersForTests,
} from "../src/lib/mail-dead-letter";
import { findStripePackagesInRootPackageJson } from "../src/lib/no-stripe-package";
import { vercelJsonIsHoldOrMainOnlyRestore } from "../src/lib/vercel-git-deploy";
import {
  RESEND_BOUNCE_EVENT,
  handleResendBounceWebhookBody,
  isAuthorizedResendWebhook,
} from "../src/lib/resend-bounce-webhook";

/**
 * Slice 14.39 — Resend webhook route for bounces → dead-letter.
 * No live hook required to merge. CLOSE_AT null. No Stripe. No clock.
 */

const ROOT = process.cwd();

test.describe("slice 14.39: Resend bounce webhook → dead-letter", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ request }) => {
    process.env.INTENT_MODE = "memory";
    delete process.env.RESEND_WEBHOOK_SECRET;
    resetMailDeadLettersForTests();
    const res = await request.post("/api/test/reset-intents");
    expect(res.ok()).toBeTruthy();
  });

  test.afterEach(() => {
    delete process.env.RESEND_WEBHOOK_SECRET;
    resetMailDeadLettersForTests();
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

  test("unit: bounce body appends dead-letter; other events ignored", async () => {
    expect(RESEND_BOUNCE_EVENT).toBe("email.bounced");
    expect(
      isAuthorizedResendWebhook(
        new Request("http://localhost/api/webhooks/resend", { method: "POST" }),
        {},
      ),
    ).toBe(true);
    expect(
      isAuthorizedResendWebhook(
        new Request("http://localhost/api/webhooks/resend", {
          method: "POST",
          headers: { Authorization: "Bearer wrong" },
        }),
        { RESEND_WEBHOOK_SECRET: "secret-1439" },
      ),
    ).toBe(false);
    expect(
      isAuthorizedResendWebhook(
        new Request("http://localhost/api/webhooks/resend", {
          method: "POST",
          headers: { Authorization: "Bearer secret-1439" },
        }),
        { RESEND_WEBHOOK_SECRET: "secret-1439" },
      ),
    ).toBe(true);

    const ignored = await handleResendBounceWebhookBody({
      type: "email.delivered",
      data: { to: ["x@example.com"] },
    });
    expect(ignored.ok).toBe(true);
    if (ignored.ok) expect(ignored.ignored).toBe(true);

    const bounced = await handleResendBounceWebhookBody({
      type: "email.bounced",
      data: {
        email_id: "re_bounce_1439",
        from: "BrandMyBeast <hello@brandmybeast.com>",
        to: ["bounce-target@example.com"],
        subject: "Seats open",
        bounce: { message: "550 mailbox unavailable" },
      },
    });
    expect(bounced.ok).toBe(true);
    if (!bounced.ok || bounced.ignored) return;
    expect(bounced.row.kind).toBe("bounce");
    expect(bounced.row.toAddress).toBe("bounce-target@example.com");
    expect(bounced.row.error).toContain("550");
    expect(bounced.row.bodyText).toContain("email_id=re_bounce_1439");
    expect(bounced.row.bodyText.toLowerCase()).not.toMatch(/\blease\b/);

    const listed = await listMailDeadLetters();
    expect(listed.some((row) => row.id === bounced.row.id)).toBe(true);
  });

  test("POST /api/webhooks/resend bounce → dead-letter; delivered ignored", async ({
    request,
  }) => {
    const delivered = await request.post("/api/webhooks/resend", {
      data: {
        type: "email.delivered",
        data: { to: ["ok@example.com"] },
      },
    });
    expect(delivered.status()).toBe(200);
    const deliveredJson = (await delivered.json()) as {
      ok: boolean;
      ignored?: boolean;
    };
    expect(deliveredJson.ok).toBe(true);
    expect(deliveredJson.ignored).toBe(true);

    const bounce = await request.post("/api/webhooks/resend", {
      data: {
        type: "email.bounced",
        data: {
          email_id: "re_api_1439",
          from: "BrandMyBeast <hello@brandmybeast.com>",
          to: ["api-bounce@example.com"],
          subject: "Intent listed",
          bounce: { message: "hard bounce" },
        },
      },
    });
    expect(bounce.status()).toBe(200);
    const bounceJson = (await bounce.json()) as {
      ok: boolean;
      ignored: boolean;
      deadLetterId?: string;
      kind?: string;
    };
    expect(bounceJson.ok).toBe(true);
    expect(bounceJson.ignored).toBe(false);
    expect(bounceJson.kind).toBe("bounce");
    expect(bounceJson.deadLetterId).toBeTruthy();

    const routeSrc = readFileSync(
      join(ROOT, "src/app/api/webhooks/resend/route.ts"),
      "utf8",
    );
    expect(routeSrc).toContain("14.39");
    expect(findStripePackagesInRootPackageJson()).toEqual([]);
  });
});
