import {
  circuitStoryEmailIsValid,
  isCircuitStoryCorridorId,
  normalizeCircuitStoryEmail,
  normalizeCircuitStoryNote,
  type CircuitStoryRequest,
} from "./circuit-story";
import {
  leftoverStoreUnavailableError,
  leftoverStoreUsesMemory,
} from "./leftover-store-mode";

export type SubmitCircuitStoryResult =
  | { ok: true; status: "created" | "exists"; request: CircuitStoryRequest }
  | { ok: false; error: string; code: "invalid" | "unavailable" };

const globalForStories = globalThis as typeof globalThis & {
  __bmbCircuitStories?: Map<string, CircuitStoryRequest>;
};

function storyMap(): Map<string, CircuitStoryRequest> {
  if (!leftoverStoreUsesMemory()) {
    throw leftoverStoreUnavailableError("Circuit story store");
  }
  if (!globalForStories.__bmbCircuitStories) {
    globalForStories.__bmbCircuitStories = new Map();
  }
  return globalForStories.__bmbCircuitStories;
}

/** Exported for Playwright / unit gates (slice 7.4). */
export function circuitStoryStoreUsesMemory(
  env?: Parameters<typeof leftoverStoreUsesMemory>[0],
): boolean {
  return leftoverStoreUsesMemory(env);
}

export async function listCircuitStoryRequests(): Promise<
  CircuitStoryRequest[]
> {
  if (!leftoverStoreUsesMemory()) return [];
  return [...storyMap().values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function submitCircuitStoryRequest(input: {
  email: string;
  corridorId: string;
  note?: string;
}): Promise<SubmitCircuitStoryResult> {
  if (!leftoverStoreUsesMemory()) {
    return {
      ok: false,
      error:
        "Circuit story requests are unavailable until the truck store is durable.",
      code: "unavailable",
    };
  }

  if (!circuitStoryEmailIsValid(input.email)) {
    return {
      ok: false,
      error: "Use a valid email.",
      code: "invalid",
    };
  }
  if (!isCircuitStoryCorridorId(input.corridorId)) {
    return {
      ok: false,
      error: "Pick a soft corridor label.",
      code: "invalid",
    };
  }

  const email = normalizeCircuitStoryEmail(input.email);
  const corridorId = input.corridorId;
  const note = normalizeCircuitStoryNote(input.note ?? "");
  const key = `${email}::${corridorId}`;
  const existing = storyMap().get(key);
  if (existing) {
    return { ok: true, status: "exists", request: existing };
  }

  const request: CircuitStoryRequest = {
    id: `story_${storyMap().size + 1}`,
    email,
    corridorId,
    note,
    createdAt: new Date().toISOString(),
  };
  storyMap().set(key, request);
  return { ok: true, status: "created", request };
}

export async function resetCircuitStoryStoreForTests(): Promise<void> {
  if (!leftoverStoreUsesMemory()) return;
  storyMap().clear();
}
