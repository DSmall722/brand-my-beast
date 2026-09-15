import { CircuitStoryForm } from "@/components/CircuitStoryForm";
import { EventRequestForm } from "@/components/EventRequestForm";
import { SightingForm } from "@/components/SightingForm";
import {
  CIRCUIT_STORY_CORRIDORS,
  CIRCUIT_STORY_LEAD,
} from "@/lib/circuit-story";
import {
  EVENT_REQUEST_KINDS,
  EVENT_REQUEST_LEAD,
} from "@/lib/event-request";
import { SIGHTING_CORRIDORS, SIGHTING_LEAD } from "@/lib/sighting";

type Row = { id: string; corridorId?: string; kindId?: string; note?: string; requestedDate?: string | null };

/** Slice 7.1 — extracted from `src/app/page.tsx`. Copy unchanged. */
export function HomeTruckExistsCommunity({
  truckExists,
  circuitStories,
  sightings,
  eventRequests,
}: {
  truckExists: boolean;
  circuitStories: Row[];
  sightings: Row[];
  eventRequests: Row[];
}) {
  if (!truckExists) return null;
  return (

          <>
            <section
              className="shell section"
              id="circuit-story"
              aria-labelledby="circuit-story-title"
              data-testid="circuit-story"
            >
              <h2 id="circuit-story-title">Request a circuit story</h2>
              <p className="section-lead" data-testid="circuit-story-lead">
                {CIRCUIT_STORY_LEAD}
              </p>
              <CircuitStoryForm />
              {circuitStories.length === 0 ? (
                <p className="empty-state" data-testid="circuit-story-empty">
                  No circuit story requests yet. After the truck exists — still
                  no auto-tweet.
                </p>
              ) : (
                <ul
                  className="circuit-story-list"
                  data-testid="circuit-story-list"
                >
                  {circuitStories.map((row) => {
                    const corridor = CIRCUIT_STORY_CORRIDORS.find(
                      (item) => item.id === row.corridorId,
                    );
                    return (
                      <li
                        key={row.id}
                        data-testid={`circuit-story-row-${row.id}`}
                      >
                        {corridor?.label ?? row.corridorId}
                        {" · requested"}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className="shell section"
              id="sightings"
              aria-labelledby="sightings-title"
              data-testid="sightings"
            >
              <h2 id="sightings-title">Public sighting board</h2>
              <p className="section-lead" data-testid="sighting-lead">
                {SIGHTING_LEAD}
              </p>
              <SightingForm />
              {sightings.length === 0 ? (
                <p className="empty-state" data-testid="sighting-empty">
                  No public sightings yet. After the truck exists — still no
                  bounty.
                </p>
              ) : (
                <ul className="sighting-list" data-testid="sighting-list">
                  {sightings.map((row) => {
                    const corridor = SIGHTING_CORRIDORS.find(
                      (item) => item.id === row.corridorId,
                    );
                    return (
                      <li key={row.id} data-testid={`sighting-row-${row.id}`}>
                        {corridor?.label ?? row.corridorId}
                        {" · "}
                        {row.note}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section
              className="shell section"
              id="event-calendar"
              aria-labelledby="event-calendar-title"
              data-testid="event-calendar"
            >
              <h2 id="event-calendar-title">Event request calendar</h2>
              <p className="section-lead" data-testid="event-calendar-lead">
                {EVENT_REQUEST_LEAD}
              </p>
              <EventRequestForm />
              {eventRequests.length === 0 ? (
                <p className="empty-state" data-testid="event-calendar-empty">
                  No event requests yet. After the truck exists — still no
                  livestream.
                </p>
              ) : (
                <ul
                  className="circuit-story-list"
                  data-testid="event-calendar-list"
                >
                  {eventRequests.map((row) => {
                    const kind = EVENT_REQUEST_KINDS.find(
                      (item) => item.id === row.kindId,
                    );
                    return (
                      <li
                        key={row.id}
                        data-testid={`event-calendar-row-${row.id}`}
                      >
                        {kind?.label ?? row.kindId}
                        {row.requestedDate
                          ? ` · ${row.requestedDate}`
                          : " · requested"}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </>
          );
}
