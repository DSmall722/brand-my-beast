import {
  WEEKLY_MILEAGE_LEDGER_FACTS,
  WEEKLY_MILEAGE_LEDGER_LEAD,
} from "@/lib/weekly-mileage-ledger";

export function WeeklyMileageLedgerCard() {
  return (
    <div className="weekly-mileage-ledger" data-testid="weekly-mileage-ledger">
      <p className="auth-hint" data-testid="weekly-mileage-ledger-lead">
        {WEEKLY_MILEAGE_LEDGER_LEAD}
      </p>
      <ul
        className="weekly-mileage-ledger-list"
        data-testid="weekly-mileage-ledger-list"
      >
        {WEEKLY_MILEAGE_LEDGER_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`weekly-mileage-ledger-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p
        className="empty-state"
        data-testid="weekly-mileage-ledger-empty"
      >
        No weekly rows yet. Miles start after the truck exists.
      </p>
    </div>
  );
}
