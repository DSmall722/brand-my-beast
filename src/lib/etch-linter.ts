/**
 * Etch constraint linter (FEATURES P2 #18).
 * RULES.md: 1-color, minimum stroke, no gradients, no 8-pt type.
 * Soft guidance only — no capture, no clock.
 */

export type EtchLintSeverity = "pass" | "warn" | "fail";

export type EtchLintIssue = {
  id: string;
  severity: Exclude<EtchLintSeverity, "pass">;
  message: string;
};

export type EtchLintReport = {
  severity: EtchLintSeverity;
  issues: EtchLintIssue[];
};

/** Public checklist shown beside etch preview (RULES.md artwork). */
export const ETCH_CONSTRAINTS = [
  {
    id: "one-color",
    label: "1-color only",
    detail: "No fills beyond a single laserable tone.",
  },
  {
    id: "min-stroke",
    label: "Minimum stroke",
    detail: "Hairlines and fine serifs will not laser clean.",
  },
  {
    id: "no-gradients",
    label: "No gradients",
    detail: "Flat art only — gradients cannot etch.",
  },
  {
    id: "no-fine-type",
    label: "No 8-pt type",
    detail: "Reject type that cannot be lasered at speed.",
  },
] as const;

const FORBIDDEN =
  /\b(gradient|gradients|multi[\s-]?color|full[\s-]?color|cmyk|rgb|photo|photograph|8[\s-]?pt|8[\s-]?point|hairline|drop[\s-]?shadow)\b/i;

function worst(issues: EtchLintIssue[]): EtchLintSeverity {
  if (issues.some((i) => i.severity === "fail")) return "fail";
  if (issues.some((i) => i.severity === "warn")) return "warn";
  return "pass";
}

/**
 * Lint free-text art notes against etch constraints.
 * Empty notes = pass (checklist still shown in UI).
 */
export function lintEtchArtNotes(artNotes: string): EtchLintReport {
  const notes = artNotes.trim();
  const issues: EtchLintIssue[] = [];
  if (!notes) return { severity: "pass", issues: [] };

  if (FORBIDDEN.test(notes)) {
    issues.push({
      id: "etch-forbidden-art",
      severity: "fail",
      message:
        "Etch art cannot use gradients, multi-color, photo, 8-pt type, or hairlines (RULES.md).",
    });
  }

  if (notes.length > 240) {
    issues.push({
      id: "etch-notes-long",
      severity: "warn",
      message: "Keep etch art notes short — laser shops need a clear 1-color brief.",
    });
  }

  if (/\b(2[\s-]?color|two[\s-]?color|full[\s-]?bleed\s+photo)\b/i.test(notes)) {
    issues.push({
      id: "etch-multicolor",
      severity: "fail",
      message: "Etch is 1-color only. Wrap for full-color shop vectors.",
    });
  }

  return { severity: worst(issues), issues };
}
