import { BidDeskProvider } from "@/components/home/BidDesk";
import { HomeEtchSection } from "@/components/home/HomeEtchSection";
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
import { buildAuctionLive } from "@/lib/auction-board";
import { bidDeskMode, buildDayByDay } from "@/lib/bid-desk";
import type { BidPanelQuote } from "@/lib/bid-desk";
import {
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  TRUCK_EXISTS,
  currentBidUsd,
  floorMarkerPercentOnGoalTrack,
  floorProgressPercent,
  formatUsd,
  goalProgressPercent,
  shortfallToFloorUsd,
  shortfallToGoalUsd,
} from "@/lib/campaign";
import { nextStandingUsd } from "@/lib/intent";
import {
  listBidsForPanel,
  loadBoardIntentStats,
  loadStandingHoldersByPanel,
} from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Board stats read the intent ledger; keep dynamic so build does not SSG against DB. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const board = await loadBoardIntentStats();
  const standingHolders = await loadStandingHoldersByPanel();
  const activity = (
    await Promise.all(PANELS.map((panel) => listBidsForPanel(panel.id)))
  ).flat();
  const dayByDay = buildDayByDay(activity);
  const auctionLive = buildAuctionLive(activity);
  const quotes: BidPanelQuote[] = PANELS.map((panel) => {
    const standing = standingHolders.get(panel.id);
    const current = currentBidUsd(panel.openingUsd, standing?.standingUsd);
    return {
      id: panel.id,
      name: panel.name,
      currentBidUsd: current,
      minimumBidUsd: standing ? nextStandingUsd(current) : panel.openingUsd,
    };
  });
  const occupiedPanelIds = [...standingHolders.keys()];
  const pledgedUsd = board.pledgedUsd;
  const floorLabel = formatUsd(FLOOR_USD);
  const goalLabel = formatUsd(GOAL_USD);
  const raisedLabel = formatUsd(pledgedUsd);
  const etchUnlocked = pledgedUsd >= GOAL_USD;
  const floorPct = floorProgressPercent(pledgedUsd);
  const goalPct = goalProgressPercent(pledgedUsd);
  const floorMarkerPct = floorMarkerPercentOnGoalTrack();
  const shortfallFloor = shortfallToFloorUsd(pledgedUsd);
  const shortfallGoal = shortfallToGoalUsd(pledgedUsd);
  const closeCopy =
    CLOSE_AT === null
      ? PUBLIC_COPY.board.clockWhenCloseNull
      : `Closes ${CLOSE_AT}.`;

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
        <BidDeskProvider quotes={quotes} mode={bidDeskMode(CLOSE_AT)}>
        <HomeHeroSection occupiedPanelIds={occupiedPanelIds} />
        <HomeTruckViewsSection occupiedPanelIds={occupiedPanelIds} />
        <HomeMoneySection
          raisedLabel={raisedLabel}
          floorLabel={floorLabel}
          goalLabel={goalLabel}
          goalPct={goalPct}
          floorMarkerPct={floorMarkerPct}
          floorPct={floorPct}
          closeCopy={closeCopy}
          shortfallFloor={shortfallFloor}
          shortfallGoal={shortfallGoal}
          openSeats={board.openSeats}
          pledgedUsd={pledgedUsd}
          dayByDay={dayByDay}
          auctionLive={auctionLive}
        />
        <HomePanelsSection
          etchUnlocked={etchUnlocked}
          standingByPanel={Object.fromEntries(standingHolders)}
        />
        </BidDeskProvider>
        <HomeStorySection />
        <HomeEtchSection />
        <HomeQuestionsSection />
        <TruckExistsBoardSlot />
        <HomeWaitlistSection />
        <TruckExistsCommunitySlot />
      </main>

      <HomeFooter />
    </>
  );
}
