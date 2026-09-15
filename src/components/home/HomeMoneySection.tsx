import { WholeTruckIntentForm } from "@/components/WholeTruckIntentForm";
import { FLOOR_USD, GOAL_USD, PANELS, formatUsd } from "@/lib/campaign";
import { isWholeTruckIntentOpen } from "@/lib/intent-store";
import { PUBLIC_COPY } from "@/lib/public-copy";

type HomeMoneySectionProps = {
  raisedLabel: string;
  floorLabel: string;
  goalLabel: string;
  goalPct: number;
  floorMarkerPct: number;
  floorPct: number;
  closeCopy: string;
  shortfallFloor: number;
  shortfallGoal: number;
  openSeats: number;
  pledgedUsd: number;
  signedIn: boolean;
};

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeMoneySection({
  raisedLabel,
  floorLabel,
  goalLabel,
  goalPct,
  floorMarkerPct,
  floorPct,
  closeCopy,
  shortfallFloor,
  shortfallGoal,
  openSeats,
  pledgedUsd,
  signedIn,
}: HomeMoneySectionProps) {
  return (
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
                {openSeats} of {PANELS.length}
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
              {signedIn ? (
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
          ) : (
            <p
              className="section-lead"
              style={{ marginTop: "1.75rem" }}
              data-testid="whole-truck-met"
            >
              {PUBLIC_COPY.board.wholeTruckMet}
            </p>
          )}
        </section>
  );
}
