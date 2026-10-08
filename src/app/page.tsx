import type { Metadata } from "next";
import { BidDeskProvider } from "@/components/home/BidDesk";
import { HomeFooter } from "@/components/home/HomeFooter";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeHeroSection } from "@/components/home/HomeHeroSection";
import { HomeJsonLd } from "@/components/home/HomeJsonLd";
import { HomeMoneySection } from "@/components/home/HomeMoneySection";
import { HomePanelsSection } from "@/components/home/HomePanelsSection";
import { HomeQuestionsSection } from "@/components/home/HomeQuestionsSection";
import { HomeSkipLink } from "@/components/home/HomeSkipLink";
import { HomeStorySection } from "@/components/home/HomeStorySection";
import {
  TruckExistsBoardSlot,
  TruckExistsCommunitySlot,
} from "@/components/home/truck-exists-sections";
import { HomeTruckViewsSection } from "@/components/home/HomeTruckViewsSection";
import { HomeWaitlistSection } from "@/components/home/HomeWaitlistSection";
import { buildAuctionLive, highestPendingByPanel } from "@/lib/auction-board";
import { bidDeskMode, buildDayByDay } from "@/lib/bid-desk";
import { resolveCampaignWindowSentence } from "@/lib/campaign-clock";
import { settleIfCampaignClosed } from "@/lib/deposit-flow";
import type { BidPanelQuote } from "@/lib/bid-desk";
import {
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  PUBLIC_SITE_ORIGIN,
  TRUCK_EXISTS,
  currentBidUsd,
  floorProgressPercent,
  formatUsd,
  shortfallToFloorUsd,
} from "@/lib/campaign";
import { nextStandingUsd, pledgedUsdForPanel } from "@/lib/intent";
import {
  listBidsForPanel,
  loadActiveMarkHoldersByPanel,
  loadStandingHoldersByPanel,
} from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Board stats read the intent ledger; keep dynamic so build does not SSG against DB. */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: PUBLIC_SITE_ORIGIN },
};

export default async function HomePage() {
  await settleIfCampaignClosed();
  const standingHolders = await loadStandingHoldersByPanel();
  const activeMarks = await loadActiveMarkHoldersByPanel();
  const activity = (
    await Promise.all(PANELS.map((panel) => listBidsForPanel(panel.id)))
  ).flat();
  const dayByDay = buildDayByDay(activity);
  const auctionLive = buildAuctionLive(activity);
  const pendingByPanel = Object.fromEntries(
    [...highestPendingByPanel(activity).entries()].map(([id, mark]) => [
      id,
      { standingUsd: mark.standingUsd },
    ]),
  );
  const quotes: BidPanelQuote[] = PANELS.map((panel) => {
    const standing = activeMarks.get(panel.id);
    const current = currentBidUsd(panel.openingUsd, standing?.standingUsd);
    return {
      id: panel.id,
      name: panel.name,
      currentBidUsd: current,
      minimumBidUsd: standing ? nextStandingUsd(current) : panel.openingUsd,
      hasStanding: Boolean(standing),
    };
  });
  const occupiedPanelIds = [...standingHolders.keys()];
  const pledgedUsd = PANELS.reduce(
    (sum, panel) =>
      sum +
      pledgedUsdForPanel(
        activity.filter((bid) => bid.panelId === panel.id),
      ),
    0,
  );
  const publicSeated = PANELS.filter(
    (panel) =>
      pledgedUsdForPanel(activity.filter((bid) => bid.panelId === panel.id)) >
      0,
  ).length;
  const floorLabel = formatUsd(FLOOR_USD);
  const raisedLabel = formatUsd(pledgedUsd);
  const etchUnlocked = pledgedUsd >= GOAL_USD;
  const floorPct = floorProgressPercent(pledgedUsd);
  const shortfallFloor = shortfallToFloorUsd(pledgedUsd);
  const bidTimes = activity.map((bid) => bid.createdAt);
  const closeCopy = PUBLIC_COPY.board.clockWhenCloseNull;
  const windowSentence = resolveCampaignWindowSentence(bidTimes);

  return (
    <>
      <HomeJsonLd />
      <HomeSkipLink />
      <HomeHeader />

      <main
        id="main-content"
        data-testid="home-main"
        data-truck-exists={TRUCK_EXISTS ? "true" : "false"}
      >
        <BidDeskProvider quotes={quotes} mode={bidDeskMode(CLOSE_AT, bidTimes)}>
        <HomeHeroSection occupiedPanelIds={occupiedPanelIds} />
        <HomeTruckViewsSection occupiedPanelIds={occupiedPanelIds} />
        <HomeMoneySection
          raisedLabel={raisedLabel}
          floorLabel={floorLabel}
          floorPct={floorPct}
          closeCopy={closeCopy}
          windowSentence={windowSentence}
          shortfallFloor={shortfallFloor}
          openSeats={PANELS.length - publicSeated}
          pledgedUsd={pledgedUsd}
          dayByDay={dayByDay}
          auctionLive={auctionLive}
        />
        <HomePanelsSection
          etchUnlocked={etchUnlocked}
          standingByPanel={Object.fromEntries(standingHolders)}
          pendingByPanel={pendingByPanel}
        />
        </BidDeskProvider>
        <HomeStorySection />
        <HomeQuestionsSection />
        <TruckExistsBoardSlot />
        <HomeWaitlistSection />
        <TruckExistsCommunitySlot />
      </main>

      <HomeFooter />
    </>
  );
}
