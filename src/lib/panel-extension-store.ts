/**
 * Slice 9.3 — panelExtendedUntil ledger (memory CI / Postgres Production).
 * Seat soft-close extension only. Never writes CLOSE_AT.
 */

import { eq } from "drizzle-orm";
import { getDb } from "./db";
import { panelExtensions } from "./db/schema";
import {
  assertCloseAtUntouched,
  isKnownPanelId,
  parsePanelExtendedUntil,
  type PanelExtendedUntil,
} from "./panel-extension";

type MemoryEnv = {
  VERCEL_ENV?: string;
  INTENT_MODE?: string;
  DATABASE_URL?: string;
};

const globalStore = globalThis as typeof globalThis & {
  __bmbPanelExtendedUntil?: Map<string, string>;
};

function memoryMap(): Map<string, string> {
  if (!globalStore.__bmbPanelExtendedUntil) {
    globalStore.__bmbPanelExtendedUntil = new Map();
  }
  return globalStore.__bmbPanelExtendedUntil;
}

export function panelExtensionUsesMemory(
  env: MemoryEnv = process.env as MemoryEnv,
): boolean {
  if (env.VERCEL_ENV === "production") return false;
  if (env.INTENT_MODE === "memory") return true;
  if (env.INTENT_MODE === "postgres") return false;
  return !env.DATABASE_URL;
}

export async function getPanelExtendedUntil(
  panelId: string,
): Promise<PanelExtendedUntil> {
  assertCloseAtUntouched();
  if (!isKnownPanelId(panelId)) return null;

  if (panelExtensionUsesMemory()) {
    return memoryMap().get(panelId) ?? null;
  }

  const db = getDb();
  if (!db) return null;
  const rows = await db
    .select()
    .from(panelExtensions)
    .where(eq(panelExtensions.panelId, panelId))
    .limit(1);
  const row = rows[0];
  if (!row?.extendedUntil) return null;
  return row.extendedUntil.toISOString();
}

export type SetPanelExtendedUntilResult =
  | { ok: true; panelExtendedUntil: PanelExtendedUntil }
  | { ok: false; error: string };

export async function setPanelExtendedUntil(
  panelId: string,
  raw: unknown,
): Promise<SetPanelExtendedUntilResult> {
  assertCloseAtUntouched();
  if (!isKnownPanelId(panelId)) {
    return { ok: false, error: "Unknown panel." };
  }
  const parsed = parsePanelExtendedUntil(raw);
  if (!parsed.ok) return parsed;

  if (panelExtensionUsesMemory()) {
    if (parsed.panelExtendedUntil == null) {
      memoryMap().delete(panelId);
    } else {
      memoryMap().set(panelId, parsed.panelExtendedUntil);
    }
    assertCloseAtUntouched();
    return { ok: true, panelExtendedUntil: parsed.panelExtendedUntil };
  }

  const db = getDb();
  if (!db) {
    return { ok: false, error: "Panel extension ledger is not configured." };
  }

  if (parsed.panelExtendedUntil == null) {
    await db
      .delete(panelExtensions)
      .where(eq(panelExtensions.panelId, panelId));
  } else {
    const extendedUntil = new Date(parsed.panelExtendedUntil);
    const existing = await db
      .select()
      .from(panelExtensions)
      .where(eq(panelExtensions.panelId, panelId))
      .limit(1);
    if (existing[0]) {
      await db
        .update(panelExtensions)
        .set({ extendedUntil })
        .where(eq(panelExtensions.panelId, panelId));
    } else {
      await db.insert(panelExtensions).values({
        panelId,
        extendedUntil,
      });
    }
  }

  assertCloseAtUntouched();
  return { ok: true, panelExtendedUntil: parsed.panelExtendedUntil };
}

export async function resetPanelExtensionStoreForTests(): Promise<void> {
  assertCloseAtUntouched();
  if (panelExtensionUsesMemory()) {
    memoryMap().clear();
    return;
  }
  const db = getDb();
  if (!db) return;
  await db.delete(panelExtensions);
}
