import { RainNightLightingCard } from "@/components/RainNightLightingCard";
import { RetiredVinylCard } from "@/components/RetiredVinylCard";
import { SeasonTwoBoardCard } from "@/components/SeasonTwoBoardCard";
import { TruckOrderTrackerCard } from "@/components/TruckOrderTrackerCard";
import { VaultCertificateCard } from "@/components/VaultCertificateCard";
import { WeeklyMileageLedgerCard } from "@/components/WeeklyMileageLedgerCard";
import { LandmarkProofLogCard } from "@/components/LandmarkProofLogCard";
import { CityTimeHeatmapCard } from "@/components/CityTimeHeatmapCard";
import { QrNfcScanCounterCard } from "@/components/QrNfcScanCounterCard";
import { CityPingWinnerCard } from "@/components/CityPingWinnerCard";
import { ChargeStopSlotsCard } from "@/components/ChargeStopSlotsCard";
import { RouteDetourBuyoutCard } from "@/components/RouteDetourBuyoutCard";
import { ClemsonSaturdayLockCard } from "@/components/ClemsonSaturdayLockCard";
import { SightingBountyCardsCard } from "@/components/SightingBountyCardsCard";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeTruckExistsBoard({ truckExists }: { truckExists: boolean }) {
  if (!truckExists) return null;
  return (

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
          );
}
