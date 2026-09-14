import { isEtchable, type Panel } from "@/lib/campaign";

/** CSS-only steel face preview — placeholder until art compositor ships. */
export function PanelMockup({ panel }: { panel: Panel }) {
  const etchable = isEtchable(panel);
  return (
    <div
      className="panel-mockup"
      data-testid="panel-mockup"
      data-panel={panel.id}
      data-etchable={etchable ? "true" : "false"}
      aria-hidden="true"
    >
      <div className="panel-mockup-face">
        <span className="panel-mockup-label">{panel.name}</span>
        <span className="panel-mockup-finish">
          {etchable ? "Wrap · etch at $120k" : "Wrap only"}
        </span>
      </div>
    </div>
  );
}
