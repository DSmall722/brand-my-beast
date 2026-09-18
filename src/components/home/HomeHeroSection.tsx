import { ArrowFillButton } from "@/components/block/arrow-fill-button";
import { PanelBoardCallouts } from "@/components/PanelBoardCallouts";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "@/lib/panel-board";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";

/** Slice 7.1 / 16.3 — hero still plus number map from PANELS. */
export function HomeHeroSection() {
  return (
    <>
        <section className="hero" aria-labelledby="hero-title">
          <a
            className="hero-truck-link"
            href="/panels/hood"
            data-testid="hero-truck-preview"
            aria-label="Board preview — open the Hood seat"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static hero still in /public */}
            <img
              className="hero-truck-image"
              src="/hero-truck-preview.jpg"
              alt={truckImgAlt("hero")}
              width={1280}
              height={720}
              decoding="async"
              fetchPriority="high"
              data-testid="truck-img-hero"
              data-truck-img="hero"
            />
          </a>
          <PanelBoardCallouts surface="hero" />
          <div className="hero-overlay">
            <p className="hero-preview-label" data-testid="hero-preview-label">
              Board preview — bare stainless. Wrap and etch unlock later.
            </p>
            <div className="hero-copy">
              <h1 id="hero-title">{PUBLIC_COPY.hero.h1}</h1>
            </div>
            <p className="hero-lead">{PUBLIC_COPY.hero.lead}</p>
            <div className="hero-actions">
              <ArrowFillButton
                href="#waitlist"
                data-testid="hero-primary-cta"
              >
                {PUBLIC_COPY.hero.primaryCta}
              </ArrowFillButton>
              <a
                className="btn btn-ghost"
                href="/panels/hood"
                data-testid="hero-secondary-cta"
              >
                {PUBLIC_COPY.hero.secondaryCta}
              </a>
            </div>
          </div>
        </section>
        <nav
          className="shell panel-number-legend"
          aria-label="Panel number map"
          data-testid="panel-number-legend"
        >
          <ol>
            {PANEL_BOARD_MARKS.map((mark) => (
              <li key={mark.panelId}>
                <a
                  href={`/panels/${mark.panelId}`}
                  data-testid={`panel-legend-${mark.n}`}
                  data-panel-id={mark.panelId}
                  data-panel-n={String(mark.n)}
                >
                  {panelLegendLabel(mark)}
                </a>
              </li>
            ))}
          </ol>
        </nav>
    </>
  );
}

