import { enabledAuthProviders, resolveAuthMode } from "@/lib/auth/mode";

export function GET() {
  return Response.json({
    ok: true,
    mode: resolveAuthMode(),
    providers: enabledAuthProviders(),
    capture: false,
    closeAt: null,
  });
}
