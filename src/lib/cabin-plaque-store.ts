import {
  assertPlaqueIsNotABid,
  normalizePlaqueName,
  plaqueNameIsValid,
  type CabinPlaqueLine,
} from "./cabin-plaque";

export type ReservePlaqueResult =
  | { ok: true; status: "created" | "exists"; line: CabinPlaqueLine }
  | { ok: false; error: string; code: "invalid" };

const globalForPlaque = globalThis as typeof globalThis & {
  __bmbCabinPlaques?: Map<string, CabinPlaqueLine>;
};

function plaqueMap(): Map<string, CabinPlaqueLine> {
  if (!globalForPlaque.__bmbCabinPlaques) {
    globalForPlaque.__bmbCabinPlaques = new Map();
  }
  return globalForPlaque.__bmbCabinPlaques;
}

export async function listCabinPlaqueLines(): Promise<CabinPlaqueLine[]> {
  return [...plaqueMap().values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function reserveCabinPlaqueName(
  rawName: string,
): Promise<ReservePlaqueResult> {
  if (!plaqueNameIsValid(rawName)) {
    return {
      ok: false,
      error: "Use a name between 2 and 40 characters.",
      code: "invalid",
    };
  }

  const displayName = normalizePlaqueName(rawName);
  const key = displayName.toLowerCase();
  const existing = plaqueMap().get(key);
  if (existing) {
    assertPlaqueIsNotABid(existing);
    return { ok: true, status: "exists", line: existing };
  }

  const line: CabinPlaqueLine = {
    id: `plaque_${plaqueMap().size + 1}`,
    displayName,
    createdAt: new Date().toISOString(),
  };
  assertPlaqueIsNotABid(line);
  plaqueMap().set(key, line);
  return { ok: true, status: "created", line };
}

export async function resetCabinPlaqueStoreForTests(): Promise<void> {
  plaqueMap().clear();
}
