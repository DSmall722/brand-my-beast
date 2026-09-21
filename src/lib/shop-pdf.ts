/**
 * Slice 8.6 / 16.24 — shop PDF for one approved seat.
 * Document title is `Seat 03 — Driver doors`, not only the panel slug.
 * Pure builder. No Imagine API. No Stripe. Helvetica-only PDF 1.4.
 */

import {
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
  isEtchUnlocked,
  type Panel,
} from "./campaign";
import type { IntentBid } from "./intent";
import { panelBoardMarkFor } from "./panel-board";

export const SHOP_PDF_PATH_PREFIX = "/api/partner/shop/pdf/";

export type ShopPdfFinish =
  | "wrap_only"
  | "wrap_etch_locked"
  | "wrap_or_etch";

export type ShopPdfSeat = {
  bidId: string;
  panelId: Panel["id"];
  panelName: string;
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
  finish: ShopPdfFinish;
  finishLabel: string;
  /** Slice 13.21 — board pledged used for etch-lock (vs GOAL_USD). */
  pledgedUsd: number;
  /** Slice 13.21 — machine-readable etch lock from pledged vs buyout. */
  etchLock: "locked" | "unlocked" | "wrap_only";
  etchLockLabel: string;
  artworkUrl: string | null;
  floorUsd: number;
  goalUsd: number;
};

export function shopPdfEtchLockState(
  panel: Panel,
  pledgedUsd: number,
): { etchLock: ShopPdfSeat["etchLock"]; etchLockLabel: string } {
  if (!isEtchable(panel)) {
    return {
      etchLock: "wrap_only",
      etchLockLabel: "Wrap-only panel — no etch path.",
    };
  }
  if (isEtchUnlocked(pledgedUsd)) {
    return {
      etchLock: "unlocked",
      etchLockLabel: `Etch unlocked — pledged ${formatUsd(pledgedUsd)} meets buyout ${formatUsd(GOAL_USD)}.`,
    };
  }
  return {
    etchLock: "locked",
    etchLockLabel: `Etch locked — pledged ${formatUsd(pledgedUsd)} under buyout ${formatUsd(GOAL_USD)}.`,
  };
}

export function shopPdfFinishForPanel(
  panel: Panel,
  pledgedUsd: number,
): { finish: ShopPdfFinish; finishLabel: string } {
  if (!isEtchable(panel)) {
    return { finish: "wrap_only", finishLabel: "Wrap only" };
  }
  if (isEtchUnlocked(pledgedUsd)) {
    return {
      finish: "wrap_or_etch",
      finishLabel: `Wrap or etch (buyout ${formatUsd(GOAL_USD)} met)`,
    };
  }
  return {
    finish: "wrap_etch_locked",
    finishLabel: `Wrap · etch locked under ${formatUsd(GOAL_USD)}`,
  };
}

export function shopPdfSeatFromApproved(input: {
  bid: IntentBid;
  pledgedUsd: number;
}): { ok: true; seat: ShopPdfSeat } | { ok: false; error: string } {
  if (input.bid.status !== "approved") {
    return { ok: false, error: "Shop PDF is only for approved seats." };
  }
  const panel = PANELS.find((row) => row.id === input.bid.panelId);
  if (!panel) {
    return { ok: false, error: "Unknown panel." };
  }
  const { finish, finishLabel } = shopPdfFinishForPanel(
    panel,
    input.pledgedUsd,
  );
  const { etchLock, etchLockLabel } = shopPdfEtchLockState(
    panel,
    input.pledgedUsd,
  );
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
      pledgedUsd: input.pledgedUsd,
      etchLock,
      etchLockLabel,
      artworkUrl: input.bid.artworkUrl,
      floorUsd: FLOOR_USD,
      goalUsd: GOAL_USD,
    },
  };
}

export function shopPdfPath(bidId: string): string {
  return `${SHOP_PDF_PATH_PREFIX}${encodeURIComponent(bidId)}`;
}

/** Slice 16.24 — `Seat 03 — Driver doors`. Zero-padded board number, not the slug. */
export function shopPdfTitle(
  seat: Pick<ShopPdfSeat, "panelId" | "panelName">,
): string {
  const n = String(panelBoardMarkFor(seat.panelId).n).padStart(2, "0");
  return `Seat ${n} — ${seat.panelName}`;
}

export function shopPdfFilename(seat: ShopPdfSeat): string {
  const slug = `${seat.panelId}-${seat.brandLabel}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return `brandmybeast-shop-${slug || seat.bidId}.pdf`;
}

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function pdfLines(seat: ShopPdfSeat): string[] {
  return [
    shopPdfTitle(seat),
    "BrandMyBeast — wrap shop seat ticket",
    "Intent only. No card charge. No Imagine API call.",
    "",
    `Panel: ${seat.panelName} (${seat.panelId})`,
    `Brand: ${seat.brandLabel}`,
    `Trade: ${seat.tradeLabel}`,
    `Standing mark: ${formatUsd(seat.standingUsd)}`,
    `Finish: ${seat.finishLabel}`,
    `Finish code: ${seat.finish}`,
    // Slice 13.21 — etch-lock state from pledged vs $120,000.
    `Etch lock: ${seat.etchLock}`,
    seat.etchLockLabel,
    `Pledged standing: ${formatUsd(seat.pledgedUsd)}`,
    `Artwork: ${seat.artworkUrl ?? "(none attached)"}`,
    "",
    `Floor ${formatUsd(seat.floorUsd)}. Buyout ${formatUsd(seat.goalUsd)}.`,
    "Wrap term: 12 months from install. Etch: until the steel is gone.",
    "CLOSE_AT unset. Not Tesla.",
  ];
}

/**
 * Minimal single-page PDF. ASCII Helvetica. No external PDF package.
 */
export function buildShopSeatPdf(seat: ShopPdfSeat): Uint8Array {
  const lines = pdfLines(seat);
  const contentParts = ["BT", "/F1 11 Tf", "50 740 Td", "14 TL"];
  lines.forEach((line, index) => {
    if (index === 0) {
      contentParts.push(`(${escapePdfText(line)}) Tj`);
    } else {
      contentParts.push("T*", `(${escapePdfText(line)}) Tj`);
    }
  });
  contentParts.push("ET");
  const stream = contentParts.join("\n");
  const streamBytes = Buffer.from(stream, "utf8");

  const objects: string[] = [];
  objects.push("1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n");
  objects.push(
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
  );
  objects.push(
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n",
  );
  objects.push(
    `4 0 obj\n<< /Length ${streamBytes.length} >>\nstream\n${stream}\nendstream\nendobj\n`,
  );
  objects.push(
    "5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
  );
  objects.push(
    `6 0 obj\n<< /Title (${escapePdfText(shopPdfTitle(seat))}) >>\nendobj\n`,
  );

  let body = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "utf8"));
    body += obj;
  }
  const xrefStart = Buffer.byteLength(body, "utf8");
  body += `xref\n0 ${objects.length + 1}\n`;
  body += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i += 1) {
    body += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R /Info 6 0 R >>\n`;
  body += `startxref\n${xrefStart}\n%%EOF\n`;

  // Guard fences in the payload itself.
  if (/\blease\b/i.test(body)) {
    throw new Error("Shop PDF must not contain lease copy");
  }
  return new Uint8Array(Buffer.from(body, "utf8"));
}
