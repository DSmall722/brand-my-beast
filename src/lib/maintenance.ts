import { CLOSE_AT, MAINTENANCE } from "./campaign";
import { getMaintenanceOverride } from "./maintenance-store";
import { PUBLIC_COPY } from "./public-copy";

/**
 * Slice 14.41 — MAINTENANCE flag. Homepage stays up; intent POST refuses
 * with “not taking marks.” Separate from CLOSE_AT and SEATS_OPEN.
 */

/** Effective maintenance: override, else env MAINTENANCE. */
export function resolveMaintenance(): boolean {
  const override = getMaintenanceOverride();
  if (override !== null) return override;
  return MAINTENANCE;
}

export function maintenanceIsSeparateFromCloseAt(): boolean {
  return CLOSE_AT === null;
}

export function maintenanceNotTakingMarksCopy(): string {
  return PUBLIC_COPY.intent.maintenanceNotTakingMarks;
}

/** JSON body for intent POST when maintenance is on. */
export function maintenanceIntentPayload(): {
  ok: false;
  error: string;
  code: "maintenance";
} {
  return {
    ok: false,
    error: maintenanceNotTakingMarksCopy(),
    code: "maintenance",
  };
}
