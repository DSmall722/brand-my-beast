import { NextResponse } from "next/server";
import { truckMissingResponse } from "@/lib/truck-gate";

/**
 * Slice 14.11 — circuit-story-store stays out of the module graph while
 * TRUCK_EXISTS is false. Dynamic import after the gate is intentional.
 */
export async function POST(request: Request) {
  const missing = truckMissingResponse();
  if (missing) return missing;

  const { submitCircuitStoryRequest } = await import(
    "@/lib/circuit-story-store"
  );

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  const email =
    typeof body === "object" &&
    body !== null &&
    "email" in body &&
    typeof (body as { email: unknown }).email === "string"
      ? (body as { email: string }).email
      : "";
  const corridorId =
    typeof body === "object" &&
    body !== null &&
    "corridorId" in body &&
    typeof (body as { corridorId: unknown }).corridorId === "string"
      ? (body as { corridorId: string }).corridorId
      : "";
  const note =
    typeof body === "object" &&
    body !== null &&
    "note" in body &&
    typeof (body as { note: unknown }).note === "string"
      ? (body as { note: string }).note
      : "";

  const result = await submitCircuitStoryRequest({
    email,
    corridorId,
    note,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      status: result.status,
      corridorId: result.request.corridorId,
    },
    { status: result.status === "created" ? 201 : 200 },
  );
}
