import {
  DEFAULT_CONTENT_RIGHTS,
  parseContentRightIds,
  type ContentRightId,
} from "./content-rights";
import {
  leftoverStoreUnavailableError,
  leftoverStoreUsesMemory,
} from "./leftover-store-mode";

export type ContentRightsPrefs = {
  userId: string;
  rights: ContentRightId[];
  updatedAt: string;
};

const globalForRights = globalThis as typeof globalThis & {
  __bmbContentRights?: Map<string, ContentRightsPrefs>;
};

function prefsMap(): Map<string, ContentRightsPrefs> {
  if (!leftoverStoreUsesMemory()) {
    throw leftoverStoreUnavailableError("Content rights store");
  }
  if (!globalForRights.__bmbContentRights) {
    globalForRights.__bmbContentRights = new Map();
  }
  return globalForRights.__bmbContentRights;
}

/** Exported for Playwright / unit gates (slice 7.4). */
export function contentRightsStoreUsesMemory(
  env?: Parameters<typeof leftoverStoreUsesMemory>[0],
): boolean {
  return leftoverStoreUsesMemory(env);
}

export async function getContentRightsForUser(
  userId: string,
): Promise<ContentRightId[]> {
  if (!leftoverStoreUsesMemory()) {
    return [...DEFAULT_CONTENT_RIGHTS];
  }
  const row = prefsMap().get(userId);
  return row ? [...row.rights] : [...DEFAULT_CONTENT_RIGHTS];
}

export async function saveContentRightsForUser(input: {
  userId: string;
  rights: readonly string[];
}): Promise<ContentRightsPrefs> {
  if (!leftoverStoreUsesMemory()) {
    throw leftoverStoreUnavailableError("Content rights store");
  }
  const row: ContentRightsPrefs = {
    userId: input.userId,
    rights: parseContentRightIds(input.rights),
    updatedAt: new Date().toISOString(),
  };
  prefsMap().set(input.userId, row);
  return row;
}

export async function resetContentRightsStoreForTests(): Promise<void> {
  if (!leftoverStoreUsesMemory()) return;
  prefsMap().clear();
}
