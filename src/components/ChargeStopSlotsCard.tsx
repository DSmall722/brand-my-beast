import {
  CHARGE_STOP_SLOTS_FACTS,
  CHARGE_STOP_SLOTS_LEAD,
} from "@/lib/charge-stop-slots";

export function ChargeStopSlotsCard() {
  return (
    <div className="charge-stop-slots" data-testid="charge-stop-slots">
      <p className="auth-hint" data-testid="charge-stop-slots-lead">
        {CHARGE_STOP_SLOTS_LEAD}
      </p>
      <ul
        className="charge-stop-slots-list"
        data-testid="charge-stop-slots-list"
      >
        {CHARGE_STOP_SLOTS_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`charge-stop-slots-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="charge-stop-slots-empty">
        No charge-stop slots yet. Takeovers start after the truck exists.
      </p>
    </div>
  );
}
