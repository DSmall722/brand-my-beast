"use client";

import { ArrowFillButton } from "@/components/block/arrow-fill-button";
import { useOpenBid } from "@/components/home/BidDesk";
import { PUBLIC_COPY } from "@/lib/public-copy";

export function HeroBidButton() {
  const openBid = useOpenBid();
  return (
    <ArrowFillButton
      as="button"
      data-testid="hero-primary-cta"
      onClick={() => openBid("hood")}
    >
      {PUBLIC_COPY.hero.secondaryCta}
    </ArrowFillButton>
  );
}
