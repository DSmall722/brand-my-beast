import Link from "next/link";
import { AuthNav } from "@/components/AuthNav";
import { CircuitStoryForm } from "@/components/CircuitStoryForm";
import { EventRequestForm } from "@/components/EventRequestForm";
import { RainNightLightingCard } from "@/components/RainNightLightingCard";
import { RetiredVinylCard } from "@/components/RetiredVinylCard";
import { SeasonTwoBoardCard } from "@/components/SeasonTwoBoardCard";
import { SightingForm } from "@/components/SightingForm";
import { TruckOrderTrackerCard } from "@/components/TruckOrderTrackerCard";
import { VaultCertificateCard } from "@/components/VaultCertificateCard";
import { TruckViewHotspots } from "@/components/TruckViewHotspots";
import { WaitlistForm } from "@/components/WaitlistForm";
import { WeeklyMileageLedgerCard } from "@/components/WeeklyMileageLedgerCard";
import { LandmarkProofLogCard } from "@/components/LandmarkProofLogCard";
import { CityTimeHeatmapCard } from "@/components/CityTimeHeatmapCard";
import { QrNfcScanCounterCard } from "@/components/QrNfcScanCounterCard";
import { CityPingWinnerCard } from "@/components/CityPingWinnerCard";
import { ChargeStopSlotsCard } from "@/components/ChargeStopSlotsCard";
import { RouteDetourBuyoutCard } from "@/components/RouteDetourBuyoutCard";
import { ClemsonSaturdayLockCard } from "@/components/ClemsonSaturdayLockCard";
import { SightingBountyCardsCard } from "@/components/SightingBountyCardsCard";
import { WholeTruckIntentForm } from "@/components/WholeTruckIntentForm";
import { auth } from "@/lib/auth";

import {
  BRAND,
  CLOSE_AT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  TRUCK_EXISTS,
  floorMarkerPercentOnGoalTrack,
  floorProgressPercent,
  formatUsd,
  goalProgressPercent,
  isEtchable,
  shortfallToFloorUsd,
  shortfallToGoalUsd,
} from "@/lib/campaign";
import {
  CIRCUIT_STORY_CORRIDORS,
  CIRCUIT_STORY_LEAD,
} from "@/lib/circuit-story";
import { listCircuitStoryRequests } from "@/lib/circuit-story-store";
import {
  EVENT_REQUEST_KINDS,
  EVENT_REQUEST_LEAD,
} from "@/lib/event-request";
import { listEventRequests } from "@/lib/event-request-store";
import {
  loadBoardIntentStats,
  loadStandingHoldersByPanel,
  isWholeTruckIntentOpen,
} from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";
import { SIGHTING_CORRIDORS, SIGHTING_LEAD } from "@/lib/sighting";
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
      <header className="shell site-header">
        <div className="wordmark" data-testid="brand-wordmark">
          {PUBLIC_COPY.header.wordmark}
        </div>
        <nav className="header-nav" aria-label="Primary">
          <a className="nav-link" href="#waitlist">
            {PUBLIC_COPY.header.nav}
          </a>
          <AuthNav />
        </nav>
      </header>

      <main
        data-testid="home-main"
        data-truck-exists={TRUCK_EXISTS ? "true" : "false"}
      >
        <section className="hero" aria-labelledby="hero-title">
          <a
            className="hero-truck-link"
            href="#panels"
            data-testid="hero-truck-preview"
            aria-label="Board preview — jump to the twelve panels"
          >
            {/* eslint-disable-next-line @next/next/no-img-element -- static hero still in /public */}
            <img
              className="hero-truck-image"
              src="/hero-truck-preview.jpg"
              alt={PUBLIC_COPY.hero.imageAlt}
              width={1280}
              height={720}
              decoding="async"
              fetchPriority="high"
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
              <a className="btn btn-signal" href="#waitlist">
                {PUBLIC_COPY.hero.primaryCta}
              </a>
              <a className="btn btn-ghost" href="#panels">
                {PUBLIC_COPY.hero.secondaryCta}
              </a>
            </div>
          </div>
        </section>

        <section
          className="shell section"
          id="truck-views"
          aria-labelledby="truck-views-title"
          data-testid="truck-views-section"
        >
          <h2 id="truck-views-title">Board truck seats</h2>
          <TruckViewHotspots occupiedPanelIds={occupiedPanelIds} />
        </section>

        <section
          className="shell section"
          id="money"
          aria-labelledby="money-title"
        >
          <h2 id="money-title">{PUBLIC_COPY.board.heading}</h2>
          <p className="section-lead">{PUBLIC_COPY.board.lead}</p>
          <div className="money-grid">
            <div className="money-cell">
              <div className="label" data-testid="raised-label">
                {PUBLIC_COPY.board.raisedLabel}
              </div>
              <div className="value" data-testid="raised-amount">
                {raisedLabel}
              </div>
              <p className="hint" data-testid="raised-hint">
                {PUBLIC_COPY.board.raisedHint}
              </p>
            </div>
            <div className="money-cell">
              <div className="label">{PUBLIC_COPY.board.floorLabel}</div>
              <div className="value" data-testid="floor-amount">
                {floorLabel}
              </div>
              <p className="hint" data-testid="floor-hint">
                {PUBLIC_COPY.board.floorHint}
              </p>
            </div>
            <div className="money-cell">
              <div className="label">{PUBLIC_COPY.board.buyoutLabel}</div>
              <div className="value" data-testid="goal-amount">
                {goalLabel}
              </div>
              <p className="hint" data-testid="goal-hint">
                {PUBLIC_COPY.board.buyoutHint}
              </p>
            </div>
          </div>
          <div
            className="progress visual-vault"
            data-testid="visual-vault"
            role="img"
            aria-label={`Visual vault: ${raisedLabel} of ${goalLabel}. Floor marker at ${floorLabel}. Buyout marker at ${goalLabel}.`}
          >
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                data-testid="money-progress-fill"
                style={{ width: `${goalPct}%` }}
              />
              <span
                className="vault-marker vault-marker-floor"
                data-testid="vault-marker-floor"
                data-mark-usd={FLOOR_USD}
                data-mark-pct={floorMarkerPct}
                style={{ left: `${floorMarkerPct}%` }}
                title={`${PUBLIC_COPY.board.vaultFloorMarkLabel} ${floorLabel}`}
              />
              <span
                className="vault-marker vault-marker-goal"
                data-testid="vault-marker-goal"
                data-mark-usd={GOAL_USD}
                data-mark-pct={100}
                style={{ left: "100%" }}
                title={`${PUBLIC_COPY.board.vaultBuyoutMarkLabel} ${goalLabel}`}
              />
            </div>
            <div className="vault-legend" data-testid="vault-legend">
              <span data-testid="vault-floor-label">
                {PUBLIC_COPY.board.vaultFloorMarkLabel} {floorLabel}
              </span>
              <span data-testid="vault-goal-label">
                {PUBLIC_COPY.board.vaultBuyoutMarkLabel} {goalLabel}
              </span>
            </div>
            <div className="progress-meta">
              <span data-testid="floor-progress-copy">{floorPct}% of floor</span>
              <span data-testid="goal-progress-copy">{goalPct}% of buyout</span>
              <span data-testid="close-copy">{closeCopy}</span>
            </div>
          </div>
          <dl
            className="shortfall-ticker"
            data-testid="shortfall-ticker"
            aria-label="Shortfall: dollars to floor and open seats. No impressions."
          >
            <div>
              <dt data-testid="shortfall-floor-label">
                {PUBLIC_COPY.board.shortfallFloorLabel}
              </dt>
              <dd data-testid="shortfall-floor">
                {formatUsd(shortfallFloor)}
              </dd>
            </div>
            <div>
              <dt data-testid="shortfall-goal-label">
                {PUBLIC_COPY.board.shortfallBuyoutLabel}
              </dt>
              <dd data-testid="shortfall-goal">
                {formatUsd(shortfallGoal)}
              </dd>
            </div>
            <div>
              <dt data-testid="open-seats-label">
                {PUBLIC_COPY.board.openSeatsLabel}
              </dt>
              <dd data-testid="open-seats">
                {board.openSeats} of {PANELS.length}
              </dd>
            </div>
          </dl>
          <p
            className="section-lead"
            style={{ marginTop: "1.5rem" }}
            data-testid="intent-no-charge-note"
          >
            Amount is intent only. {PUBLIC_COPY.board.depositLine}
          </p>
          {isWholeTruckIntentOpen(pledgedUsd) ? (
            <div
              className="whole-truck-intent"
              data-testid="whole-truck-intent"
              style={{ marginTop: "1.75rem" }}
            >
              <h3 data-testid="whole-truck-heading">
                {PUBLIC_COPY.board.wholeTruckHeading}
              </h3>
              <p className="section-lead" data-testid="whole-truck-lead">
                {PUBLIC_COPY.board.wholeTruckLead}
              </p>
              {session?.user?.id ? (
                <WholeTruckIntentForm />
              ) : (
                <a
                  className="btn btn-signal"
                  href="/signin?callbackUrl=/#money"
                  data-testid="whole-truck-signin"
                >
                  {PUBLIC_COPY.board.wholeTruckSignIn}
                </a>
              )}
            </div>
          ) : null}
        </section>

        <section
          className="shell section"
          id="panels"
          aria-labelledby="panels-title"
        >
          <h2 id="panels-title">{PUBLIC_COPY.panels.heading}</h2>
          <p className="section-lead">{PUBLIC_COPY.panels.lead}</p>
          <div className="panel-grid" data-testid="panel-grid">
            {PANELS.map((panel) => {
              const etchable = isEtchable(panel);
              const gloss = PUBLIC_COPY.panels.gloss[panel.id];
              return (
                <article
                  key={panel.id}
                  className="panel"
                  data-testid={`panel-${panel.id}`}
                  data-etchable={etchable ? "true" : "false"}
                  data-etch-unlocked={etchUnlocked ? "true" : "false"}
                >
                  <Link
                    href={`/panels/${panel.id}`}
                    className="panel-card-link"
                    data-testid={`panel-link-${panel.id}`}
                  >
                    <div
                      className="panel-face"
                      aria-hidden="true"
                      data-testid={`panel-face-${panel.id}`}
                    />
                    <div className="panel-name">
                      {panel.name}
                      {gloss ? (
                        <span className="panel-gloss"> ({gloss})</span>
                      ) : null}
                    </div>
                    <div className="panel-meta">
                      Opens at {formatUsd(panel.openingUsd)}
                    </div>
                    {etchable ? (
                      <span
                        className="badge badge-locked"
                        data-testid={`etch-lock-${panel.id}`}
                      >
                        {PUBLIC_COPY.panels.badgeEtch}
                      </span>
                    ) : (
                      <span className="badge badge-wrap">
                        {PUBLIC_COPY.panels.badgeWrap}
                      </span>
                    )}
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section
          className="shell section"
          id="story"
          aria-labelledby="story-title"
        >
          <h2 id="story-title">{PUBLIC_COPY.howItWorks.heading}</h2>
          <ol className="story-list">
            {PUBLIC_COPY.howItWorks.steps.map((step, index) => (
              <li key={step.title}>
                <span className="story-num">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span className="story-body">
                  <strong className="story-step-title">{step.title}</strong>
                  <span className="story-step-copy">{step.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        <section
          className="shell section"
          id="etch"
          aria-labelledby="etch-title"
          data-testid="etch-section"
        >
          <h2 id="etch-title">{PUBLIC_COPY.etch.heading}</h2>
          <p className="section-lead">{PUBLIC_COPY.etch.body}</p>
          <p className="section-lead">{PUBLIC_COPY.etch.whyBuyout}</p>
          <p className="section-lead">{PUBLIC_COPY.etch.cost}</p>
          <p className="section-lead">{PUBLIC_COPY.etch.art}</p>
        </section>

        <section
          className="shell section"
          id="wreck"
          aria-labelledby="wreck-title"
          data-testid="wreck-refund-faq"
        >
          <h2 id="wreck-title">{PUBLIC_COPY.wreck.heading}</h2>
          <p className="section-lead">{PUBLIC_COPY.wreck.lead}</p>
          <dl className="wreck-list" data-testid="wreck-refund-rules">
            {PUBLIC_COPY.wreck.items.map((item) => (
              <div key={item.id} data-testid={`wreck-rule-${item.id}`}>
                <dt data-testid={`wreck-title-${item.id}`}>{item.q}</dt>
                <dd data-testid={`wreck-body-${item.id}`}>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section
          className="shell section"
          id="questions"
          aria-labelledby="questions-title"
          data-testid="questions-section"
        >
          <h2 id="questions-title">{PUBLIC_COPY.questions.heading}</h2>
          <dl className="questions-list">
            {PUBLIC_COPY.questions.items.map((item) => (
              <div key={item.q} className="questions-item">
                <dt>{item.q}</dt>
                <dd>{item.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {TRUCK_EXISTS ? (
          <>
            <section
              className="shell section"
              id="vault-certificate"
              aria-labelledby="vault-certificate-title"
            >
              <h2 id="vault-certificate-title">Immortal vault certificate</h2>
              <p className="section-lead">
                The steel record after etch unlocks. Not a cash path.
              </p>
              <VaultCertificateCard />
            </section>

            <section
              className="shell section"
              id="retired-vinyl"
              aria-labelledby="retired-vinyl-title"
            >
              <h2 id="retired-vinyl-title">Retired vinyl</h2>
              <p className="section-lead">
                Framed wrap film after the 12-month term. Not a cash path.
              </p>
              <RetiredVinylCard />
            </section>

            <section
              className="shell section"
              id="season-two"
              aria-labelledby="season-two-title"
            >
              <h2 id="season-two-title">Season 2 board</h2>
              <p className="section-lead">
                Year-two wrap is a new buy. Not a gift. Not for sale yet as
                rights.
              </p>
              <SeasonTwoBoardCard />
            </section>

            <section
              className="shell section"
              id="rain-night-lighting"
              aria-labelledby="rain-night-lighting-title"
            >
              <h2 id="rain-night-lighting-title">Rain / night lighting</h2>
              <p className="section-lead">
                Post-buyout lighting story. Not a livestream. Not a clock.
              </p>
              <RainNightLightingCard />
            </section>

            <section
              className="shell section"
              id="truck-order-tracker"
              aria-labelledby="truck-order-tracker-title"
            >
              <h2 id="truck-order-tracker-title">Truck-order tracker</h2>
              <p className="section-lead">
                Order-path board after the floor. No reserved VIN. Not a clock.
              </p>
              <TruckOrderTrackerCard />
            </section>

            <section
              className="shell section"
              id="weekly-mileage-ledger"
              aria-labelledby="weekly-mileage-ledger-title"
            >
              <h2 id="weekly-mileage-ledger-title">Weekly mileage ledger</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented miles. No reserved
                VIN.
              </p>
              <WeeklyMileageLedgerCard />
            </section>

            <section
              className="shell section"
              id="landmark-proof-log"
              aria-labelledby="landmark-proof-log-title"
            >
              <h2 id="landmark-proof-log-title">Landmark proof log</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented visits. No reserved
                VIN.
              </p>
              <LandmarkProofLogCard />
            </section>

            <section
              className="shell section"
              id="city-time-heatmap"
              aria-labelledby="city-time-heatmap-title"
            >
              <h2 id="city-time-heatmap-title">City time-in-market heatmap</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented city hours. No
                reserved VIN.
              </p>
              <CityTimeHeatmapCard />
            </section>

            <section
              className="shell section"
              id="qr-nfc-scan-counter"
              aria-labelledby="qr-nfc-scan-counter-title"
            >
              <h2 id="qr-nfc-scan-counter-title">QR / NFC raw scan counter</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented scan counts. No
                reserved VIN.
              </p>
              <QrNfcScanCounterCard />
            </section>

            <section
              className="shell section"
              id="city-ping-winner"
              aria-labelledby="city-ping-winner-title"
            >
              <h2 id="city-ping-winner-title">City ping to the panel winner</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented city pings. No
                reserved VIN.
              </p>
              <CityPingWinnerCard />
            </section>

            <section
              className="shell section"
              id="charge-stop-slots"
              aria-labelledby="charge-stop-slots-title"
            >
              <h2 id="charge-stop-slots-title">Charge-stop takeover slots</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented slot prices. No
                reserved VIN.
              </p>
              <ChargeStopSlotsCard />
            </section>

            <section
              className="shell section"
              id="route-detour-buyout"
              aria-labelledby="route-detour-buyout-title"
            >
              <h2 id="route-detour-buyout-title">Route-day detour buyout</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented detour prices. No
                reserved VIN.
              </p>
              <RouteDetourBuyoutCard />
            </section>

            <section
              className="shell section"
              id="clemson-saturday-lock"
              aria-labelledby="clemson-saturday-lock-title"
            >
              <h2 id="clemson-saturday-lock-title">Clemson Saturday lock</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented lock fee. No reserved
                VIN.
              </p>
              <ClemsonSaturdayLockCard />
            </section>

            <section
              className="shell section"
              id="sighting-bounty-cards"
              aria-labelledby="sighting-bounty-cards-title"
            >
              <h2 id="sighting-bounty-cards-title">Sighting bounty cards</h2>
              <p className="section-lead">
                Empty until the truck exists. No invented bounty dollars. No
                reserved VIN.
              </p>
              <SightingBountyCardsCard />
            </section>
          </>
        ) : null}

        <section
          className="shell section"
          id="waitlist"
          aria-labelledby="waitlist-title"
        >
          <h2 id="waitlist-title">{PUBLIC_COPY.waitlist.heading}</h2>
          <p className="section-lead">{PUBLIC_COPY.waitlist.lead}</p>
          <WaitlistForm />
        </section>

        {TRUCK_EXISTS ? (
          <>
            <section
              className="shell section"
              id="circuit-story"
              aria-labelledby="circuit-story-title"
              data-testid="circuit-story"
            >
              <h2 id="circuit-story-title">Request a circuit story</h2>
              <p className="section-lead" data-testid="circuit-story-lead">
                {CIRCUIT_STORY_LEAD}
              </p>
              <CircuitStoryForm />
              {circuitStories.length === 0 ? (
                <p className="empty-state" data-testid="circuit-story-empty">
                  No circuit story requests yet. After the truck exists — still
                  no auto-tweet.
                </p>
              ) : (
                <ul
                  className="circuit-story-list"
                  data-testid="circuit-story-list"
                >
                  {circuitStories.map((row) => {
                    const corridor = CIRCUIT_STORY_CORRIDORS.find(
                      (item) => item.id === row.corridorId,
                    );
                    return (
                      <li
                        key={row.id}
                        data-testid={`circuit-story-row-${row.id}`}
                      >
                        {corridor?.label ?? row.corridorId}
                        {" · requested"}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className="shell section"
              id="sightings"
              aria-labelledby="sightings-title"
              data-testid="sightings"
            >
              <h2 id="sightings-title">Public sighting board</h2>
              <p className="section-lead" data-testid="sighting-lead">
                {SIGHTING_LEAD}
              </p>
              <SightingForm />
              {sightings.length === 0 ? (
                <p className="empty-state" data-testid="sighting-empty">
                  No public sightings yet. After the truck exists — still no
                  bounty.
                </p>
              ) : (
                <ul className="sighting-list" data-testid="sighting-list">
                  {sightings.map((row) => {
                    const corridor = SIGHTING_CORRIDORS.find(
                      (item) => item.id === row.corridorId,
                    );
                    return (
                      <li key={row.id} data-testid={`sighting-row-${row.id}`}>
                        {corridor?.label ?? row.corridorId}
                        {" · "}
                        {row.note}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className="shell section"
              id="event-calendar"
              aria-labelledby="event-calendar-title"
              data-testid="event-calendar"
            >
              <h2 id="event-calendar-title">Event request calendar</h2>
              <p className="section-lead" data-testid="event-calendar-lead">
                {EVENT_REQUEST_LEAD}
              </p>
              <EventRequestForm />
              {eventRequests.length === 0 ? (
                <p className="empty-state" data-testid="event-calendar-empty">
                  No event requests yet. After the truck exists — still no
                  livestream.
                </p>
              ) : (
                <ul
                  className="circuit-story-list"
                  data-testid="event-calendar-list"
                >
                  {eventRequests.map((row) => {
                    const kind = EVENT_REQUEST_KINDS.find(
                      (item) => item.id === row.kindId,
                    );
                    return (
                      <li
                        key={row.id}
                        data-testid={`event-calendar-row-${row.id}`}
                      >
                        {kind?.label ?? row.kindId}
                        {row.requestedDate
                          ? ` · ${row.requestedDate}`
                          : " · requested"}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
        ) : null}
      </main>

      <footer className="shell site-footer">
        <div>
          {BRAND.name} · {BRAND.handle} ·{" "}
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
        </div>
        <p className="fine-print">{PUBLIC_COPY.footer.independent}</p>
      </footer>
    </>
  );
}
