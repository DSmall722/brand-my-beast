import Link from "next/link";
import { PANELS, formatUsd, isEtchable, type Panel } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

export type PanelCardStanding = {
  brandLabel: string;
  tradeLabel: string;
  standingUsd: number;
};

/** Slice 7.1 / 10.9 — panel grid; cards show standing brand or Open. */
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
          <p className="section-lead">{PUBLIC_COPY.panels.lead}</p>
          <div className="panel-grid" data-testid="panel-grid">
            {PANELS.map((panel) => {
              const etchable = isEtchable(panel);
              const gloss = PUBLIC_COPY.panels.gloss[panel.id];
              const standing = standingByPanel.get(panel.id) ?? null;
              const standingLabel = standing
                ? standing.brandLabel
                : PUBLIC_COPY.panels.standingOpen;
              return (
                <article
                  key={panel.id}
                  className="panel"
                  data-testid={`panel-${panel.id}`}
                  data-etchable={etchable ? "true" : "false"}
                  data-etch-unlocked={etchUnlocked ? "true" : "false"}
                  data-standing={standing ? "held" : "open"}
                >
                  <Link
                    href={`/panels/${panel.id}`}
                    className="panel-card-link"
                    data-testid={`panel-link-${panel.id}`}
                  >
                    <div
                      className="panel-face"
                      aria-hidden="true"
                      data-testid={`panel-face-${panel.id}`}
                    />
                    <div className="panel-name">
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
                    <div className="panel-meta">
                      Opens at {formatUsd(panel.openingUsd)}
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
