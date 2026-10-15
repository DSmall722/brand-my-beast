import { isEtchable, isEtchUnlocked, type Panel } from "./campaign";

export function etchControlsEnabled(
  panel: Panel,
  raisedUsd: number,
): boolean {
  return isEtchable(panel) && isEtchUnlocked(raisedUsd);
}

export function etchLockCopy(raisedUsd: number): string {
  if (isEtchUnlocked(raisedUsd)) {
    return "Etch unlocked.";
  }
  return "Etch stays locked until buyout.";
}
