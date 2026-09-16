/**
 * Slice 12.22 — winner packet markdown for one approved seat.
 * Panel, brand, wrap vs etch, 12-month wrap term from install.
 * Slice 13.23 — wrap term start = install day, not close.
 * Pure builder. Intent only — no card charge.
 */

import {
  BRAND,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  type Panel,
} from "./campaign";
import type { IntentBid } from "./intent";
import {
  shopPdfFinishForPanel,
  type ShopPdfFinish,
} from "./shop-pdf";

export const WINNER_PACKET_PATH_PREFIX = "/api/account/wins/packet/";

/** Wrap term copy — CAMPAIGN.md: 12 months from install day, not close. */
export const WINNER_PACKET_WRAP_TERM =
  "12 months from install day — not from close.";

/**
 * Slice 13.23 — term clock starts on install day.
 * Never close / CLOSE_AT / auction end.
 */
export const WINNER_PACKET_WRAP_TERM_START = "install day" as const;

export type WinnerPacketWrapTermStart =
  typeof WINNER_PACKET_WRAP_TERM_START;

export type WinnerPacketSeat = {
  bidId: string;
  panelId: Panel["id"];
  panelName: string;
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  finish: ShopPdfFinish;
  finishLabel: string;
  wrapTerm: string;
  /** Slice 13.23 — always install day; never close. */
  wrapTermStart: WinnerPacketWrapTermStart;
  floorUsd: number;
  goalUsd: number;
};

/** Machine-readable start for wrap term. Rejects any close-based value. */
export function winnerPacketWrapTermStart(): WinnerPacketWrapTermStart {
  return WINNER_PACKET_WRAP_TERM_START;
}

export function assertWinnerPacketWrapTermStartIsInstallDay(
  start: string,
): boolean {
  const normalized = start.trim().toLowerCase();
  if (normalized === "close" || normalized.includes("close_at")) {
    return false;
  }
  return normalized === WINNER_PACKET_WRAP_TERM_START;
}

export function winnerPacketSeatFromApproved(input: {
  bid: IntentBid;
  pledgedUsd: number;
}): { ok: true; seat: WinnerPacketSeat } | { ok: false; error: string } {
  if (input.bid.status !== "approved") {
    return { ok: false, error: "Winner packet is only for approved seats." };
  }
  const panel = PANELS.find((row) => row.id === input.bid.panelId);
  if (!panel) {
    return { ok: false, error: "Unknown panel." };
  }
  const { finish, finishLabel } = shopPdfFinishForPanel(
    panel,
    input.pledgedUsd,
  );
  const wrapTermStart = winnerPacketWrapTermStart();
  if (!assertWinnerPacketWrapTermStartIsInstallDay(wrapTermStart)) {
    return {
      ok: false,
      error: "Wrap term start must be install day, not close.",
    };
  }
  return {
    ok: true,
    seat: {
      bidId: input.bid.id,
      panelId: panel.id,
      panelName: panel.name,
      brandLabel: input.bid.brandLabel,
      tradeLabel: input.bid.tradeLabel,
      standingUsd: input.bid.standingUsd,
      finish,
      finishLabel,
      wrapTerm: WINNER_PACKET_WRAP_TERM,
      wrapTermStart,
      floorUsd: FLOOR_USD,
      goalUsd: GOAL_USD,
    },
  };
}

export function winnerPacketPath(bidId: string): string {
  return `${WINNER_PACKET_PATH_PREFIX}${encodeURIComponent(bidId)}`;
}

export function winnerPacketFilename(seat: WinnerPacketSeat): string {
  const slug = `${seat.panelId}-${seat.brandLabel}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `brandmybeast-winner-${slug || seat.bidId}.md`;
}

/**
 * Markdown packet: panel, brand, wrap vs etch, 12-month term.
 * Slice 13.23 embeds wrap term start = install day (not close).
 * Fences: $58k / $120k, no lease, CLOSE_AT unset.
 */
export function buildWinnerPacketMarkdown(seat: WinnerPacketSeat): string {
  if (!assertWinnerPacketWrapTermStartIsInstallDay(seat.wrapTermStart)) {
    throw new Error("Winner packet wrap term start must be install day");
  }
  const lines = [
    `# ${BRAND.name} — winner packet`,
    "",
    "Intent only. No card charge. No close clock.",
    "",
    "## Seat",
    "",
    `- **Panel:** ${seat.panelName} (\`${seat.panelId}\`)`,
    `- **Brand:** ${seat.brandLabel}`,
    `- **Trade:** ${seat.tradeLabel}`,
    `- **Standing mark:** ${formatUsd(seat.standingUsd)}`,
    "",
    "## Wrap vs etch",
    "",
    `- **Finish:** ${seat.finishLabel}`,
    `- **Finish code:** \`${seat.finish}\``,
    "",
    "Wrap is vinyl film. Etch is cut into the steel and unlocks only at",
    `${formatUsd(GOAL_USD)} buyout on etchable faces.`,
    "",
    "## Term",
    "",
    `- **Wrap term:** ${seat.wrapTerm}`,
    `- **Wrap term start:** ${seat.wrapTermStart} (not close).`,
    "- **Etch:** until the steel is gone (buyout only).",
    "",
    "## Campaign fences",
    "",
    `- Floor ${formatUsd(seat.floorUsd)}. Buyout ${formatUsd(seat.goalUsd)}.`,
    "- CLOSE_AT unset. Not Tesla.",
    `- Contact: ${BRAND.email}`,
    "",
  ];
  const body = lines.join("\n");
  if (/\blease\b/i.test(body)) {
    throw new Error("Winner packet must not contain lease copy");
  }
  // Slice 13.23 — start line must name install day and deny close as the clock.
  if (!/\*\*Wrap term start:\*\*\s*install day/i.test(body)) {
    throw new Error("Winner packet must state wrap term start = install day");
  }
  if (/\*\*Wrap term start:\*\*\s*close\b/i.test(body)) {
    throw new Error("Winner packet must not start wrap term at close");
  }
  return body;
}
