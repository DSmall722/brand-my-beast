/**
 * Hard-reject banned trades (CAMPAIGN brand rules / SLICES 2.3).
 * Porn, hate, scams, and school/grocery-lot fails never list.
 */

export type BannedTradeReason = "porn" | "hate" | "scam" | "school_lot";

const RULES: readonly {
  reason: BannedTradeReason;
  patterns: readonly RegExp[];
}[] = [
  {
    reason: "porn",
    patterns: [/\bporn\b/, /\bxxx\b/, /\bnsfw\b/, /\badult\s+film\b/],
  },
  {
    reason: "hate",
    patterns: [/\bhate\b/, /\bnazi\b/, /\bkkk\b/],
  },
  {
    reason: "scam",
    patterns: [/\bscam\b/, /\bphishing\b/],
  },
  {
    reason: "school_lot",
    patterns: [/\bnude\b/, /\bstrip\s*club\b/, /\bgore\b/],
  },
] as const;

const REASON_LABEL: Record<BannedTradeReason, string> = {
  porn: "porn",
  hate: "hate",
  scam: "scams",
  school_lot: "school-lot fail",
};

/** Scan brand + trade for hard-ban tokens. */
export function findBannedTradeReason(
  brandLabel: string,
  tradeLabel: string,
): BannedTradeReason | null {
  const blob = `${brandLabel} ${tradeLabel}`.trim().toLowerCase();
  for (const rule of RULES) {
    if (rule.patterns.some((re) => re.test(blob))) {
      return rule.reason;
    }
  }
  return null;
}

export function assertTradeAllowed(input: {
  brandLabel: string;
  tradeLabel: string;
}): { ok: true } | { ok: false; error: string; reason: BannedTradeReason } {
  const reason = findBannedTradeReason(input.brandLabel, input.tradeLabel);
  if (!reason) return { ok: true };
  return {
    ok: false,
    reason,
    error: `Hard-reject: ${REASON_LABEL[reason]}. Porn, hate, scams, and school-lot fails cannot list.`,
  };
}
