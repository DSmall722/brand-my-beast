import { describe, expect, it } from "vitest";
import {
  FLOOR_USD,
  floorProgressPercent,
  moneyBandCopy,
  shortfallToFloorUsd,
} from "./campaign";
import { canFireFloorSave, isCampaignShortOfFloor } from "./intent";

const REFUND_ON_MISS = "Full refund. No order. No wrap. No Immortal Etch.";
const FLOOR_MET = "Cyberbeast order + wrap. Immortal Etch not included.";

describe("BMB-FLOOR-35 campaign floor", () => {
  it("locks the all-or-nothing floor at $35,000", () => {
    expect(FLOOR_USD).toBe(35_000);
  });

  it("treats $34,999 as missed and $35,000 as met", () => {
    expect(isCampaignShortOfFloor(34_999)).toBe(true);
    expect(canFireFloorSave(34_999)).toBe(true);
    expect(shortfallToFloorUsd(34_999)).toBe(1);
    expect(moneyBandCopy(34_999)).toBe(REFUND_ON_MISS);
    expect(floorProgressPercent(34_999)).toBeLessThan(100);

    expect(isCampaignShortOfFloor(35_000)).toBe(false);
    expect(canFireFloorSave(35_000)).toBe(false);
    expect(shortfallToFloorUsd(35_000)).toBe(0);
    expect(moneyBandCopy(35_000)).toBe(FLOOR_MET);
    expect(floorProgressPercent(35_000)).toBe(100);
  });
});
