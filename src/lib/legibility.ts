/**
 * Highway-legibility checker (FEATURES P2 #17).
 * Soft rules from RULES.md art constraints — no capture, no clock.
 */

export type LegibilityFinish = "wrap" | "etch";

export type LegibilitySeverity = "pass" | "warn" | "fail";

export type LegibilityIssue = {
  id: string;
  severity: Exclude<LegibilitySeverity, "pass">;
  message: string;
};

export type LegibilityReport = {
  severity: LegibilitySeverity;
  issues: LegibilityIssue[];
};

/** Rough highway wordmark budget — short marks read at speed. */
export const HIGHWAY_BRAND_SOFT_MAX = 18;
export const HIGHWAY_BRAND_HARD_MAX = 28;

const ETCH_FORBIDDEN =
  /\b(gradient|gradients|8[\s-]?pt|8[\s-]?point|fine[\s-]?print|drop[\s-]?shadow|photo)\b/i;

function worstSeverity(
  issues: LegibilityIssue[],
): LegibilitySeverity {
  if (issues.some((i) => i.severity === "fail")) return "fail";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "pass";
}

/**
 * Check a brand mark draft for highway / etch constraints.
 * Soft guidance for P2 — does not block listing unless `fail`.
 */
export function checkHighwayLegibility(input: {
  brandLabel: string;
  finish: LegibilityFinish;
}): LegibilityReport {
  const brand = input.brandLabel.trim();
  const issues: LegibilityIssue[] = [];

  if (brand.length === 0) {
    return { severity: "pass", issues: [] };
  }

  if (brand.length > HIGHWAY_BRAND_HARD_MAX) {
    issues.push({
      id: "brand-too-long",
      severity: "fail",
      message: `Mark is ${brand.length} characters — keep highway wordmarks under ${HIGHWAY_BRAND_HARD_MAX}.`,
    });
  } else if (brand.length > HIGHWAY_BRAND_SOFT_MAX) {
    issues.push({
      id: "brand-long",
      severity: "warn",
      message: `Mark is ${brand.length} characters — under ${HIGHWAY_BRAND_SOFT_MAX} reads cleaner at highway speed.`,
    });
  }

  if (/\s{2,}/.test(brand)) {
    issues.push({
      id: "brand-spacing",
      severity: "warn",
      message: "Collapse extra spaces — dense marks read better at speed.",
    });
  }

  if (input.finish === "etch") {
    if (ETCH_FORBIDDEN.test(brand)) {
      issues.push({
        id: "etch-forbidden-terms",
        severity: "fail",
        message:
          "Etch rejects gradients, 8-pt type, and photo treatments (RULES.md).",
      });
    }
    if (brand.length > 16) {
      issues.push({
        id: "etch-length",
        severity: "warn",
        message:
          "Etch marks should stay short — minimum stroke, no fine type.",
      });
    }
  }

  return { severity: worstSeverity(issues), issues };
}
