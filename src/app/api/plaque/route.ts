import { NextResponse } from "next/server";
import { truckMissingResponse } from "@/lib/truck-gate";

/**
 * Slice 14.11 — cabin-plaque-store stays out of the module graph while
 * TRUCK_EXISTS is false. Dynamic import after the gate is intentional.
 */
export async function POST(request: Request) {
  const missing = truckMissingResponse();
  if (missing) return missing;

  const { reserveCabinPlaqueName } = await import("@/lib/cabin-plaque-store");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name
      : "";

  const result = await reserveCabinPlaqueName(name);

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      status: result.status,
      name: result.line.displayName,
    },
    { status: result.status === "created" ? 201 : 200 },
  );
}
