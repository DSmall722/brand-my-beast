import { NextResponse } from "next/server";
import { TRUCK_EXISTS } from "@/lib/campaign";

export function truckMissingResponse(): NextResponse | null {
  if (TRUCK_EXISTS) return null;
  return new NextResponse(null, { status: 404 });
}
