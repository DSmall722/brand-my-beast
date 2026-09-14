import {
  CLEMSON_SATURDAY_LOCK_FACTS,
  CLEMSON_SATURDAY_LOCK_LEAD,
} from "@/lib/clemson-saturday-lock";

export function ClemsonSaturdayLockCard() {
  return (
    <div
      className="clemson-saturday-lock"
      data-testid="clemson-saturday-lock"
    >
      <p className="auth-hint" data-testid="clemson-saturday-lock-lead">
        {CLEMSON_SATURDAY_LOCK_LEAD}
      </p>
      <ul
        className="clemson-saturday-lock-list"
        data-testid="clemson-saturday-lock-list"
      >
        {CLEMSON_SATURDAY_LOCK_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`clemson-saturday-lock-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="clemson-saturday-lock-empty">
        No Saturday lock yet. The board opens after the truck exists.
      </p>
    </div>
  );
}
