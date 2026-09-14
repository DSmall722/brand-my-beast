import {
  RETIRED_VINYL_FACTS,
  RETIRED_VINYL_LEAD,
} from "@/lib/retired-vinyl";

export function RetiredVinylCard() {
  return (
    <div className="retired-vinyl" data-testid="retired-vinyl">
      <p className="auth-hint" data-testid="retired-vinyl-lead">
        {RETIRED_VINYL_LEAD}
      </p>
      <ul className="retired-vinyl-list" data-testid="retired-vinyl-list">
        {RETIRED_VINYL_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`retired-vinyl-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
