import Link from "next/link";
import { IntentArtworkPreview } from "@/components/IntentArtworkPreview";
import {
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
} from "@/lib/campaign";
import type { IntentBid } from "@/lib/intent";
import { shopPdfPath } from "@/lib/shop-pdf";

/**
 * Slice 8.7 — partner shop shows approved seats + art only.
 * No twelve-panel matrix. No public header link (HomeHeader).
 */
export function WrapShopSheet({
  approved,
}: {
  approved: readonly IntentBid[];
}) {
  return (
    <div className="wrap-shop-sheet" data-testid="wrap-shop-sheet">
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
            {approved.map((bid) => {
              const panel = PANELS.find((row) => row.id === bid.panelId);
              const etchable = panel ? isEtchable(panel) : false;
              return (
                <li
                  key={bid.id}
                  className="intent-row"
                  data-testid={`wrap-approved-${bid.id}`}
                >
                  <div className="intent-row-main">
                    <strong>
                      <Link href={`/panels/${bid.panelId}`}>
                        {panel?.name ?? bid.panelId}
                      </Link>
                      {" · "}
                      {bid.brandLabel}
                      {" · "}
                      {bid.tradeLabel}
                    </strong>
                    <span className="intent-mark">
                      {formatUsd(bid.standingUsd)}
                    </span>
                  </div>
                  <p
                    className="auth-hint"
                    data-testid={`wrap-approved-finish-${bid.id}`}
                  >
                    {etchable
                      ? `Wrap · etchable at ${formatUsd(GOAL_USD)}`
                      : "Wrap only"}
                  </p>
                  {bid.artworkUrl ? (
                    <IntentArtworkPreview
                      artworkUrl={bid.artworkUrl}
                      bidId={bid.id}
                    />
                  ) : (
                    <p
                      className="auth-hint"
                      data-testid={`wrap-approved-no-art-${bid.id}`}
                    >
                      No artwork attached.
                    </p>
                  )}
                  <p className="auth-hint">
                    Approved — wrap sheet only.{" "}
                    <a
                      href={shopPdfPath(bid.id)}
                      data-testid={`wrap-shop-pdf-${bid.id}`}
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
