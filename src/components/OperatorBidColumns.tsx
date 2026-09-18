import type { IntentBid } from "@/lib/intent";
import { operatorListColumns } from "@/lib/operator-list-columns";

/** Slice 16.22 — #, panel, brand, trade, amount, status. */
export function OperatorBidColumns({
  bid,
}: {
  bid: Pick<
    IntentBid,
    "id" | "panelId" | "brandLabel" | "tradeLabel" | "standingUsd" | "status"
  >;
}) {
  const columns = operatorListColumns(bid);
  return (
    <dl
      className="operator-columns"
      data-testid={`operator-columns-${bid.id}`}
    >
      {columns.map((column) => (
        <div key={column.key}>
          <dt>{column.key}</dt>
          <dd data-testid={`operator-col-${column.key}-${bid.id}`}>
            {column.value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
