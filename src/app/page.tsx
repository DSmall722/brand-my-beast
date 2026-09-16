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
import { HomeTruckExistsBoard } from "@/components/home/HomeTruckExistsBoard";
import { HomeTruckExistsCommunity } from "@/components/home/HomeTruckExistsCommunity";
import { HomeTruckViewsSection } from "@/components/home/HomeTruckViewsSection";
import { HomeWaitlistSection } from "@/components/home/HomeWaitlistSection";
import { HomeWreckSection } from "@/components/home/HomeWreckSection";
import { auth } from "@/lib/auth";
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
import { listCircuitStoryRequests } from "@/lib/circuit-story-store";
import { listEventRequests } from "@/lib/event-request-store";
import {
  loadBoardIntentStats,
  loadStandingHoldersByPanel,
} from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { listSightings } from "@/lib/sighting-store";

/** Board stats read the intent ledger; keep dynamic so build does not SSG against DB. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const session = await auth();
  const board = await loadBoardIntentStats();
  const standingHolders = await loadStandingHoldersByPanel();
  const occupiedPanelIds = [...standingHolders.keys()];
  const circuitStories = TRUCK_EXISTS
    ? await listCircuitStoryRequests()
    : [];
  const sightings = TRUCK_EXISTS ? await listSightings() : [];
  const eventRequests = TRUCK_EXISTS ? await listEventRequests() : [];
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
        <HomeHeroSection />
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
          signedIn={Boolean(session?.user)}
        />
        <HomePanelsSection
          etchUnlocked={etchUnlocked}
          standingByPanel={standingHolders}
        />
        <HomeStorySection />
        <HomeEtchSection />
        <HomeWreckSection />
        <HomeQuestionsSection />
        <HomeTruckExistsBoard truckExists={TRUCK_EXISTS} />
        <HomeWaitlistSection />
        <HomeTruckExistsCommunity
          truckExists={TRUCK_EXISTS}
          circuitStories={circuitStories}
          sightings={sightings}
          eventRequests={eventRequests}
        />
      </main>

      <HomeFooter />
    </>
  );
}
