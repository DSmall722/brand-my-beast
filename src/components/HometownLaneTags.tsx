import { HOMETOWN_LANES } from "@/lib/hometown-lane";

/** Soft work-circuit tags on panel / intent UI. Not a required field. */
export function HometownLaneTags() {
  return (
    <div className="hometown-lane" data-testid="hometown-lane">
      <p className="hometown-lane-title">Hometown lane</p>
      <p className="hometown-lane-hint" data-testid="hometown-lane-hint">
        Work circuit lanes — not a 48-state streak.
      </p>
      <ul className="hometown-lane-list" data-testid="hometown-lane-list">
        {HOMETOWN_LANES.map((lane) => (
          <li
            key={lane.id}
            className="hometown-lane-tag"
            data-testid={`hometown-lane-${lane.id}`}
          >
            {lane.label}
          </li>
        ))}
      </ul>
    </div>
  );
}
