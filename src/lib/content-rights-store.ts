import {
  DEFAULT_CONTENT_RIGHTS,
  parseContentRightIds,
  type ContentRightId,
} from "./content-rights";

export type ContentRightsPrefs = {
  userId: string;
  rights: ContentRightId[];
  updatedAt: string;
};

const globalForRights = globalThis as typeof globalThis & {
  __bmbContentRights?: Map<string, ContentRightsPrefs>;
};

function prefsMap(): Map<string, ContentRightsPrefs> {
  if (!globalForRights.__bmbContentRights) {
    globalForRights.__bmbContentRights = new Map();
  }
  return globalForRights.__bmbContentRights;
}

export async function getContentRightsForUser(
  userId: string,
): Promise<ContentRightId[]> {
  const row = prefsMap().get(userId);
  return row ? [...row.rights] : [...DEFAULT_CONTENT_RIGHTS];
}

export async function saveContentRightsForUser(input: {
  userId: string;
  rights: readonly string[];
}): Promise<ContentRightsPrefs> {
  const row: ContentRightsPrefs = {
    userId: input.userId,
    rights: parseContentRightIds(input.rights),
    updatedAt: new Date().toISOString(),
  };
  prefsMap().set(input.userId, row);
  return row;
}

export async function resetContentRightsStoreForTests(): Promise<void> {
  prefsMap().clear();
}
