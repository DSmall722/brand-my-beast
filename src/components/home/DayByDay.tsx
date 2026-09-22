import type { DayByDay as DayByDayModel } from "@/lib/bid-desk";
import { formatDayMoney } from "@/lib/bid-desk";
import { PUBLIC_COPY } from "@/lib/public-copy";

function firstUnpaidKey(model: DayByDayModel): string | null {
  for (const day of model.days) {
    const index = day.rows.findIndex((row) => row.stillStanding);
    if (index >= 0) return `${day.dayKey}:${index}`;
  }
  return null;
}

export function DayByDay({ model }: { model: DayByDayModel }) {
  const copy = PUBLIC_COPY.bidDesk;
  const lead = model.source === "sample" ? copy.daySampleLead : copy.dayLiveLead;
  const unpaidKey = firstUnpaidKey(model);

  return (
    <section
      className="day-by-day"
      data-testid="day-by-day"
      data-source={model.source}
      aria-labelledby="day-by-day-title"
    >
      <h3 id="day-by-day-title">{copy.dayHeading}</h3>
      <p className="section-lead" data-testid="day-by-day-lead">
        {lead}
      </p>
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
                {day.rows.map((row, rowIndex) => {
                  const rowKey = `${day.dayKey}:${rowIndex}`;
                  return (
                    <li key={rowKey}>
                      <span>
                        {row.panelName} · {row.brandLabel} ·{" "}
                        {formatDayMoney(row.amountUsd)}
                      </span>
                      {row.stillStanding ? (
                        <span
                          className="badge badge-unpaid"
                          data-payment="unpaid"
                          data-testid={rowKey === unpaidKey ? "unpaid-badge" : undefined}
                        >
                          {copy.unpaid}
                        </span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </details>
          </li>
        ))}
      </ol>
    </section>
  );
}
