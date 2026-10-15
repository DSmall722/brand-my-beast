import { TruckViewHotspots } from "@/components/TruckViewHotspots";
import { PUBLIC_COPY } from "@/lib/public-copy";

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
          <h2 id="truck-views-title">{PUBLIC_COPY.truckViews.heading}</h2>
          <TruckViewHotspots occupiedPanelIds={occupiedPanelIds} bakedMarks />
        </section>
  );
}
