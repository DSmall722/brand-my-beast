/**
 * Artwork approval checklist (RULES.md / FEATURES P0 leftover).
 * Soft operator guidance + reject-note rule. No capture, no clock.
 */

export type ArtworkChecklistItem = {
  id: string;
  label: string;
  etchOnly?: boolean;
};

export const ARTWORK_CHECKLIST: readonly ArtworkChecklistItem[] = [
  {
    id: "school-grocery",
    label: "Must pass a school drop-off and a grocery lot without flinching.",
  },
  {
    id: "wrap-vector",
    label: "Wrap: full-color shop-ready vector. No low-res screenshots.",
  },
  {
    id: "etch-one-color",
    label: "Etch: one color, min stroke, no gradients, no type under 8 pt.",
    etchOnly: true,
  },
  {
    id: "banned-content",
    label: "No porn, hate, scams, or stolen marks.",
  },
] as const;

export function artworkChecklistForPanel(etchable: boolean): ArtworkChecklistItem[] {
  return ARTWORK_CHECKLIST.filter((item) => !item.etchOnly || etchable);
}

/** Reject requires a non-empty operator note. Approve does not. */
export function assertNoteRequiredForReject(input: {
  decision: "approved" | "rejected";
  note: string;
}): { ok: true } | { ok: false; error: string } {
  if (input.decision !== "rejected") return { ok: true };
  if (input.note.trim().length < 3) {
    return {
      ok: false,
      error: "Reject needs a short note for the bidder.",
    };
  }
  return { ok: true };
}
