import {
  ROUTE_DETOUR_BUYOUT_FACTS,
  ROUTE_DETOUR_BUYOUT_LEAD,
} from "@/lib/route-detour-buyout";

export function RouteDetourBuyoutCard() {
  return (
    <div className="route-detour-buyout" data-testid="route-detour-buyout">
      <p className="auth-hint" data-testid="route-detour-buyout-lead">
        {ROUTE_DETOUR_BUYOUT_LEAD}
      </p>
      <ul
        className="route-detour-buyout-list"
        data-testid="route-detour-buyout-list"
      >
        {ROUTE_DETOUR_BUYOUT_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`route-detour-buyout-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="route-detour-buyout-empty">
        No route detours yet. Buyouts start after the truck exists.
      </p>
    </div>
  );
}
