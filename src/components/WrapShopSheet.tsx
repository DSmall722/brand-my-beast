import Link from "next/link";
import { IntentArtworkPreview } from "@/components/IntentArtworkPreview";
import { ShopArtStatusControls } from "@/components/ShopArtStatusControls";
import { ShopCutFileChecklist } from "@/components/ShopCutFileChecklist";
import {
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "@/lib/campaign";
import type { PartnerShopSeat } from "@/lib/partner-shop-seat";
import type { ShopArtStatus } from "@/lib/shop-art-status";
import { shopPdfPath } from "@/lib/shop-pdf";

/**
 * Slice 8.7 — partner shop shows approved seats + art only.
 * Slice 12.23 — cut-file checklist form lives here, not as a card on `/`.
 * Slice 12.24 — partner marks art shop-ready / needs-fix.
 * Slice 13.24 — brand + trade + art only; never bidder email / userId.
 * No twelve-panel matrix. No public header link (HomeHeader).
 */
export function WrapShopSheet({
  approved,
  artStatuses = {},
}: {
  approved: readonly PartnerShopSeat[];
  artStatuses?: Record<string, ShopArtStatus>;
}) {
  return (
    <div className="wrap-shop-sheet" data-testid="wrap-shop-sheet">
      <ShopCutFileChecklist />
      <section
        className="wrap-shop-rules"
        aria-labelledby="wrap-shop-rules-title"
        data-testid="wrap-shop-rules"
      >
        <h2 id="wrap-shop-rules-title" className="auth-subhead">
          Shop-ready wrap rules
        </h2>
        <ul className="wrap-shop-rules-list">
          <li data-testid="wrap-rule-vector">
            Full-color shop-ready vector. No low-res screenshots.
          </li>
          <li data-testid="wrap-rule-term">
            Wrap term is 12 months from install day — not from close.
          </li>
          <li data-testid="wrap-rule-etch">
            Etch stays locked under {formatUsd(GOAL_USD)} buyout.
          </li>
          <li data-testid="wrap-rule-floor">
            Campaign floor {formatUsd(FLOOR_USD)}. Still no card charge on this
            path.
          </li>
          <li data-testid="wrap-rule-no-email">
            Brand + trade + art only. No bidder email on this sheet.
          </li>
        </ul>
      </section>

      <section
        className="wrap-shop-approved"
        aria-labelledby="wrap-shop-approved-title"
        data-testid="wrap-shop-approved"
      >
        <h2 id="wrap-shop-approved-title" className="auth-subhead">
          Approved seats + art
        </h2>
        {approved.length === 0 ? (
          <p className="empty-state" data-testid="wrap-shop-approved-empty">
            No approved intents yet. Operator approvals feed this list.
          </p>
        ) : (
          <ul
            className="intent-list wrap-shop-approved-list"
            data-testid="wrap-shop-approved-list"
          >
            {approved.map((seat) => {
              const panel = PANELS.find((row) => row.id === seat.panelId);
              const etchable = panel ? isEtchable(panel) : false;
              const artStatus = artStatuses[seat.bidId] ?? "unset";
              return (
                <li
                  key={seat.bidId}
                  className="intent-row"
                  data-testid={`wrap-approved-${seat.bidId}`}
                >
                  <div className="intent-row-main">
                    <strong>
                      <Link href={`/panels/${seat.panelId}`}>
                        {panel?.name ?? seat.panelId}
                      </Link>
                      {" · "}
                      {seat.brandLabel}
                      {" · "}
                      {seat.tradeLabel}
                    </strong>
                    <span className="intent-mark">
                      {formatUsd(seat.standingUsd)}
                    </span>
                  </div>
                  <p
                    className="auth-hint"
                    data-testid={`wrap-approved-finish-${seat.bidId}`}
                  >
                    {etchable
                      ? `Wrap · etchable at ${formatUsd(GOAL_USD)}`
                      : "Wrap only"}
                  </p>
                  {seat.artworkUrl ? (
                    <IntentArtworkPreview
                      artworkUrl={seat.artworkUrl}
                      bidId={seat.bidId}
                    />
                  ) : (
                    <p
                      className="auth-hint"
                      data-testid={`wrap-approved-no-art-${seat.bidId}`}
                    >
                      No artwork attached.
                    </p>
                  )}
                  <ShopArtStatusControls bidId={seat.bidId} status={artStatus} />
                  <p className="auth-hint">
                    Approved — wrap sheet only.{" "}
                    <a
                      href={shopPdfPath(seat.bidId)}
                      data-testid={`wrap-shop-pdf-${seat.bidId}`}
                    >
                      Download seat PDF
                    </a>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
