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
import { MAGIC_LINK_FROM } from "../src/lib/auth/mode";
import {
  buildIntentStatusMail,
  emailFromTestUserId,
  resetIntentStatusMailerForTests,
  setIntentStatusMailerForTests,
  type IntentStatusMailPayload,
} from "../src/lib/intent-status-mail";
import {
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";

/**
 * Slice 8.1 — intent status emails: listed / outbid / approved / rejected+note.
 * Tests mock Resend. Do not send live mail.
 */
test.describe("slice 8.1: intent status emails mock Resend", () => {
  test.beforeEach(async () => {
    await resetIntentStoreForTests();
    resetIntentStatusMailerForTests();
  });

  test.afterEach(async () => {
    await resetIntentStoreForTests();
    resetIntentStatusMailerForTests();
    delete process.env.RESEND_API_KEY;
  });

  test("campaign money fences stay locked", () => {
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

  test("test user id maps to email; MAGIC_LINK_FROM is hello@", () => {
    expect(emailFromTestUserId("test:bidder@example.com")).toBe(
      "bidder@example.com",
    );
    expect(emailFromTestUserId("uuid-live")).toBeNull();
    expect(MAGIC_LINK_FROM).toBe("BrandMyBeast <hello@brandmybeast.com>");
  });

  test("listed and outbid notify via mocked Resend", async () => {
    const sent: IntentStatusMailPayload[] = [];
    setIntentStatusMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice81";

    const first = await placeIntentBid({
      panelId: "hood",
      userId: "test:first@example.com",
      brandLabel: "FirstCo",
      tradeLabel: "coffee",
      standingUsd: 2_500,
    });
    expect(first.ok).toBe(true);
    if (!first.ok) return;

    expect(sent).toHaveLength(1);
    expect(sent[0]!.to).toBe("first@example.com");
    expect(sent[0]!.from).toBe(MAGIC_LINK_FROM);
    expect(sent[0]!.subject.toLowerCase()).toContain("listed");
    expect(sent[0]!.text.toLowerCase()).toContain("intent only");
    expect(sent[0]!.text.toLowerCase()).not.toMatch(/\blease\b/);

    const second = await placeIntentBid({
      panelId: "hood",
      userId: "test:second@example.com",
      brandLabel: "SecondCo",
      tradeLabel: "tea",
      standingUsd: 3_000,
    });
    expect(second.ok).toBe(true);
    if (!second.ok) return;

    expect(sent).toHaveLength(3);
    const subjects = sent.map((mail) => mail.subject.toLowerCase());
    expect(subjects.filter((s) => s.includes("listed"))).toHaveLength(2);
    expect(subjects.some((s) => s.includes("outbid"))).toBe(true);
    expect(sent.some((mail) => mail.to === "first@example.com" && mail.subject.toLowerCase().includes("outbid"))).toBe(
      true,
    );
    expect(sent.some((mail) => mail.to === "second@example.com")).toBe(true);
  });

  test("approved and rejected+note notify; mail failure still ok", async () => {
    const sent: IntentStatusMailPayload[] = [];
    setIntentStatusMailerForTests({
      send: async (payload) => {
        sent.push(payload);
        return { id: "mock" };
      },
    });
    process.env.RESEND_API_KEY = "re_test_slice81";

    const listed = await placeIntentBid({
      panelId: "tailgate",
      userId: "test:approve@example.com",
      brandLabel: "ApproveCo",
      tradeLabel: "hats",
      standingUsd: 2_500,
    });
    expect(listed.ok).toBe(true);
    if (!listed.ok) return;

    const approved = await setIntentStatus(listed.bid.id, "approved");
    expect(approved.ok).toBe(true);
    expect(
      sent.some(
        (mail) =>
          mail.to === "approve@example.com" &&
          mail.subject.toLowerCase().includes("approved"),
      ),
    ).toBe(true);

    const rejectListed = await placeIntentBid({
      panelId: "tonneau",
      userId: "test:reject@example.com",
      brandLabel: "RejectCo",
      tradeLabel: "socks",
      standingUsd: 2_500,
    });
    expect(rejectListed.ok).toBe(true);
    if (!rejectListed.ok) return;

    const rejected = await setIntentStatus(rejectListed.bid.id, "rejected", {
      note: "Art needs thicker strokes.",
    });
    expect(rejected.ok).toBe(true);
    const rejectMail = sent.find(
      (mail) =>
        mail.to === "reject@example.com" &&
        mail.subject.toLowerCase().includes("rejected"),
    );
    expect(rejectMail).toBeTruthy();
    expect(rejectMail!.text).toContain("Art needs thicker strokes.");

    setIntentStatusMailerForTests({
      send: async () => {
        throw new Error("resend down");
      },
    });
    const still = await placeIntentBid({
      panelId: "roof",
      userId: "test:mailfail@example.com",
      brandLabel: "MailFailCo",
      tradeLabel: "belts",
      standingUsd: 2_500,
    });
    expect(still).toEqual(
      expect.objectContaining({ ok: true }),
    );
  });

  test("buildIntentStatusMail covers four kinds without lease", () => {
    const bid = {
      id: "b1",
      panelId: "hood" as const,
      userId: "test:x@example.com",
      brandLabel: "BrandX",
      tradeLabel: "widgets",
      standingUsd: 2_500,
      depositUsd: 500,
      status: "listed" as const,
      createdAt: new Date().toISOString(),
      artworkUrl: null,
      proxyMaxUsd: null,
      floorSaveUsd: null,
    };
    for (const kind of ["listed", "outbid", "approved", "rejected"] as const) {
      const mail = buildIntentStatusMail({
        kind,
        bid,
        note: kind === "rejected" ? "Needs revision." : undefined,
      });
      expect(mail.subject.length).toBeGreaterThan(0);
      expect(mail.text.toLowerCase()).not.toMatch(/\blease\b/);
      expect(mail.text).toContain(BRAND.name);
    }
  });
});
