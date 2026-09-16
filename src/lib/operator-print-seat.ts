/**
 * Slice 13.25 — operator print view for one approved seat.
 * Combines shop PDF seat facts (8.6) with wrap term start = install day (13.23).
 * Intent only — no card charge.
 */

import { formatUsd } from "./campaign";
import type { IntentBid } from "./intent";
import {
  shopPdfSeatFromApproved,
  type ShopPdfSeat,
} from "./shop-pdf";
import {
  WINNER_PACKET_WRAP_TERM,
  WINNER_PACKET_WRAP_TERM_START,
  assertWinnerPacketWrapTermStartIsInstallDay,
  winnerPacketWrapTermStart,
  type WinnerPacketWrapTermStart,
} from "./winner-packet";

export const OPERATOR_PRINT_PATH_PREFIX = "/operator/print/";

export type OperatorPrintSeat = ShopPdfSeat & {
  wrapTerm: string;
  wrapTermStart: WinnerPacketWrapTermStart;
};

export function operatorPrintPath(bidId: string): string {
  return `${OPERATOR_PRINT_PATH_PREFIX}${encodeURIComponent(bidId)}`;
}

export function operatorPrintSeatFromApproved(input: {
  bid: IntentBid;
  pledgedUsd: number;
}): { ok: true; seat: OperatorPrintSeat } | { ok: false; error: string } {
  const shop = shopPdfSeatFromApproved(input);
  if (!shop.ok) {
    return {
      ok: false,
      error:
        shop.error === "Shop PDF is only for approved seats."
          ? "Print view is only for approved seats."
          : shop.error,
    };
  }
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
      ...shop.seat,
      wrapTerm: WINNER_PACKET_WRAP_TERM,
      wrapTermStart,
    },
  };
}

/**
 * Printable HTML body lines for one seat (server render uses these facts).
 * Guards: install-day start, money fences, no lease.
 */
export function operatorPrintFacts(seat: OperatorPrintSeat): {
  title: string;
  rows: { label: string; value: string; testId: string }[];
  fences: string;
} {
  if (!assertWinnerPacketWrapTermStartIsInstallDay(seat.wrapTermStart)) {
    throw new Error("Operator print wrap term start must be install day");
  }
  if (seat.wrapTermStart !== WINNER_PACKET_WRAP_TERM_START) {
    throw new Error("Operator print wrap term start mismatch");
  }
  return {
    title: `BrandMyBeast — operator seat print`,
    rows: [
      {
        label: "Panel",
        value: `${seat.panelName} (${seat.panelId})`,
        testId: "operator-print-panel",
      },
      {
        label: "Brand",
        value: seat.brandLabel,
        testId: "operator-print-brand",
      },
      {
        label: "Trade",
        value: seat.tradeLabel,
        testId: "operator-print-trade",
      },
      {
        label: "Standing mark",
        value: formatUsd(seat.standingUsd),
        testId: "operator-print-standing",
      },
      {
        label: "Finish",
        value: `${seat.finishLabel} (${seat.finish})`,
        testId: "operator-print-finish",
      },
      {
        label: "Etch lock",
        value: `${seat.etchLock} — ${seat.etchLockLabel}`,
        testId: "operator-print-etch-lock",
      },
      {
        label: "Pledged standing",
        value: formatUsd(seat.pledgedUsd),
        testId: "operator-print-pledged",
      },
      {
        label: "Artwork",
        value: seat.artworkUrl ?? "(none attached)",
        testId: "operator-print-artwork",
      },
      {
        label: "Wrap term",
        value: seat.wrapTerm,
        testId: "operator-print-wrap-term",
      },
      {
        label: "Wrap term start",
        value: `${seat.wrapTermStart} (not close)`,
        testId: "operator-print-wrap-term-start",
      },
    ],
    fences: `Floor ${formatUsd(seat.floorUsd)}. Buyout ${formatUsd(seat.goalUsd)}. CLOSE_AT unset. Intent only — no card charge.`,
  };
}
