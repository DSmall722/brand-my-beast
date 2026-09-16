/**
 * Slice 12.19 — magic-link verification tokens are consume-once.
 * Mirrors Auth.js adapter contract (`useVerificationToken` deletes).
 * Memory store for CI; live path uses DrizzleAdapter + `authVerificationTokens`.
 */

export type MagicLinkVerificationToken = {
  identifier: string;
  token: string;
  expires: Date;
};

type MemoryRow = {
  identifier: string;
  token: string;
  expires: Date;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbMagicLinkTokens?: Map<string, MemoryRow>;
};

function tokenKey(identifier: string, token: string): string {
  return `${identifier.trim().toLowerCase()}\0${token}`;
}

function memoryStore(): Map<string, MemoryRow> {
  if (!globalStore.__bmbMagicLinkTokens) {
    globalStore.__bmbMagicLinkTokens = new Map();
  }
  return globalStore.__bmbMagicLinkTokens;
}

/** Create a magic-link verification token (intent only — no card). */
export async function createMagicLinkVerificationToken(
  input: MagicLinkVerificationToken,
): Promise<MagicLinkVerificationToken> {
  const identifier = input.identifier.trim().toLowerCase();
  const token = input.token.trim();
  if (!identifier || !token) {
    throw new Error("Magic-link token requires identifier and token.");
  }
  const row: MemoryRow = {
    identifier,
    token,
    expires: input.expires,
  };
  memoryStore().set(tokenKey(identifier, token), row);
  return { ...row };
}

/**
 * Consume a magic-link token once. Returns the row and deletes it.
 * A second call with the same pair returns null (Auth.js contract).
 */
export async function useMagicLinkVerificationToken(params: {
  identifier: string;
  token: string;
}): Promise<MagicLinkVerificationToken | null> {
  const identifier = params.identifier.trim().toLowerCase();
  const token = params.token.trim();
  const key = tokenKey(identifier, token);
  const store = memoryStore();
  const row = store.get(key);
  if (!row) return null;
  if (row.expires.getTime() <= Date.now()) {
    store.delete(key);
    return null;
  }
  store.delete(key);
  return { ...row };
}

/** Peek without consuming — CI only. */
export function peekMagicLinkVerificationToken(params: {
  identifier: string;
  token: string;
}): MagicLinkVerificationToken | null {
  const row = memoryStore().get(
    tokenKey(params.identifier.trim().toLowerCase(), params.token.trim()),
  );
  return row ? { ...row } : null;
}

/** CI helper. */
export function resetMagicLinkVerificationTokensForTests(): void {
  memoryStore().clear();
}
