import {
  eventRequestEmailIsValid,
  isEventRequestKindId,
  normalizeEventRequestEmail,
  normalizeEventRequestNote,
  normalizeRequestedDate,
  requestedDateIsValid,
  type EventRequest,
} from "./event-request";

export type SubmitEventRequestResult =
  | { ok: true; status: "created" | "exists"; request: EventRequest }
  | { ok: false; error: string; code: "invalid" };

const globalForEvents = globalThis as typeof globalThis & {
  __bmbEventRequests?: Map<string, EventRequest>;
};

function eventMap(): Map<string, EventRequest> {
  if (!globalForEvents.__bmbEventRequests) {
    globalForEvents.__bmbEventRequests = new Map();
  }
  return globalForEvents.__bmbEventRequests;
}

export async function listEventRequests(): Promise<EventRequest[]> {
  return [...eventMap().values()].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
}

export async function submitEventRequest(input: {
  email: string;
  kindId: string;
  requestedDate?: string;
  note?: string;
}): Promise<SubmitEventRequestResult> {
  if (!eventRequestEmailIsValid(input.email)) {
    return {
      ok: false,
      error: "Use a valid email.",
      code: "invalid",
    };
  }
  if (!isEventRequestKindId(input.kindId)) {
    return {
      ok: false,
      error: "Pick a soft event chip.",
      code: "invalid",
    };
  }
  if (!requestedDateIsValid(input.requestedDate ?? "")) {
    return {
      ok: false,
      error: "Use a calendar day, or leave it blank.",
      code: "invalid",
    };
  }

  const email = normalizeEventRequestEmail(input.email);
  const kindId = input.kindId;
  const requestedDate = normalizeRequestedDate(input.requestedDate ?? "");
  const note = normalizeEventRequestNote(input.note ?? "");
  const key = `${email}::${kindId}`;
  const existing = eventMap().get(key);
  if (existing) {
    return { ok: true, status: "exists", request: existing };
  }

  const request: EventRequest = {
    id: `event_${eventMap().size + 1}`,
    email,
    kindId,
    requestedDate,
    note,
    createdAt: new Date().toISOString(),
  };
  eventMap().set(key, request);
  return { ok: true, status: "created", request };
}

export async function resetEventRequestStoreForTests(): Promise<void> {
  eventMap().clear();
}
