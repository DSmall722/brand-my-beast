import Link from "next/link";
import { PANELS, formatUsd, isEtchable } from "@/lib/campaign";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomePanelsSection({ etchUnlocked }: { etchUnlocked: boolean }) {
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
              return (
                <article
                  key={panel.id}
                  className="panel"
                  data-testid={`panel-${panel.id}`}
                  data-etchable={etchable ? "true" : "false"}
                  data-etch-unlocked={etchUnlocked ? "true" : "false"}
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
