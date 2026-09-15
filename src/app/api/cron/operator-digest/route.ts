import { NextResponse } from "next/server";
import {
  buildOperatorDigest,
  isAuthorizedCronRequest,
  sendOperatorDigest,
} from "@/lib/operator-digest";

export const runtime = "nodejs";

/**
 * Slice 8.2 — operator digest cron *route* in repo.
 * Do not register a Vercel cron until the usage hold lifts.
 * Auth: Authorization: Bearer $CRON_SECRET
 */
async function handle(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized." },
      { status: 401 },
    );
  }

  try {
    const digest = await buildOperatorDigest();
    const result = await sendOperatorDigest(digest);
    return NextResponse.json({
      ok: true,
      sent: result.sent,
      skipped: result.skipped,
      digest: result.digest,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Digest failed." },
      { status: 500 },
    );
  }
}

export async function GET(request: Request) {
  return handle(request);
}

export async function POST(request: Request) {
  return handle(request);
}
