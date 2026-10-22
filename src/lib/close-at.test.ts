import { describe, expect, it } from "vitest";
import { CLOSE_AT } from "./campaign";
import { publishedCloseLabelEt } from "./campaign-window";
import {
  findCloseAtViolations,
  LOCKED_CLOSE_AT,
} from "./close-at-null";
import { assertOperatorCampaignLocks } from "./operator-campaign-locks";

describe("bmb-close-date-dec31", () => {
  it("locks CLOSE_AT to Dec 31, 2026 12:00 PM ET", () => {
    expect(CLOSE_AT).toBe("2026-12-31T17:00:00.000Z");
    expect(LOCKED_CLOSE_AT).toBe("2026-12-31T17:00:00.000Z");
    expect(findCloseAtViolations()).toEqual([]);
    expect(assertOperatorCampaignLocks()).toBe(true);
    expect(publishedCloseLabelEt()).toBe("Thu Dec 31, 2026, 12:00 PM ET");
  });
});
