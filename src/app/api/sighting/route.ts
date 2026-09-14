import { NextResponse } from "next/server";
import { submitSighting } from "@/lib/sighting-store";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, error: "Expected JSON body." },
      { status: 400 },
    );
  }

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

  const result = await submitSighting({ corridorId, note });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      status: result.status,
      corridorId: result.sighting.corridorId,
      note: result.sighting.note,
    },
    { status: result.status === "created" ? 201 : 200 },
  );
}
