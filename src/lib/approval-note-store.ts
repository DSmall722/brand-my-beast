/**
 * Operator veto / approval notes (memory, same pattern as Imagine mockups).
 * Durable column waits — P2 stays capture-free.
 */

export type ApprovalNote = {
  id: string;
  bidId: string;
  decision: "approved" | "rejected";
  note: string;
  createdAt: string;
};

const globalForNotes = globalThis as typeof globalThis & {
  __bmbApprovalNotes?: Map<string, ApprovalNote>;
};

function noteMap(): Map<string, ApprovalNote> {
  if (!globalForNotes.__bmbApprovalNotes) {
    globalForNotes.__bmbApprovalNotes = new Map();
  }
  return globalForNotes.__bmbApprovalNotes;
}

export async function getApprovalNote(
  bidId: string,
): Promise<ApprovalNote | null> {
  return noteMap().get(bidId) ?? null;
}

export async function listApprovalNotesForBids(
  bidIds: string[],
): Promise<Record<string, ApprovalNote>> {
  const out: Record<string, ApprovalNote> = {};
  for (const id of bidIds) {
    const row = noteMap().get(id);
    if (row) out[id] = row;
  }
  return out;
}

export async function saveApprovalNote(input: {
  bidId: string;
  decision: "approved" | "rejected";
  note: string;
}): Promise<ApprovalNote> {
  const row: ApprovalNote = {
    id: crypto.randomUUID(),
    bidId: input.bidId,
    decision: input.decision,
    note: input.note.trim(),
    createdAt: new Date().toISOString(),
  };
  noteMap().set(input.bidId, row);
  return row;
}

export async function resetApprovalNoteStoreForTests(): Promise<void> {
  noteMap().clear();
}
