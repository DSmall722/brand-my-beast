import { NextResponse } from "next/server";
import { submitCircuitStoryRequest } from "@/lib/circuit-story-store";

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
