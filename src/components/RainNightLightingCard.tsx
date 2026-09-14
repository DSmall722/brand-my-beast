import {
  RAIN_NIGHT_LIGHTING_FACTS,
  RAIN_NIGHT_LIGHTING_LEAD,
} from "@/lib/rain-night-lighting";

export function RainNightLightingCard() {
  return (
    <div className="rain-night-lighting" data-testid="rain-night-lighting">
      <p className="auth-hint" data-testid="rain-night-lighting-lead">
        {RAIN_NIGHT_LIGHTING_LEAD}
      </p>
      <ul
        className="rain-night-lighting-list"
        data-testid="rain-night-lighting-list"
      >
        {RAIN_NIGHT_LIGHTING_FACTS.map((fact) => (
          <li key={fact.id} data-testid={`rain-night-lighting-${fact.id}`}>
            {fact.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
