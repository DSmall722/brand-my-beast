export type MockupStatus = "queued" | "ready";

export type ImagineMockup = {
  id: string;
  bidId: string;
  panelId: string;
  brandLabel: string;
  tradeLabel: string;
  finish: "wrap" | "etch";
  status: MockupStatus;
  previewKey: string;
  createdAt: string;
  readyAt: string | null;
};

export function previewKeyFor(input: {
  panelId: string;
  brandLabel: string;
}): string {
  const raw = `${input.panelId}:${input.brandLabel.trim().toLowerCase()}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i += 1) {
    hash = (hash * 31 + raw.charCodeAt(i)) >>> 0;
  }
  return `imagine-${hash.toString(16)}`;
}

export function completeSameDayMockup(
  draft: Omit<ImagineMockup, "status" | "readyAt"> & {
    status?: MockupStatus;
    readyAt?: string | null;
  },
): ImagineMockup {
  const createdAt = draft.createdAt;
  return {
    ...draft,
    status: "ready",
    readyAt: createdAt,
  };
}
