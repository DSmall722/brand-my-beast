import { handleInternalSendMail } from "@/lib/internal-send-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** BMB-MAIL-1 — internal send. Bearer token only; no session cookie. */
export async function POST(request: Request) {
  return handleInternalSendMail(request);
}
