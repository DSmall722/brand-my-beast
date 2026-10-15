export const HOMETOWN_LANES = [
  { id: "sc", label: "SC" },
  { id: "charlotte", label: "Charlotte" },
  { id: "atlanta", label: "Atlanta" },
  { id: "panhandle", label: "Panhandle" },
] as const;

export type HometownLaneId = (typeof HOMETOWN_LANES)[number]["id"];

export function hometownLaneLabels(): string[] {
  return HOMETOWN_LANES.map((lane) => lane.label);
}

export function hometownLaneCopyIsSafe(): boolean {
  const blob = [...hometownLaneLabels(), "Work circuit lanes."]
    .join(" ")
    .toLowerCase();
  if (blob.includes("south carolina home loop")) return false;
  if (blob.includes("florida panhandle")) return false;
  return true;
}
