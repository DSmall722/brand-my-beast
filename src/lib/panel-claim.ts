import {
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
} from "./campaign";

export type IntentKind = "bid" | "claim";

export type ClaimStatus = "available" | "withdrawn" | "claimed";

export type CloseTier = "refund" | "wrap" | "purchase";

export type TierLocked = "none" | "purchase";

export type BoardClosedReason = "close_at" | "buyout" | "all_claimed";

export type ClaimableInput = {
  claimStatus: ClaimStatus;
  highestPaidBidUsd: number | null;
  campaignOpen: boolean;
  boardClosed: boolean;
  claimPriceUsd: number;
};

export type CommittedPanelInput = {
  panelId: string;
  claimStatus: ClaimStatus;
  claimPriceUsd: number;
  highestPaidBidUsd: number | null;
};

export type CampaignClaimRow = {
  n: number;
  name: string;
  openingUsd: number;
  claimUsd: number;
};

export function claimPriceForPanel(panelId: string): number {
  const panel = PANELS.find((row) => row.id === panelId);
  if (!panel) {
    throw new Error(`Unknown panel: ${panelId}`);
  }
  return panel.claimPriceUsd;
}

export function claimDepositUsd(claimPriceUsd: number): number {
  return Math.round(claimPriceUsd * (DEPOSIT_PERCENT / 100));
}

export function claimable(input: ClaimableInput): boolean {
  if (input.boardClosed || !input.campaignOpen) return false;
  if (input.claimStatus !== "available") return false;
  const bid = input.highestPaidBidUsd ?? 0;
  return bid < input.claimPriceUsd;
}

export function committedTotalUsd(
  panels: readonly CommittedPanelInput[],
): number {
  let sum = 0;
  for (const panel of panels) {
    if (panel.claimStatus === "claimed") {
      sum += panel.claimPriceUsd;
    } else if (
      panel.highestPaidBidUsd != null &&
      Number.isFinite(panel.highestPaidBidUsd)
    ) {
      sum += panel.highestPaidBidUsd;
    }
  }
  return sum;
}

export function closeTier(totalUsd: number): CloseTier {
  if (totalUsd >= GOAL_USD) return "purchase";
  if (totalUsd >= FLOOR_USD) return "wrap";
  return "refund";
}

export function purchaseTrigger(input: {
  committedTotalUsd: number;
  claimedCount: number;
  panelCount: number;
}): {
  tierLocked: TierLocked;
  boardClosed: boolean;
  boardClosedReason: BoardClosedReason | null;
} {
  if (input.panelCount > 0 && input.claimedCount === input.panelCount) {
    return {
      tierLocked: "purchase",
      boardClosed: true,
      boardClosedReason: "all_claimed",
    };
  }
  if (input.committedTotalUsd >= GOAL_USD) {
    return {
      tierLocked: "purchase",
      boardClosed: false,
      boardClosedReason: null,
    };
  }
  return {
    tierLocked: "none",
    boardClosed: false,
    boardClosedReason: null,
  };
}

export function buyoutAvailable(input: {
  tierLocked: TierLocked;
  boardClosed: boolean;
}): boolean {
  return input.tierLocked !== "purchase" && !input.boardClosed;
}

function parseUsdCell(raw: string): number {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) {
    throw new Error(`Not a dollar amount: ${raw}`);
  }
  return Number(digits);
}

export function parseCampaignClaimColumn(markdown: string): CampaignClaimRow[] {
  const lines = markdown.split(/\r?\n/);
  const start = lines.findIndex((line) =>
    /^\|\s*n\s*\|\s*Panel\s*\|\s*Opening\s*\|\s*Claim\s*\|/.test(line),
  );
  if (start < 0) {
    throw new Error("CAMPAIGN.md inventory table is missing a Claim column.");
  }
  const rows: CampaignClaimRow[] = [];
  for (const line of lines.slice(start + 2)) {
    if (!line.startsWith("|")) break;
    const cells = line
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => cell.length > 0);
    if (cells.length < 4) continue;
    if (!/^\d+$/.test(cells[0])) continue;
    rows.push({
      n: Number(cells[0]),
      name: cells[1],
      openingUsd: parseUsdCell(cells[2]),
      claimUsd: parseUsdCell(cells[3]),
    });
  }
  return rows;
}

export const CLAIM_COPY = {
  availableHeading: (_panelName: string, claimUsd: number) =>
    `Claim this panel for ${formatUsd(claimUsd)}.`,
  availableLead:
    "Skip the bidding. Pay a 20% deposit today and this panel is yours. Bidding on it stops right away.",
  availableDeposit: (depositUsd: number) =>
    `Skip the bidding. Pay a 20% deposit today (${formatUsd(depositUsd)}) and this panel is yours. Bidding on it stops right away.`,
  availableRefund: `If the campaign doesn't reach its ${formatUsd(FLOOR_USD)} goal by noon ET on December 31, 2026, your deposit is refunded in full. If it does, the rest is due then.`,
  availableCta: "Claim this panel",
  availableFoot:
    "Brand check applies. If one brand buys the whole truck, your claim is released and your deposit is refunded in full.",
  withdrawn:
    "Bids on this panel have passed the claim price, so it's open to bidding only.",
  claimed: (brand: string) =>
    `Claimed by ${brand}. This panel is no longer taking bids.`,
  purchaseBanner:
    "The board has reached $120,000. If it holds at close, the campaign buys the truck and adds Immortal Etch. Open panels are still taking bids.",
  faqClaim: {
    q: 'What does "Claim this panel" mean?',
    a: "Each panel has a fixed price. Pay it and the panel is yours, no auction. You put down 20% now.",
  },
  faqWhen: {
    q: "When can I claim?",
    a: "Until a bid on that panel reaches the claim price, or until the campaign closes at noon ET on December 31, 2026.",
  },
  faqShort: {
    q: "What if I claim and the campaign falls short?",
    a: `If the ${formatUsd(FLOOR_USD)} goal isn't met by noon ET on December 31, 2026, your deposit is refunded in full and nothing else is charged.`,
  },
  faqOutbid: {
    q: "Can someone outbid me after I claim?",
    a: "No. Claiming ends bidding on that panel. The one exception is a whole-truck buyout, which releases every panel and refunds your deposit in full.",
  },
  faqOwned: {
    q: "Is the truck already bought?",
    a: "No. The campaign funds the order. That's why deposits are refunded if the goal isn't met.",
  },
  faqTrigger: {
    q: "What happens if claims and bids reach $120,000?",
    a: "The campaign buys the truck and adds Immortal Etch on the nine steel faces, the same as a whole-truck buyout. Your panel stays yours.",
  },
} as const;
