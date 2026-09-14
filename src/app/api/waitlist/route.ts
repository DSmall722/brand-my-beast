import { NextResponse } from "next/server";
import { joinWaitlist } from "@/lib/waitlist";

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

  const result = await joinWaitlist(email);

  if (!result.ok) {
    const status =
      result.code === "invalid"
        ? 400
        : result.code === "unavailable"
          ? 503
          : 500;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result, {
    status: result.status === "created" ? 201 : 200,
  });
}
