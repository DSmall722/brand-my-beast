import {
  TRUCK_ORDER_TRACKER_FACTS,
  TRUCK_ORDER_TRACKER_LEAD,
} from "@/lib/truck-order-tracker";

export function TruckOrderTrackerCard() {
  return (
    <div className="truck-order-tracker" data-testid="truck-order-tracker">
      <p className="auth-hint" data-testid="truck-order-tracker-lead">
        {TRUCK_ORDER_TRACKER_LEAD}
      </p>
      <ul
        className="truck-order-tracker-list"
        data-testid="truck-order-tracker-list"
      >
        {TRUCK_ORDER_TRACKER_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`truck-order-tracker-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
