import { readdirSync, readFileSync } from "node:fs";
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
  intentStatusEmailTemplate,
  operatorDigestEmailTemplate,
  waitlistOperatorEmailTemplate,
} from "../src/emails";
import { buildIntentStatusMail } from "../src/lib/intent-status-mail";
import { formatOperatorDigestText } from "../src/lib/operator-digest";
import type { IntentBid } from "../src/lib/intent";

/**
 * Slice 12.11 — email templates as files under src/emails/.
 * CLOSE_AT null. No Stripe.
 */
test.describe("slice 12.11: email templates under src/emails/", () => {
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

  test("src/emails holds template modules", () => {
    const dir = join(process.cwd(), "src/emails");
    const files = readdirSync(dir).sort();
    expect(files).toEqual(
      expect.arrayContaining([
        "index.ts",
        "intent-status.ts",
        "operator-digest.ts",
        "waitlist-operator.ts",
      ]),
    );
  });

  test("mail builders delegate to src/emails templates", () => {
    const intentSrc = readFileSync(
      join(process.cwd(), "src/lib/intent-status-mail.ts"),
      "utf8",
    );
    const waitlistSrc = readFileSync(
      join(process.cwd(), "src/lib/waitlist.ts"),
      "utf8",
    );
    const digestSrc = readFileSync(
      join(process.cwd(), "src/lib/operator-digest.ts"),
      "utf8",
    );
    expect(intentSrc).toMatch(/from ["']@\/emails\/intent-status["']/);
    expect(intentSrc).toMatch(/intentStatusEmailTemplate/);
    expect(waitlistSrc).toMatch(/from ["']@\/emails\/waitlist-operator["']/);
    expect(waitlistSrc).toMatch(/waitlistOperatorEmailTemplate/);
    expect(digestSrc).toMatch(/from ["']@\/emails\/operator-digest["']/);
    expect(digestSrc).toMatch(/operatorDigestEmailTemplate/);
  });

  test("templates render intent / waitlist / digest copy without lease", () => {
    const bid: IntentBid = {
      id: "b-12-11",
      panelId: "hood",
      userId: "test:a@example.com",
      brandLabel: "Mail Co",
      tradeLabel: "mail trade",
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

    const listed = intentStatusEmailTemplate({ kind: "listed", bid });
    expect(listed.subject).toMatch(/Intent listed/);
    expect(listed.text).toContain(BRAND.name);
    expect(listed.text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(buildIntentStatusMail({ kind: "listed", bid })).toEqual(listed);

    const waitlist = waitlistOperatorEmailTemplate("join@example.com");
    expect(waitlist.subject).toBe("Waitlist: join@example.com");
    expect(waitlist.text).toContain(BRAND.name);

    const digest = operatorDigestEmailTemplate({
      pendingCount: 1,
      waitlistCount: 2,
      pledgedUsd: 0,
      shortfallFloorUsd: FLOOR_USD,
      shortfallGoalUsd: GOAL_USD,
      seatedPanels: 0,
      openSeats: 12,
      floorUsd: FLOOR_USD,
      goalUsd: GOAL_USD,
      closeAt: null,
      generatedAt: "2026-09-16T00:00:00.000Z",
    });
    expect(digest.subject).toContain(BRAND.name);
    expect(digest.text).toMatch(/CLOSE_AT: null/);
    expect(digest.text.toLowerCase()).not.toMatch(/\blease\b/);
    expect(formatOperatorDigestText({
      pendingCount: 1,
      waitlistCount: 2,
      pledgedUsd: 0,
      shortfallFloorUsd: FLOOR_USD,
      shortfallGoalUsd: GOAL_USD,
      seatedPanels: 0,
      openSeats: 12,
      floorUsd: FLOOR_USD,
      goalUsd: GOAL_USD,
      closeAt: null,
      generatedAt: "2026-09-16T00:00:00.000Z",
    })).toBe(digest.text);
  });
});
