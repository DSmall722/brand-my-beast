import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { FLOOR_USD, GOAL_USD, PANELS } from "./campaign";
import {
  CLAIM_COPY,
  claimDepositUsd,
  claimable,
  closeTier,
  committedTotalUsd,
  parseCampaignClaimColumn,
  purchaseTrigger,
} from "./panel-claim";

const CAMPAIGN = join(process.cwd(), "CAMPAIGN.md");

const TIER_C: ReadonlyArray<{
  id: string;
  name: string;
  openingUsd: number;
  claimUsd: number;
}> = [
  { id: "hood", name: "Hood", openingUsd: 2500, claimUsd: 13_000 },
  { id: "front-fascia", name: "Front Fascia", openingUsd: 2000, claimUsd: 10_000 },
  { id: "front-bumper", name: "Front Bumper", openingUsd: 500, claimUsd: 4_000 },
  { id: "driver-door", name: "Driver Side Doors", openingUsd: 4500, claimUsd: 22_000 },
  { id: "driver-rear-quarter", name: "Driver Rear Sail", openingUsd: 1000, claimUsd: 6_000 },
  { id: "driver-bed", name: "Driver Side Bed", openingUsd: 2000, claimUsd: 10_000 },
  { id: "passenger-door", name: "Passenger Side Doors", openingUsd: 4500, claimUsd: 22_000 },
  { id: "passenger-rear-quarter", name: "Passenger Rear Sail", openingUsd: 1000, claimUsd: 6_000 },
  { id: "passenger-bed", name: "Passenger Side Bed", openingUsd: 2000, claimUsd: 10_000 },
  { id: "tailgate", name: "Tailgate", openingUsd: 2500, claimUsd: 13_000 },
  { id: "rear-bumper", name: "Rear Bumper", openingUsd: 500, claimUsd: 4_000 },
];

function claimed(ids: readonly string[]) {
  const set = new Set(ids);
  return PANELS.map((panel) => ({
    panelId: panel.id,
    claimStatus: (set.has(panel.id) ? "claimed" : "available") as
      | "claimed"
      | "available",
    claimPriceUsd: panel.claimPriceUsd,
    highestPaidBidUsd: null as number | null,
  }));
}

function mix(input: {
  claimed?: readonly string[];
  bids?: Readonly<Record<string, number>>;
}) {
  const claimedSet = new Set(input.claimed ?? []);
  const bids = input.bids ?? {};
  return PANELS.map((panel) => ({
    panelId: panel.id,
    claimStatus: (claimedSet.has(panel.id) ? "claimed" : "available") as
      | "claimed"
      | "available",
    claimPriceUsd: panel.claimPriceUsd,
    highestPaidBidUsd: claimedSet.has(panel.id)
      ? null
      : (bids[panel.id] ?? null),
  }));
}

describe("bmb-panel-claim-price Tier C table", () => {
  it("locks 11 claim prices that sum to $120,000", () => {
    expect(PANELS).toHaveLength(11);
    expect(PANELS.reduce((sum, panel) => sum + panel.claimPriceUsd, 0)).toBe(
      120_000,
    );
    expect(GOAL_USD).toBe(120_000);
    expect(FLOOR_USD).toBe(35_000);
  });

  it("keeps every claim price above opening and under the $120,000 cap", () => {
    for (const row of TIER_C) {
      const panel = PANELS.find((item) => item.id === row.id);
      expect(panel, row.id).toBeDefined();
      expect(panel?.name).toBe(row.name);
      expect(panel?.openingUsd).toBe(row.openingUsd);
      expect(panel?.claimPriceUsd).toBe(row.claimUsd);
      expect(panel!.claimPriceUsd).toBeGreaterThan(panel!.openingUsd);
      expect(panel!.claimPriceUsd).toBeLessThan(GOAL_USD);
      expect(claimDepositUsd(panel!.claimPriceUsd)).toBe(
        Math.round(row.claimUsd * 0.2),
      );
    }
  });

  it("parses the CAMPAIGN.md Claim column as the same constants", () => {
    const markdown = readFileSync(CAMPAIGN, "utf8");
    const parsed = parseCampaignClaimColumn(markdown);
    expect(parsed).toHaveLength(11);
    expect(parsed.reduce((sum, row) => sum + row.claimUsd, 0)).toBe(120_000);
    for (const panel of PANELS) {
      const row = parsed.find((item) => item.name === panel.name);
      expect(row, panel.name).toBeDefined();
      expect(row?.openingUsd).toBe(panel.openingUsd);
      expect(row?.claimUsd).toBe(panel.claimPriceUsd);
    }
  });
});

describe("claimable()", () => {
  const price = 22_000;

  it("shows the claim while the highest paid bid is below the price", () => {
    expect(
      claimable({
        claimStatus: "available",
        highestPaidBidUsd: 4_500,
        campaignOpen: true,
        boardClosed: false,
        claimPriceUsd: price,
      }),
    ).toBe(true);
  });

  it("withdraws the claim when a paid bid equals the price", () => {
    expect(
      claimable({
        claimStatus: "available",
        highestPaidBidUsd: price,
        campaignOpen: true,
        boardClosed: false,
        claimPriceUsd: price,
      }),
    ).toBe(false);
  });

  it("withdraws the claim when a paid bid is above the price", () => {
    expect(
      claimable({
        claimStatus: "available",
        highestPaidBidUsd: price + 250,
        campaignOpen: true,
        boardClosed: false,
        claimPriceUsd: price,
      }),
    ).toBe(false);
  });

  it("hides the claim on a closed board", () => {
    expect(
      claimable({
        claimStatus: "available",
        highestPaidBidUsd: null,
        campaignOpen: true,
        boardClosed: true,
        claimPriceUsd: price,
      }),
    ).toBe(false);
  });

  it("hides the claim on a claimed panel", () => {
    expect(
      claimable({
        claimStatus: "claimed",
        highestPaidBidUsd: null,
        campaignOpen: true,
        boardClosed: false,
        claimPriceUsd: price,
      }),
    ).toBe(false);
  });

  it("hides the claim when the campaign desk is not open", () => {
    expect(
      claimable({
        claimStatus: "available",
        highestPaidBidUsd: null,
        campaignOpen: false,
        boardClosed: false,
        claimPriceUsd: price,
      }),
    ).toBe(false);
  });
});

describe("committed total and close tier (spec section 3)", () => {
  it("all 11 claimed is $120,000 purchase", () => {
    const total = committedTotalUsd(claimed(PANELS.map((panel) => panel.id)));
    expect(total).toBe(120_000);
    expect(closeTier(total)).toBe("purchase");
    expect(
      purchaseTrigger({
        committedTotalUsd: total,
        claimedCount: 11,
        panelCount: 11,
      }),
    ).toEqual({
      tierLocked: "purchase",
      boardClosed: true,
      boardClosedReason: "all_claimed",
    });
  });

  it("both bumpers unsold, rest claimed is $112,000 wrap", () => {
    const total = committedTotalUsd(
      claimed(
        PANELS.filter(
          (panel) => panel.id !== "front-bumper" && panel.id !== "rear-bumper",
        ).map((panel) => panel.id),
      ),
    );
    expect(total).toBe(112_000);
    expect(closeTier(total)).toBe("wrap");
  });

  it("both bumpers at opening, rest claimed is $113,000 wrap", () => {
    const total = committedTotalUsd(
      mix({
        claimed: PANELS.filter(
          (panel) => panel.id !== "front-bumper" && panel.id !== "rear-bumper",
        ).map((panel) => panel.id),
        bids: { "front-bumper": 500, "rear-bumper": 500 },
      }),
    );
    expect(total).toBe(113_000);
    expect(closeTier(total)).toBe("wrap");
  });

  it("one door at opening, rest claimed is $102,500 wrap", () => {
    const total = committedTotalUsd(
      mix({
        claimed: PANELS.filter((panel) => panel.id !== "driver-door").map(
          (panel) => panel.id,
        ),
        bids: { "driver-door": 4_500 },
      }),
    );
    expect(total).toBe(102_500);
    expect(closeTier(total)).toBe("wrap");
  });

  it("both doors at opening, rest claimed is $85,000 wrap", () => {
    const total = committedTotalUsd(
      mix({
        claimed: PANELS.filter(
          (panel) => panel.id !== "driver-door" && panel.id !== "passenger-door",
        ).map((panel) => panel.id),
        bids: { "driver-door": 4_500, "passenger-door": 4_500 },
      }),
    );
    expect(total).toBe(85_000);
    expect(closeTier(total)).toBe("wrap");
  });

  it("10 claimed plus a bid at the 11th claim price locks purchase without closing", () => {
    const open = "rear-bumper";
    const total = committedTotalUsd(
      mix({
        claimed: PANELS.filter((panel) => panel.id !== open).map(
          (panel) => panel.id,
        ),
        bids: { [open]: 4_000 },
      }),
    );
    expect(total).toBe(120_000);
    expect(closeTier(total)).toBe("purchase");
    expect(
      purchaseTrigger({
        committedTotalUsd: total,
        claimedCount: 10,
        panelCount: 11,
      }),
    ).toEqual({
      tierLocked: "purchase",
      boardClosed: false,
      boardClosedReason: null,
    });
  });

  it("doors + hood + tailgate claimed, rest unsold is $70,000 wrap", () => {
    const total = committedTotalUsd(
      claimed(["driver-door", "passenger-door", "hood", "tailgate"]),
    );
    expect(total).toBe(70_000);
    expect(closeTier(total)).toBe("wrap");
  });

  it("only bumpers + sails claimed, rest unsold is $20,000 refund", () => {
    const total = committedTotalUsd(
      claimed([
        "front-bumper",
        "rear-bumper",
        "driver-rear-quarter",
        "passenger-rear-quarter",
      ]),
    );
    expect(total).toBe(20_000);
    expect(closeTier(total)).toBe("refund");
  });

  it("everything at opening is $23,000 refund", () => {
    const total = committedTotalUsd(
      mix({
        bids: Object.fromEntries(
          PANELS.map((panel) => [panel.id, panel.openingUsd]),
        ),
      }),
    );
    expect(total).toBe(23_000);
    expect(closeTier(total)).toBe("refund");
  });

  it("excess over $120,000 stays purchase and does not create a third tier", () => {
    const total = committedTotalUsd(
      mix({
        claimed: PANELS.filter((panel) => panel.id !== "hood").map(
          (panel) => panel.id,
        ),
        bids: { hood: 20_000 },
      }),
    );
    expect(total).toBeGreaterThan(120_000);
    expect(closeTier(total)).toBe("purchase");
    expect(closeTier(119_999)).toBe("wrap");
    expect(closeTier(35_000)).toBe("wrap");
    expect(closeTier(34_999)).toBe("refund");
  });
});

describe("claim copy lint", () => {
  it("bans em dash, lease, and financing on new claim strings", () => {
    const blob = JSON.stringify(CLAIM_COPY);
    expect(blob).not.toMatch(/\u2014|\u2013/);
    expect(blob.toLowerCase()).not.toMatch(/\blease\b/);
    expect(blob.toLowerCase()).not.toMatch(/\bfinancing\b/);
    expect(CLAIM_COPY.availableHeading("Passenger Side Doors", 22_000)).toBe(
      "Claim this panel for $22,000.",
    );
    expect(CLAIM_COPY.availableDeposit(4_400)).toContain("$4,400");
    expect(CLAIM_COPY.availableCta).toBe("Claim this panel");
    expect(CLAIM_COPY.withdrawn).toMatch(/bidding only/);
    expect(CLAIM_COPY.claimed("Acme")).toContain("Acme");
    expect(CLAIM_COPY.purchaseBanner).toContain("$120,000");
    expect(CLAIM_COPY.faqClaim.q).toContain("Claim this panel");
  });
});
