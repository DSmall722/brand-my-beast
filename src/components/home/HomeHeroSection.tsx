import { ArrowFillButton } from "@/components/block/arrow-fill-button";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { truckImgAlt } from "@/lib/truck-img-alt";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeHeroSection() {
  return (
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
  );
}
