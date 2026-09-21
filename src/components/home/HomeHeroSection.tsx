import { ArrowFillButton } from "@/components/block/arrow-fill-button";
import {
  HERO_STILL_NARROW,
  HERO_STILL_NARROW_MEDIA,
  HERO_STILL_SIZES,
  HERO_STILL_SRCSET,
  HERO_STILL_WIDE,
} from "@/lib/hero-still";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "@/lib/panel-board";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";

/** Slice 7.1 / 16.3 / 16.9 — house-wrap concept still. Numbers live on the board. */
export function HomeHeroSection({
  occupiedPanelIds: _occupiedPanelIds = [],
}: {
  occupiedPanelIds?: readonly string[];
}) {
  return (
    <>
        <section
          className="hero"
          aria-labelledby="hero-title"
          data-hero-stack="under-photo"
        >
          <div className="hero-photo-well" data-testid="hero-photo-well">
          <a
            className="hero-truck-link"
            href="/panels/hood"
            data-testid="hero-truck-preview"
            aria-label="Concept preview — open the Hood seat"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- local 1280 + 640 stills in /public */}
            <picture>
              <source
                media={HERO_STILL_NARROW_MEDIA}
                srcSet={HERO_STILL_NARROW.src}
              />
              <img
                className="hero-truck-image"
                src={HERO_STILL_WIDE.src}
                srcSet={HERO_STILL_SRCSET}
                sizes={HERO_STILL_SIZES}
                alt={truckImgAlt("hero")}
                width={HERO_STILL_WIDE.width}
                height={HERO_STILL_WIDE.height}
                decoding="async"
                fetchPriority="high"
                data-testid="truck-img-hero"
                data-truck-img="hero"
              />
            </picture>
          </a>
          </div>
          <div className="hero-overlay">
            <div className="hero-copy">
              <h1 id="hero-title">{PUBLIC_COPY.hero.h1}</h1>
            </div>
            <div className="hero-actions">
              <ArrowFillButton
                href="#panels"
                data-testid="hero-primary-cta"
              >
                {PUBLIC_COPY.hero.secondaryCta}
              </ArrowFillButton>
              <a
                className="btn btn-panel"
                href="#waitlist"
                data-testid="hero-secondary-cta"
              >
                {PUBLIC_COPY.header.nav}
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
