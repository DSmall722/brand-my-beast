import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appendIntentRevision, listIntentRevisionsForBid } from "./intent-revision";

describe("memory intent revisions", () => {
  beforeEach(() => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("INTENT_MODE", "memory");
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-15T12:00:00.000Z"));
    (globalThis as { __bmbIntentRevisions?: unknown }).__bmbIntentRevisions = [];
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
  });

  it("keeps edit order when revisions land in the same millisecond", async () => {
    const base = { bidId: "bid-1", tradeLabel: "Trade", standingUsd: 1000 };
    await appendIntentRevision({ ...base, brandLabel: "first" });
    await appendIntentRevision({ ...base, brandLabel: "second" });
    await appendIntentRevision({ ...base, brandLabel: "third" });

    const rows = await listIntentRevisionsForBid("bid-1");

    expect(rows.map((row) => row.brandLabel)).toEqual(["first", "second", "third"]);
    expect(new Set(rows.map((row) => row.createdAt)).size).toBe(3);
  });
});
