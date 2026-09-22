import type { DayByDay as DayByDayModel } from "@/lib/bid-desk";
import { formatDayMoney } from "@/lib/bid-desk";
import { PUBLIC_COPY } from "@/lib/public-copy";

export function DayByDay({
  model,
  showPanel = true,
}: {
  model: DayByDayModel;
  /** Homepage rows name the panel. A seat page already is that panel. */
  showPanel?: boolean;
}) {
  const copy = PUBLIC_COPY.bidDesk;
  const empty = model.days.length === 0;

  return (
    <section
      className="day-by-day"
      data-testid="day-by-day"
      data-empty={empty ? "true" : "false"}
      aria-labelledby="day-by-day-title"
    >
      <h3 id="day-by-day-title">{copy.dayHeading}</h3>
      {empty ? null : (
        <ol className="day-by-day-list">
          {model.days.map((day, index) => (
            <li key={day.dayKey}>
              <details open={index === 0}>
                <summary data-testid={`day-by-day-${day.dayKey}`}>
                  <span className="day-by-day-meta">
                    <span className="day-by-day-date">{day.dayLabel}</span>
                    <span className="day-by-day-count">
                      {day.bidCount} {day.bidCount === 1 ? "bid" : "bids"} ·{" "}
                      {formatDayMoney(day.bidUsd)} bid
                    </span>
                  </span>
                  <span
                    className="day-by-day-standing"
                    data-standing={day.standingUsd}
                    data-bid-usd={day.bidUsd}
                  >
                    {formatDayMoney(day.standingUsd)}
                  </span>
                </summary>
                <ul className="day-by-day-lines">
                  {day.rows.map((row) => (
                      <li
                      key={row.bidId}
                      className={
                        showPanel
                          ? "day-by-day-line"
                          : "day-by-day-line day-by-day-line-panel"
                      }
                      data-testid={`day-line-${row.bidId}`}
                    >
                      <time>{row.timeLabel}</time>
                      <span>{row.brandLabel}</span>
                      {showPanel ? <span>{row.panelName}</span> : null}
                      <span>{formatDayMoney(row.amountUsd)}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
