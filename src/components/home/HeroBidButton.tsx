import { ArrowFillButton } from "@/components/block/arrow-fill-button";
import { PUBLIC_COPY } from "@/lib/public-copy";

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
