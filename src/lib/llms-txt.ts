import { BRAND, formatUsd, FLOOR_USD, GOAL_USD } from "./campaign";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "./panel-board";
import { PUBLIC_COPY } from "./public-copy";

/**
 * Slice 14.21 / 16.20 — `/llms.txt` from PUBLIC_COPY plus the 1–11 seats.
 * Floor and buyout only. No close date. No lease. How it works names
 * Stripe as the processor. No Stripe package and no payment URL.
 */
export function buildLlmsTxt(): string {
  const lines: string[] = [
    `# ${PUBLIC_COPY.header.wordmark}`,
    "",
    `> ${PUBLIC_COPY.meta.description}`,
    "",
    `https://${BRAND.domain}`,
    PUBLIC_COPY.footer.line,
    PUBLIC_COPY.footer.independent,
    "",
    PUBLIC_COPY.hero.h1,
    PUBLIC_COPY.hero.lead,
    "",
    PUBLIC_COPY.board.heading,
    PUBLIC_COPY.board.lead,
    PUBLIC_COPY.board.floorLabel,
    PUBLIC_COPY.board.floorHint,
    PUBLIC_COPY.board.buyoutLabel,
    PUBLIC_COPY.board.buyoutHint,
    PUBLIC_COPY.board.clockWhenCloseNull,
    PUBLIC_COPY.board.depositLine,
    "",
    PUBLIC_COPY.panels.heading,
    PUBLIC_COPY.panels.lead,
    "",
    PUBLIC_COPY.howItWorks.heading,
    ...PUBLIC_COPY.howItWorks.steps.flatMap((step) => [
      step.title,
      step.body,
    ]),
    "",
    PUBLIC_COPY.etch.heading,
    PUBLIC_COPY.etch.body,
    PUBLIC_COPY.etch.whyBuyout,
    "",
    PUBLIC_COPY.waitlist.heading,
    PUBLIC_COPY.waitlist.lead,
    PUBLIC_COPY.waitlist.idleNote,
    "",
    // Campaign locks — same numbers PUBLIC_COPY already prints; CLOSE_AT fence.
    `Floor ${formatUsd(FLOOR_USD)}. Buyout ${formatUsd(GOAL_USD)}.`,
    "No close date.",
    "Eleven numbered seats",
    ...PANEL_BOARD_MARKS.map((mark) => panelLegendLabel(mark)),
    "",
  ];

  return lines.join("\n");
}
