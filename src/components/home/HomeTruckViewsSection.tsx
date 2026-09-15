import { TruckViewHotspots } from "@/components/TruckViewHotspots";

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeTruckViewsSection({
  occupiedPanelIds,
}: {
  occupiedPanelIds: string[];
}) {
  return (
        <section
          className="shell section"
          id="truck-views"
          aria-labelledby="truck-views-title"
          data-testid="truck-views-section"
        >
          <h2 id="truck-views-title">Board truck seats</h2>
          <TruckViewHotspots occupiedPanelIds={occupiedPanelIds} />
        </section>
  );
}
