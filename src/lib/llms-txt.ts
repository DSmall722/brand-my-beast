import { BRAND, formatUsd, FLOOR_USD, GOAL_USD } from "./campaign";
import { publishedCloseLabelEt } from "./campaign-window";
import { PANEL_BOARD_MARKS, panelLegendLabel } from "./panel-board";
import { PUBLIC_COPY, waitlistIdleNote } from "./public-copy";

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
    PUBLIC_COPY.board.depositLine,
    "",
    PUBLIC_COPY.panels.heading,
    PUBLIC_COPY.panels.lead,
    "",
    PUBLIC_COPY.howItWorks.heading,
    PUBLIC_COPY.howItWorks.lead,
    ...PUBLIC_COPY.howItWorks.steps.flatMap((step) => [
      step.title,
      step.body,
    ]),
    "",
    PUBLIC_COPY.waitlist.heading,
    PUBLIC_COPY.waitlist.lead,
    waitlistIdleNote(),
    "",
    `If claims plus bids pass ${formatUsd(GOAL_USD)}, see the FAQ for the etch bonus.`,
    `${PUBLIC_COPY.board.floorLabel} ${formatUsd(FLOOR_USD)}.`,
    `Bidding is open. Closes ${publishedCloseLabelEt()}.`,
    "Eleven numbered seats",
    ...PANEL_BOARD_MARKS.map((mark) => panelLegendLabel(mark)),
    "",
  ];

  return lines.join("\n");
}
