"use client";

import { useState } from "react";
import { EtchConstraintLinter } from "@/components/EtchConstraintLinter";
import {
  GOAL_USD,
  formatUsd,
  isEtchable,
  type Panel,
} from "@/lib/campaign";
import {
  FINISH_CONDITIONS,
  type FinishCondition,
} from "@/lib/finish-conditions";

type FinishMode = "wrap" | "etch";

/**
 * PROCESS-safe stainless compositor: CSS preview of wrap vs etch on the steel
 * face, plus day/night/wet/dirty condition shaders. Etch stays preview-only
 * until buyout — no capture, no clock.
 */
export function PanelMockup({ panel }: { panel: Panel }) {
  const etchable = isEtchable(panel);
  const [mode, setMode] = useState<FinishMode>("wrap");
  const [condition, setCondition] = useState<FinishCondition>("day");
  const showingEtch = etchable && mode === "etch";

  return (
    <div
      className="panel-mockup stainless-compositor"
      data-testid="panel-mockup"
      data-panel={panel.id}
      data-etchable={etchable ? "true" : "false"}
      data-finish={showingEtch ? "etch" : "wrap"}
      data-condition={condition}
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

      <div
        className="compositor-conditions"
        data-testid="finish-conditions"
        role="group"
        aria-label="Finish condition shaders"
      >
        {FINISH_CONDITIONS.map((row) => (
          <button
            key={row.id}
            type="button"
            className={
              condition === row.id
                ? "compositor-condition is-active"
                : "compositor-condition"
            }
            data-testid={`finish-condition-${row.id}`}
            aria-pressed={condition === row.id}
            title={row.hint}
            onClick={() => setCondition(row.id)}
          >
            {row.label}
          </button>
        ))}
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
        <span
          className="compositor-condition-label"
          data-testid="finish-condition-label"
        >
          {FINISH_CONDITIONS.find((row) => row.id === condition)?.hint}
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
        <span
          className="compositor-shader"
          data-testid="finish-condition-shader"
          data-condition={condition}
        />
      </div>
      {showingEtch ? <EtchConstraintLinter /> : null}
    </div>
  );
}
