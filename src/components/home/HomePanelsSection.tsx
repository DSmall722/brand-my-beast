import Link from "next/link";
import type { CSSProperties } from "react";
import { ImmortalEtchLockup } from "@/components/ImmortalEtchLockup";
import { PANELS, currentBidUsd, formatUsd, isEtchable } from "@/lib/campaign";
import { PANEL_BOARD_MARKS, panelFaceStyle } from "@/lib/panel-board";
import { PUBLIC_COPY } from "@/lib/public-copy";

export type PanelCardStanding = {
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
};

/** Slice 7.1 / 10.9 / 16.1 — panel grid; cards show 1–12 index + standing. */
export function HomePanelsSection({
  etchUnlocked,
  standingByPanel,
}: {
  etchUnlocked: boolean;
  standingByPanel: ReadonlyMap<string, PanelCardStanding>;
}) {
  return (
        <section
          className="shell section"
          id="panels"
          aria-labelledby="panels-title"
        >
          <h2 id="panels-title">{PUBLIC_COPY.panels.heading}</h2>
          <div className="panels-lead-stack" data-testid="panels-lead">
            {PUBLIC_COPY.panels.leadLines.map((line) => (
              <p key={line} className="section-lead">
                <ImmortalEtchLockup text={line} />
              </p>
            ))}
          </div>
          <div className="panel-grid" data-testid="panel-grid">
            {PANELS.map((panel, index) => {
              const mark = PANEL_BOARD_MARKS[index];
              if (!mark || mark.panelId !== panel.id) {
                throw new Error(
                  `panel card index drift: ${panel.id} vs board mark`,
                );
              }
              const etchable = isEtchable(panel);
              const gloss = PUBLIC_COPY.panels.gloss[panel.id];
              const standing = standingByPanel.get(panel.id) ?? null;
              const standingLabel = standing ? standing.brandLabel : "";
              const bidUsd = currentBidUsd(
                panel.openingUsd,
                standing?.standingUsd,
              );
              return (
                <article
                  key={panel.id}
                  className="panel"
                  data-testid={`panel-${panel.id}`}
                  data-panel-n={String(mark.n)}
                  data-etchable={etchable ? "true" : "false"}
                  data-etch-unlocked={etchUnlocked ? "true" : "false"}
                  data-standing={standing ? "held" : "open"}
                >
                  <Link
                    href={`/panels/${panel.id}`}
                    className="panel-card-link"
                    prefetch={true}
                    data-testid={`panel-link-${panel.id}`}
                    data-prefetch-panel={panel.id}
                  >
                    <div
                      className="panel-face"
                      aria-hidden="true"
                      data-testid={`panel-face-${panel.id}`}
                      data-face-still={mark.face.still}
                      data-face-pos={mark.face.objectPosition}
                      style={panelFaceStyle(panel.id) as CSSProperties}
                    />
                    <div className="panel-name">
                      <span
                        className="panel-index"
                        data-testid={`panel-index-${panel.id}`}
                        data-panel-n={String(mark.n)}
                        aria-hidden="true"
                      >
                        {mark.n}
                      </span>
                      {panel.name}
                      {gloss ? (
                        <span className="panel-gloss"> ({gloss})</span>
                      ) : null}
                    </div>
                    <div
                      className="panel-standing"
                      data-testid={`panel-standing-${panel.id}`}
                    >
                      {standingLabel}
                    </div>
                    <div
                      className="panel-meta"
                      data-testid={`panel-current-bid-${panel.id}`}
                    >
                      Current Bid {formatUsd(bidUsd)}
                    </div>
                    {etchable ? (
                      <span
                        className="badge badge-locked"
                        data-testid={`etch-lock-${panel.id}`}
                      >
                        {PUBLIC_COPY.panels.badgeEtch}
                      </span>
                    ) : (
                      <span className="badge badge-wrap">
                        {PUBLIC_COPY.panels.badgeWrap}
                      </span>
                    )}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>
  );
}
