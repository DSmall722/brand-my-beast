import { NextResponse } from "next/server";
import { submitEventRequest } from "@/lib/event-request-store";

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
  const kindId =
    typeof body === "object" &&
    body !== null &&
    "kindId" in body &&
    typeof (body as { kindId: unknown }).kindId === "string"
      ? (body as { kindId: string }).kindId
      : "";
  const requestedDate =
    typeof body === "object" &&
    body !== null &&
    "requestedDate" in body &&
    typeof (body as { requestedDate: unknown }).requestedDate === "string"
      ? (body as { requestedDate: string }).requestedDate
      : "";
  const note =
    typeof body === "object" &&
    body !== null &&
    "note" in body &&
    typeof (body as { note: unknown }).note === "string"
      ? (body as { note: string }).note
      : "";

  const result = await submitEventRequest({
    email,
    kindId,
    requestedDate,
    note,
  });

  if (!result.ok) {
    return NextResponse.json(result, { status: 400 });
  }

  return NextResponse.json(
    {
      ok: true,
      status: result.status,
      kindId: result.request.kindId,
    },
    { status: result.status === "created" ? 201 : 200 },
  );
}
