import type { CSSProperties } from "react";
import { TRUCK_EXISTS, isEtchable, type Panel } from "@/lib/campaign";
import { etchControlsEnabled } from "@/lib/etch-lock";
import { panelFaceCropFor, panelFaceStyle } from "@/lib/panel-board";

/**
 * Public seat face crop. Preview chrome and etch-art forms stay off this page.
 */
export function PanelMockup({
  panel,
  raisedUsd = 0,
  truckExists = TRUCK_EXISTS,
}: {
  panel: Panel;
  raisedUsd?: number;
  truckExists?: boolean;
}) {
  const etchable = isEtchable(panel);
  const etchOn = etchControlsEnabled(panel, raisedUsd);
  const face = panelFaceCropFor(panel.id);

  return (
    <div
      className="panel-mockup stainless-compositor"
      data-testid="panel-mockup"
      data-panel={panel.id}
      data-face-still={face.still}
      data-face-pos={face.objectPosition}
      style={panelFaceStyle(panel.id) as CSSProperties}
      data-etchable={etchable ? "true" : "false"}
      data-etch-unlocked={etchOn ? "true" : "false"}
      data-finish="wrap"
      data-condition="day"
      data-pair="false"
      data-truck-exists={truckExists ? "true" : "false"}
      data-preview-toggles="false"
    >
      <div className="panel-mockup-face" aria-hidden="true" />
    </div>
  );
}
