import { NextResponse } from "next/server";
import { getArtworkBlob } from "@/lib/artwork-blob";

export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Slice 8.5 — serve artwork blob bytes. Ledger stores /api/artwork/{id} only.
 */
export async function GET(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const record = await getArtworkBlob(id);
  if (!record) {
    return NextResponse.json({ ok: false, error: "Not found." }, { status: 404 });
  }

  const bytes = Buffer.from(record.bodyBase64, "base64");
  return new NextResponse(bytes, {
    status: 200,
    headers: {
      "Content-Type": record.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
