import { CLOSE_AT, MAINTENANCE } from "./campaign";
import { getMaintenanceOverride } from "./maintenance-store";
import { PUBLIC_COPY } from "./public-copy";

export function resolveMaintenance(): boolean {
  const override = getMaintenanceOverride();
  if (override !== null) return override;
  return MAINTENANCE;
}

export function maintenanceIsSeparateFromCloseAt(): boolean {
  void CLOSE_AT;
  return true;
}

export function maintenanceNotTakingMarksCopy(): string {
  return PUBLIC_COPY.intent.maintenanceNotTakingMarks;
}

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
