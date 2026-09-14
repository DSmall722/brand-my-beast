import {
  CITY_TIME_HEATMAP_FACTS,
  CITY_TIME_HEATMAP_LEAD,
} from "@/lib/city-time-heatmap";

export function CityTimeHeatmapCard() {
  return (
    <div className="city-time-heatmap" data-testid="city-time-heatmap">
      <p className="auth-hint" data-testid="city-time-heatmap-lead">
        {CITY_TIME_HEATMAP_LEAD}
      </p>
      <ul
        className="city-time-heatmap-list"
        data-testid="city-time-heatmap-list"
      >
        {CITY_TIME_HEATMAP_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`city-time-heatmap-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
      <p className="empty-state" data-testid="city-time-heatmap-empty">
        No city heat yet. Cells start after the truck exists.
      </p>
    </div>
  );
}
