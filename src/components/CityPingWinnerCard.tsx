import {
  CITY_PING_WINNER_FACTS,
  CITY_PING_WINNER_LEAD,
} from "@/lib/city-ping-winner";

export function CityPingWinnerCard() {
  return (
    <div className="city-ping-winner" data-testid="city-ping-winner">
      <p className="auth-hint" data-testid="city-ping-winner-lead">
        {CITY_PING_WINNER_LEAD}
      </p>
      <ul
        className="city-ping-winner-list"
        data-testid="city-ping-winner-list"
      >
        {CITY_PING_WINNER_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`city-ping-winner-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="city-ping-winner-empty">
        No city pings yet. Alerts start after the truck exists.
      </p>
    </div>
  );
}
