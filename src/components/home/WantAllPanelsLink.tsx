"use client";

import { PUBLIC_COPY } from "@/lib/public-copy";

export const WANT_WHOLE_TRUCK_EVENT = "bmb:want-whole-truck";

/** Scrolls to Contact Us and pre-checks whole-truck interest. */
export function WantAllPanelsLink() {
  return (
    <a
      className="btn btn-signal"
      href="#contactus"
      data-testid="want-all-panels"
      onClick={() => {
        window.dispatchEvent(new Event(WANT_WHOLE_TRUCK_EVENT));
      }}
    >
      {PUBLIC_COPY.board.wantAllPanels}
    </a>
  );
}
