import { ArrowFillButton } from "@/components/block/arrow-fill-button";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Jumps to the seat grid. Panel cards still open Place a bid for that seat. */
export function HeroBidButton() {
  return (
    <ArrowFillButton
      as="a"
      href="#panels"
      data-testid="hero-primary-cta"
    >
      {PUBLIC_COPY.hero.secondaryCta}
    </ArrowFillButton>
  );
}
