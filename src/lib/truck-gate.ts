import { NextResponse } from "next/server";
import { TRUCK_EXISTS } from "@/lib/campaign";

/**
 * Slice 7.2 — public truck-only surfaces stay dark until TRUCK_EXISTS.
 * Returns a bare 404 Response when the truck is not ordered yet.
 */
export function truckMissingResponse(): NextResponse | null {
  if (TRUCK_EXISTS) return null;
  return new NextResponse(null, { status: 404 });
}
