import type { DayByDay as DayByDayModel } from "@/lib/bid-desk";
import { formatDayMoney } from "@/lib/bid-desk";
import { PUBLIC_COPY } from "@/lib/public-copy";

export function DayByDay({ model }: { model: DayByDayModel }) {
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
                  <span>{day.dayLabel}</span>
                  <span>
                    {day.bidCount} {day.bidCount === 1 ? "bid" : "bids"} ·{" "}
                    {formatDayMoney(day.bidUsd)} bid ·{" "}
                    {formatDayMoney(day.standingUsd)} standing
                  </span>
                </summary>
                <ul>
                  {day.rows.map((row, rowIndex) => (
                    <li key={`${day.dayKey}:${rowIndex}`}>
                      {row.panelName} · {row.brandLabel} ·{" "}
                      {formatDayMoney(row.amountUsd)}
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
