import Link from "next/link";
import { formatUsd } from "@/lib/campaign";
import { COMBO_LOT_LEAD, type ComboLot } from "@/lib/combo-lots";

export function NeighborComboCard({ lot }: { lot: ComboLot }) {
  return (
    <div
      className="neighbor-combo"
      data-testid="neighbor-combo"
      data-combo-price="none"
      data-display-only="true"
    >
      <p className="neighbor-combo-title" data-testid="neighbor-combo-heading">
        Neighboring seats
      </p>
      <p className="auth-hint" data-testid="neighbor-combo-lead">
        {COMBO_LOT_LEAD}
      </p>
      {lot.neighbors.length === 0 ? (
        <p className="auth-hint" data-testid="neighbor-combo-empty">
          No neighboring panels on this seat.
        </p>
      ) : (
        <ul className="neighbor-combo-list" data-testid="neighbor-combo-list">
          {lot.neighbors.map((neighbor) => (
            <li
              key={neighbor.id}
              data-testid={`neighbor-combo-${neighbor.id}`}
            >
              <Link href={`/panels/${neighbor.id}`}>{neighbor.name}</Link>
              {" · opening "}
              {formatUsd(neighbor.openingUsd)}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
