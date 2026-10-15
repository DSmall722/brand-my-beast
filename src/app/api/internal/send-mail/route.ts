import { handleInternalSendMail } from "@/lib/internal-send-mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handleInternalSendMail(request);
}
