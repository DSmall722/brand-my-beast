import { AuthNav } from "@/components/AuthNav";
import { WaitlistForm } from "@/components/WaitlistForm";
import {
  BRAND,
  CLOSE_AT,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  floorProgressPercent,
  formatUsd,
  isEtchable,
  shortfallToFloorUsd,
  shortfallToGoalUsd,
} from "@/lib/campaign";
import { loadBoardIntentStats } from "@/lib/intent-store";

export default async function HomePage() {
  const board = await loadBoardIntentStats();
  const pledgedUsd = board.pledgedUsd;
  const floorLabel = formatUsd(FLOOR_USD);
  const goalLabel = formatUsd(GOAL_USD);
  const raisedLabel = formatUsd(pledgedUsd);
  const etchUnlocked = pledgedUsd >= GOAL_USD;
  const floorPct = floorProgressPercent(pledgedUsd);
  const shortfallFloor = shortfallToFloorUsd(pledgedUsd);
  const shortfallGoal = shortfallToGoalUsd(pledgedUsd);
  const closeCopy =
    CLOSE_AT === null
      ? "Auction clock starts when bidding opens."
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
          <AuthNav />
        </nav>
      </header>

      <main>
        <section className="shell hero" aria-labelledby="hero-title">
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
          <div className="progress" data-testid="money-progress">
            <div className="progress-track" aria-hidden="true">
              <div
                className="progress-fill"
                data-testid="money-progress-fill"
                style={{ width: `${floorPct}%` }}
              />
            </div>
            <div className="progress-meta">
              <span data-testid="floor-progress-copy">{floorPct}% of floor</span>
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
            doesn&apos;t charge cards. No close clock on P2.
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
