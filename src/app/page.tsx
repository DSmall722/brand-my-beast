import { AuthNav } from "@/components/AuthNav";
import { CabinPlaqueForm } from "@/components/CabinPlaqueForm";
import { CircuitStoryForm } from "@/components/CircuitStoryForm";
import { EventRequestForm } from "@/components/EventRequestForm";
import { RainNightLightingCard } from "@/components/RainNightLightingCard";
import { RetiredVinylCard } from "@/components/RetiredVinylCard";
import { SeasonTwoBoardCard } from "@/components/SeasonTwoBoardCard";
import { SightingForm } from "@/components/SightingForm";
import { TruckOrderTrackerCard } from "@/components/TruckOrderTrackerCard";
import { VaultCertificateCard } from "@/components/VaultCertificateCard";
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

import {
  BRAND,
  CLOSE_AT,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  TRUCK_EXISTS,
  WRECK_REFUND_RULES,
  floorMarkerPercentOnGoalTrack,
  floorProgressPercent,
  formatUsd,
  goalProgressPercent,
  isEtchable,
  shortfallToFloorUsd,
  shortfallToGoalUsd,
} from "@/lib/campaign";
import { CABIN_PLAQUE_LEAD } from "@/lib/cabin-plaque";
import { listCabinPlaqueLines } from "@/lib/cabin-plaque-store";
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
import { loadBoardIntentStats } from "@/lib/intent-store";
import { SIGHTING_CORRIDORS, SIGHTING_LEAD } from "@/lib/sighting";
import { listSightings } from "@/lib/sighting-store";

/** Board stats read the intent ledger; keep dynamic so build does not SSG against DB. */
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const board = await loadBoardIntentStats();
  const plaques = await listCabinPlaqueLines();
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
      ? "Bidding is not open yet."
      : `Closes ${CLOSE_AT}.`;

  return (
    <>
      <header className="shell site-header">
        <div className="wordmark" data-testid="brand-wordmark">
          {BRAND.name}
        </div>
        <nav className="header-nav" aria-label="Primary">
          <a className="nav-link" href="#waitlist">
            Join waitlist
          </a>
          <a className="nav-link" href="#plaque">
            Cabin plaque
          </a>
          {TRUCK_EXISTS ? (
            <>
              <a className="nav-link" href="#circuit-story">
                Circuit story
              </a>
              <a className="nav-link" href="#sightings">
                Sightings
              </a>
            </>
          ) : null}
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
              alt="Bare stainless Cyberbeast preview of the BrandMyBeast board"
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
              <h1 id="hero-title">{BRAND.name}</h1>
            </div>
            <p className="hero-lead">
              Twelve brands on a Cyberbeast. Bids cover the truck or they come
              back. Ordered only if the board clears.
            </p>
            <div className="hero-actions">
              <a className="btn btn-signal" href="#waitlist">
                Get on the list
              </a>
              <a className="btn btn-ghost" href="#panels">
                See the twelve panels
              </a>
            </div>
          </div>
        </section>

        <section
          className="shell section"
          id="money"
          aria-labelledby="money-title"
        >
          <h2 id="money-title">The board</h2>
          <p className="section-lead">
            Bids fund the truck. Miss the floor and nobody pays.
          </p>
          <div className="money-grid">
            <div className="money-cell">
              <div className="label">Intent pledged</div>
              <div className="value" data-testid="raised-amount">
                {raisedLabel}
              </div>
              <p className="hint" data-testid="raised-hint">
                Under the floor: full refund. Intent only — not charged.
              </p>
            </div>
            <div className="money-cell">
              <div className="label">Floor</div>
              <div className="value" data-testid="floor-amount">
                {floorLabel}
              </div>
              <p className="hint" data-testid="floor-hint">
                Order the Cyberbeast. Fund the wrap.
              </p>
            </div>
            <div className="money-cell">
              <div className="label">Buyout</div>
              <div className="value" data-testid="goal-amount">
                {goalLabel}
              </div>
              <p className="hint" data-testid="goal-hint">
                Campaign buys the truck. Etch unlocks.
              </p>
            </div>
          </div>
          <div
            className="progress visual-vault"
            data-testid="visual-vault"
            role="img"
            aria-label={`Visual vault: ${raisedLabel} of ${goalLabel}. Floor marker at ${floorLabel}.`}
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
                style={{ left: `${floorMarkerPct}%` }}
                title={`Floor ${floorLabel}`}
              />
              <span
                className="vault-marker vault-marker-goal"
                data-testid="vault-marker-goal"
                style={{ left: "100%" }}
                title={`Buyout ${goalLabel}`}
              />
            </div>
            <div className="vault-legend" data-testid="vault-legend">
              <span data-testid="vault-floor-label">Floor {floorLabel}</span>
              <span data-testid="vault-goal-label">Buyout {goalLabel}</span>
            </div>
            <div className="progress-meta">
              <span data-testid="floor-progress-copy">{floorPct}% of floor</span>
              <span data-testid="goal-progress-copy">{goalPct}% of buyout</span>
              <span data-testid="close-copy">{closeCopy}</span>
            </div>
          </div>
          <dl className="shortfall-ticker" data-testid="shortfall-ticker">
            <div>
              <dt>Short of floor</dt>
              <dd data-testid="shortfall-floor">{formatUsd(shortfallFloor)}</dd>
            </div>
            <div>
              <dt>Short of buyout</dt>
              <dd data-testid="shortfall-goal">{formatUsd(shortfallGoal)}</dd>
            </div>
            <div>
              <dt>Open seats</dt>
              <dd data-testid="open-seats">{board.openSeats} of {PANELS.length}</dd>
            </div>
          </dl>
          <p className="section-lead" style={{ marginTop: "1.5rem" }}>
            When bidding opens, {DEPOSIT_PERCENT}% holds your seat. This page
            does not charge cards.
          </p>
        </section>

        <section
          className="shell section"
          id="panels"
          aria-labelledby="panels-title"
        >
          <h2 id="panels-title">Twelve panels</h2>
          <p className="section-lead">
            Starting bids. Eight panels can etch if the board hits {goalLabel}.
          </p>
          <div className="panel-grid" data-testid="panel-grid">
            {PANELS.map((panel) => {
              const etchable = isEtchable(panel);
              return (
                <article
                  key={panel.id}
                  className="panel"
                  data-testid={`panel-${panel.id}`}
                  data-etchable={etchable ? "true" : "false"}
                  data-etch-unlocked={etchUnlocked ? "true" : "false"}
                >
                  <div
                    className="panel-face"
                    aria-hidden="true"
                    data-testid={`panel-face-${panel.id}`}
                  />
                  <div className="panel-name">
                    <a href={`/panels/${panel.id}`} data-testid={`panel-link-${panel.id}`}>
                      {panel.name}
                    </a>
                  </div>
                  <div className="panel-meta">
                    Opens at {formatUsd(panel.openingUsd)}
                  </div>
                  {etchable ? (
                    <span
                      className="badge badge-locked"
                      data-testid={`etch-lock-${panel.id}`}
                    >
                      Etch at $120k
                    </span>
                  ) : (
                    <span className="badge badge-wrap">Wrap</span>
                  )}
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
          <h2 id="story-title">How it works</h2>
          <ol className="story-list">
            <li>
              <span className="story-num">01</span>
              <span>
                Claim a panel. One brand per trade. We approve the art.
              </span>
            </li>
            <li>
              <span className="story-num">02</span>
              <span>
                {floorLabel} orders the Cyberbeast and funds wrap. Miss it →
                full refund.
              </span>
            </li>
            <li>
              <span className="story-num">03</span>
              <span>
                {goalLabel} buys the truck. Etch unlocks on eight steel faces.
              </span>
            </li>
          </ol>
        </section>

        <section
          className="shell section"
          id="wreck"
          aria-labelledby="wreck-title"
        >
          <h2 id="wreck-title">Wreck &amp; refund</h2>
          <p className="section-lead">
            What happens if the campaign misses or the wrap term ends early.
          </p>
          <ul className="wreck-list" data-testid="wreck-refund-rules">
            {WRECK_REFUND_RULES.map((rule) => (
              <li key={rule.id} data-testid={`wreck-rule-${rule.id}`}>
                <strong data-testid={`wreck-title-${rule.id}`}>{rule.title}</strong>
                <span data-testid={`wreck-body-${rule.id}`}>{rule.body}</span>
              </li>
            ))}
          </ul>
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
            Year-two wrap is a new buy. Not a gift. Not for sale yet as rights.
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
            Empty until the truck exists. No invented miles. No reserved VIN.
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
            Empty until the truck exists. No invented visits. No reserved VIN.
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
            Empty until the truck exists. No invented city hours. No reserved
            VIN.
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
            Empty until the truck exists. No invented scan counts. No reserved
            VIN.
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
            Empty until the truck exists. No invented city pings. No reserved
            VIN.
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
            Empty until the truck exists. No invented slot prices. No reserved
            VIN.
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
            Empty until the truck exists. No invented detour prices. No reserved
            VIN.
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
            Empty until the truck exists. No invented lock fee. No reserved VIN.
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
            Empty until the truck exists. No invented bounty dollars. No reserved
            VIN.
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
          <h2 id="waitlist-title">Waitlist</h2>
          <p className="section-lead">
            Bidding isn&apos;t open yet. Leave your email. We&apos;ll tell you
            when seats go live.
          </p>
          <WaitlistForm />
        </section>

        <section
          className="shell section"
          id="plaque"
          aria-labelledby="plaque-title"
          data-testid="cabin-plaque"
        >
          <h2 id="plaque-title">Cabin plaque</h2>
          <p className="section-lead" data-testid="cabin-plaque-lead">
            {CABIN_PLAQUE_LEAD}
          </p>
          <CabinPlaqueForm />
          {plaques.length === 0 ? (
            <p className="empty-state" data-testid="cabin-plaque-empty">
              No cabin names yet. Be the first to reserve one.
            </p>
          ) : (
            <ul
              className="cabin-plaque-list"
              data-testid="cabin-plaque-list"
            >
              {plaques.map((line) => (
                <li
                  key={line.id}
                  data-testid={`cabin-plaque-line-${line.id}`}
                >
                  {line.displayName}
                </li>
              ))}
            </ul>
          )}
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
              No circuit story requests yet. After the truck exists — still no
              auto-tweet.
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
              No public sightings yet. After the truck exists — still no bounty.
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
        <p className="fine-print">Independent. Not Tesla.</p>
      </footer>
    </>
  );
}
