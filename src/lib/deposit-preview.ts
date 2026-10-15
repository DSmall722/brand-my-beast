import { DEPOSIT_PERCENT, formatUsd } from "./campaign";
import { depositUsdForMark } from "./intent";
import { PUBLIC_COPY } from "./public-copy";

export function depositPreviewCopy(markUsd: number): string {
  const deposit = depositUsdForMark(markUsd);
  return PUBLIC_COPY.seat.depositPreviewTemplate
    .replace("{percent}", String(DEPOSIT_PERCENT))
    .replace("{amount}", formatUsd(deposit));
}

export function tryDepositPreviewCopy(markUsd: number): string | null {
  if (!Number.isFinite(markUsd) || markUsd <= 0) return null;
  return depositPreviewCopy(markUsd);
}
