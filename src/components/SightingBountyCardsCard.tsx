import {
  SIGHTING_BOUNTY_CARDS_FACTS,
  SIGHTING_BOUNTY_CARDS_LEAD,
} from "@/lib/sighting-bounty-cards";

export function SightingBountyCardsCard() {
  return (
    <div className="sighting-bounty-cards" data-testid="sighting-bounty-cards">
      <p className="auth-hint" data-testid="sighting-bounty-cards-lead">
        {SIGHTING_BOUNTY_CARDS_LEAD}
      </p>
      <ul
        className="sighting-bounty-cards-list"
        data-testid="sighting-bounty-cards-list"
      >
        {SIGHTING_BOUNTY_CARDS_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`sighting-bounty-cards-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="sighting-bounty-cards-empty">
        No bounty cards yet. The board opens after the truck exists.
      </p>
    </div>
  );
}
