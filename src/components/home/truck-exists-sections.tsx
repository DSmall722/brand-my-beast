import { TRUCK_EXISTS } from "@/lib/campaign";

/**
 * Slice 12.40 — vapor P3–P5 boards stay out of the home module graph while
 * TRUCK_EXISTS is false. Dynamic imports are intentional: a static import of
 * HomeTruckExistsBoard / Community would pull Season 2, sighting, circuit, etc.
 * into every home render even when those sections return null.
 */

export async function TruckExistsBoardSlot() {
  if (!TRUCK_EXISTS) return null;

  const { HomeTruckExistsBoard } = await import("./HomeTruckExistsBoard");
  return <HomeTruckExistsBoard truckExists />;
}

export async function TruckExistsCommunitySlot() {
  if (!TRUCK_EXISTS) return null;

  const [
    { HomeTruckExistsCommunity },
    { listCircuitStoryRequests },
    { listSightings },
    { listEventRequests },
  ] = await Promise.all([
    import("./HomeTruckExistsCommunity"),
    import("@/lib/circuit-story-store"),
    import("@/lib/sighting-store"),
    import("@/lib/event-request-store"),
  ]);

  const [circuitStories, sightings, eventRequests] = await Promise.all([
    listCircuitStoryRequests(),
    listSightings(),
    listEventRequests(),
  ]);

  return (
    <HomeTruckExistsCommunity
      truckExists
      circuitStories={circuitStories}
      sightings={sightings}
      eventRequests={eventRequests}
    />
  );
}
