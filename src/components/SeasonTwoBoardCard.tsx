import { SEASON_TWO_FACTS, SEASON_TWO_LEAD } from "@/lib/season-two";

export function SeasonTwoBoardCard() {
  return (
    <div className="season-two" data-testid="season-two">
      <p className="auth-hint" data-testid="season-two-lead">
        {SEASON_TWO_LEAD}
      </p>
      <ul className="season-two-list" data-testid="season-two-list">
        {SEASON_TWO_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`season-two-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
