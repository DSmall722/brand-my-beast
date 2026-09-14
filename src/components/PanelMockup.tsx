"use client";

import { useState } from "react";
import {
  GOAL_USD,
  formatUsd,
  isEtchable,
  type Panel,
} from "@/lib/campaign";

type FinishMode = "wrap" | "etch";

/**
 * PROCESS-safe stainless compositor: CSS preview of wrap vs etch on the steel
 * face. Etch stays preview-only until buyout — no capture, no clock.
 */
export function PanelMockup({ panel }: { panel: Panel }) {
  const etchable = isEtchable(panel);
  const [mode, setMode] = useState<FinishMode>("wrap");
  const showingEtch = etchable && mode === "etch";

  return (
    <div
      className="panel-mockup stainless-compositor"
      data-testid="panel-mockup"
      data-panel={panel.id}
      data-etchable={etchable ? "true" : "false"}
      data-finish={showingEtch ? "etch" : "wrap"}
    >
      <div
        className="compositor-toolbar"
        data-testid="stainless-compositor"
        role="group"
        aria-label="Stainless finish preview"
      >
        <button
          type="button"
          className={
            mode === "wrap" ? "compositor-tab is-active" : "compositor-tab"
          }
          data-testid="compositor-mode-wrap"
          aria-pressed={mode === "wrap"}
          onClick={() => setMode("wrap")}
        >
          Wrap
        </button>
        <button
          type="button"
          className={
            mode === "etch" ? "compositor-tab is-active" : "compositor-tab"
          }
          data-testid="compositor-mode-etch"
          aria-pressed={mode === "etch"}
          disabled={!etchable}
          title={
            etchable
              ? `Etch preview — unlocks at ${formatUsd(GOAL_USD)}`
              : "This panel is wrap only"
          }
          onClick={() => {
            if (etchable) setMode("etch");
          }}
        >
          Etch
        </button>
      </div>

      <div className="panel-mockup-face" aria-hidden="true">
        <span className="panel-mockup-label">{panel.name}</span>
        <span
          className="panel-mockup-finish"
          data-testid="compositor-finish-label"
        >
          {showingEtch
            ? `Etch preview · locked under ${formatUsd(GOAL_USD)}`
            : etchable
              ? "Wrap on steel · etch at buyout"
              : "Wrap only"}
        </span>
        {showingEtch ? (
          <span
            className="compositor-etch-mark"
            data-testid="compositor-etch-mark"
          >
            Laser on stainless
          </span>
        ) : (
          <span
            className="compositor-wrap-film"
            data-testid="compositor-wrap-film"
          >
            Vinyl film layer
          </span>
        )}
      </div>
    </div>
  );
}
