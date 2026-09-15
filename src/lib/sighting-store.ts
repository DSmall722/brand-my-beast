import {
  isSightingCorridorId,
  normalizeSightingNote,
  sightingNoteIsValid,
  type Sighting,
} from "./sighting";
import {
  leftoverStoreUnavailableError,
  leftoverStoreUsesMemory,
} from "./leftover-store-mode";

export type SubmitSightingResult =
  | { ok: true; status: "created" | "exists"; sighting: Sighting }
  | { ok: false; error: string; code: "invalid" | "unavailable" };

const globalForSightings = globalThis as typeof globalThis & {
  __bmbSightings?: Map<string, Sighting>;
};

function sightingMap(): Map<string, Sighting> {
  if (!leftoverStoreUsesMemory()) {
    throw leftoverStoreUnavailableError("Sighting store");
  }
  if (!globalForSightings.__bmbSightings) {
    globalForSightings.__bmbSightings = new Map();
  }
  return globalForSightings.__bmbSightings;
}

/** Exported for Playwright / unit gates (slice 7.4). */
export function sightingStoreUsesMemory(
  env?: Parameters<typeof leftoverStoreUsesMemory>[0],
): boolean {
  return leftoverStoreUsesMemory(env);
}

export async function listSightings(): Promise<Sighting[]> {
  if (!leftoverStoreUsesMemory()) return [];
  return [...sightingMap().values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function submitSighting(input: {
  corridorId: string;
  note: string;
}): Promise<SubmitSightingResult> {
  if (!leftoverStoreUsesMemory()) {
    return {
      ok: false,
      error: "Sightings are unavailable until the truck store is durable.",
      code: "unavailable",
    };
  }

  if (!isSightingCorridorId(input.corridorId)) {
    return {
      ok: false,
      error: "Pick a soft corridor label.",
      code: "invalid",
    };
  }
  if (!sightingNoteIsValid(input.note)) {
    return {
      ok: false,
      error: "Add a short sighting note.",
      code: "invalid",
    };
  }

  const corridorId = input.corridorId;
  const note = normalizeSightingNote(input.note);
  const key = `${corridorId}::${note.toLowerCase()}`;
  const existing = sightingMap().get(key);
  if (existing) {
    return { ok: true, status: "exists", sighting: existing };
  }

  const sighting: Sighting = {
    id: `sight_${sightingMap().size + 1}`,
    corridorId,
    note,
    createdAt: new Date().toISOString(),
  };
  sightingMap().set(key, sighting);
  return { ok: true, status: "created", sighting };
}

export async function resetSightingStoreForTests(): Promise<void> {
  if (!leftoverStoreUsesMemory()) return;
  sightingMap().clear();
}
