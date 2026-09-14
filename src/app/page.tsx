import { WaitlistForm } from "@/components/WaitlistForm";
import {
  BRAND,
  CLOSE_AT,
  DEPOSIT_PERCENT,
  FLOOR_USD,
  GOAL_USD,
  PANELS,
  formatUsd,
  isEtchable,
  moneyBandCopy,
} from "@/lib/campaign";

/** P1 raised total stays zero until soft auction ships. */
const RAISED_USD = 0;

export default function HomePage() {
  const floorLabel = formatUsd(FLOOR_USD);
  const goalLabel = formatUsd(GOAL_USD);
  const raisedLabel = formatUsd(RAISED_USD);
  const etchUnlocked = RAISED_USD >= GOAL_USD;
  const closeCopy =
    CLOSE_AT === null
      ? "Close date unset. The 30-day clock starts only when the live money path ships."
      : `Closes ${CLOSE_AT}.`;

  return (
    <>
      <header className="shell site-header">
        <div className="wordmark" data-testid="brand-wordmark">
          {BRAND.name}
        </div>
        <a className="nav-link" href="#waitlist">
          Join waitlist
        </a>
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
            Standing bids fund the order. Miss the floor and nobody is charged.
            Immortal etch stays locked until buyout.
          </p>
          <div className="money-grid">
            <div className="money-cell">
              <div className="label">Raised</div>
              <div className="value" data-testid="raised-amount">
                {raisedLabel}
              </div>
              <p className="hint">{moneyBandCopy(RAISED_USD)}</p>
            </div>
            <div className="money-cell">
              <div className="label">Floor</div>
              <div className="value" data-testid="floor-amount">
                {floorLabel}
              </div>
              <p className="hint">
                Clear {floorLabel} to order the Cyberbeast and fund wrap. Miss
                it and every deposit is returned.
              </p>
            </div>
            <div className="money-cell">
              <div className="label">Buyout</div>
              <div className="value" data-testid="goal-amount">
                {goalLabel}
              </div>
              <p className="hint">
                Hit {goalLabel} and the campaign buys the truck. Etch unlocks on
                eight steel faces.
              </p>
            </div>
          </div>
          <div className="progress" data-testid="money-progress">
            <div className="progress-track" aria-hidden="true">
              <div className="progress-fill" />
            </div>
            <div className="progress-meta">
              <span>0% of floor</span>
              <span data-testid="close-copy">{closeCopy}</span>
            </div>
          </div>
          <p className="section-lead" style={{ marginTop: "1.5rem" }}>
            Deposit to list is {DEPOSIT_PERCENT}% when bidding opens. Cards are
            not charged on this waitlist.
          </p>
        </section>

        <section
          className="shell section"
          id="panels"
          aria-labelledby="panels-title"
        >
          <h2 id="panels-title">Twelve panels</h2>
          <p className="section-lead">
            Opening marks are the first bid floor on each seat. Immortal etch is
            available on eight faces only after {goalLabel}.
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
                  <div className="panel-name">{panel.name}</div>
                  <div className="panel-meta">
                    Opens at {formatUsd(panel.openingUsd)}
                  </div>
                  {etchable ? (
                    <span
                      className="badge badge-locked"
                      data-testid={`etch-lock-${panel.id}`}
                    >
                      Etch locked under {goalLabel}
                    </span>
                  ) : (
                    <span className="badge badge-wrap">Wrap only</span>
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
                Brands claim a stainless panel. One brand per trade. The
                operator vetoes art and category collisions.
              </span>
            </li>
            <li>
              <span className="story-num">02</span>
              <span>
                If the board hits {floorLabel}, the Cyberbeast gets ordered and
                wrap is funded. Under that line, full refund.
              </span>
            </li>
            <li>
              <span className="story-num">03</span>
              <span>
                At {goalLabel}, the campaign buys the truck and Immortal etch
                unlocks. Between floor and buyout, wrap only.
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
            Soft auction seats are not open yet. Leave an email and we notify
            when {BRAND.handle} opens bidding from {BRAND.email}.
          </p>
          <WaitlistForm />
        </section>
      </main>

      <footer className="shell site-footer">
        <div>
          {BRAND.name} · {BRAND.handle} ·{" "}
          <a href={`mailto:${BRAND.email}`}>{BRAND.email}</a>
        </div>
        <p className="fine-print">
          Independent. Not Tesla. Work circuit across the Southeast — South
          Carolina home loop, Atlanta, Charlotte, Florida panhandle. Proof is
          miles after the truck exists.
        </p>
      </footer>
    </>
  );
}
