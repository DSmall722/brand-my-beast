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
  placeIntentBid,
  resetIntentStoreForTests,
  setIntentStatus,
} from "../src/lib/intent-store";
import {
  hashEmailForLog,
  listStructuredLogsForTests,
  resetStructuredLogsForTests,
} from "../src/lib/structured-log";
import { joinWaitlist, resetWaitlistStoreForTests } from "../src/lib/waitlist";

/**
 * Slice 12.41 — structured log on waitlist insert + intent status change.
 * No PII beyond email hash. CLOSE_AT null. No Stripe.
 */

test.describe("slice 12.41: structured waitlist + intent status logs", () => {
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

  test("waitlist insert logs email hash only", async () => {
    process.env.WAITLIST_MODE = "memory";
    resetWaitlistStoreForTests();
    resetStructuredLogsForTests();

    const email = `slice-1241-${Date.now()}@example.com`;
    const created = await joinWaitlist(email);
    expect(created.ok).toBe(true);
    if (!created.ok) return;
    expect(created.status).toBe("created");

    const logs = listStructuredLogsForTests().filter(
      (row) => row.event === "waitlist.insert",
    );
    expect(logs).toHaveLength(1);
    const entry = logs[0];
    expect(entry.event).toBe("waitlist.insert");
    if (entry.event !== "waitlist.insert") return;
    expect(entry.emailHash).toBe(hashEmailForLog(email));
    expect(entry.emailHash).toHaveLength(16);
    expect(JSON.stringify(entry).toLowerCase()).not.toContain(
      email.toLowerCase(),
    );
    expect(JSON.stringify(entry)).not.toMatch(/@example\.com/i);
  });

  test("intent status change logs hashed user id", async () => {
    process.env.INTENT_MODE = "memory";
    await resetIntentStoreForTests();
    resetStructuredLogsForTests();

    const userId = "test:slice-1241@example.com";
    const placed = await placeIntentBid({
      panelId: "hood",
      userId,
      brandLabel: "Hash Log Co",
      tradeLabel: "tools",
      standingUsd: 2_500,
    });
    expect(placed.ok).toBe(true);
    if (!placed.ok) return;

    const approved = await setIntentStatus(placed.bid.id, "approved");
    expect(approved.ok).toBe(true);
    if (!approved.ok) return;

    const logs = listStructuredLogsForTests().filter(
      (row) => row.event === "intent.status",
    );
    expect(logs.length).toBeGreaterThanOrEqual(1);
    const entry = logs.find((row) => row.event === "intent.status" && row.status === "approved");
    expect(entry).toBeTruthy();
    if (!entry || entry.event !== "intent.status") return;
    expect(entry.bidId).toBe(placed.bid.id);
    expect(entry.panelId).toBe("hood");
    expect(entry.userHash).toBe(hashEmailForLog(userId));
    expect(JSON.stringify(entry).toLowerCase()).not.toContain("example.com");
    expect(JSON.stringify(entry)).not.toContain(userId);
  });
});
