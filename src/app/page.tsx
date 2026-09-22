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
import {
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  TRUCK_EXISTS,
  floorMarkerPercentOnGoalTrack,
  floorProgressPercent,
  formatUsd,
  goalProgressPercent,
  shortfallToFloorUsd,
  shortfallToGoalUsd,
} from "@/lib/campaign";
import {
  loadBoardIntentStats,
  loadStandingHoldersByPanel,
} from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";

/** Board stats read the intent ledger; keep dynamic so build does not SSG against DB. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const board = await loadBoardIntentStats();
  const standingHolders = await loadStandingHoldersByPanel();
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
        />
        <HomePanelsSection
          etchUnlocked={etchUnlocked}
          standingByPanel={standingHolders}
        />
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
