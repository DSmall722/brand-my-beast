#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

PORT="${BMB_VERIFY_PORT:-3010}"
URL="http://127.0.0.1:${PORT}"
ART_DIR="$ROOT/.cursor/skills/verify-brandmybeast/artifacts"
mkdir -p "$ART_DIR"
PID_FILE="$ART_DIR/dev.pid"

if [[ -f "$PID_FILE" ]]; then
  OLD_PID="$(cat "$PID_FILE")"
  if kill -0 "$OLD_PID" 2>/dev/null; then
    echo "Already running pid=$OLD_PID url=$URL"
    echo "$URL"
    exit 0
  fi
  rm -f "$PID_FILE"
fi

# Playwright / next dev leave `.next/dev` without a production BUILD_ID.
# `next start` needs a real production build.
if [[ ! -f .next/BUILD_ID ]]; then
  npm run build
fi

export WAITLIST_MODE=memory
export INTENT_MODE=memory
export AUTH_MODE=test
export AUTH_SECRET="${AUTH_SECRET:-verify-brandmybeast-auth-secret-min-32!!}"
export AUTH_TEST_PASSWORD="${AUTH_TEST_PASSWORD:-test}"
export PORT="$PORT"
npx next start --hostname 127.0.0.1 --port "$PORT" >"$ART_DIR/dev.log" 2>&1 &
echo $! >"$PID_FILE"

i=0
while [[ $i -lt 90 ]]; do
  if curl -sf "$URL" | grep -q "BrandMyBeast"; then
    echo "Ready $URL pid=$(cat "$PID_FILE")"
    echo "$URL"
    exit 0
  fi
  if ! kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "Launch process exited early. See $ART_DIR/dev.log" >&2
    rm -f "$PID_FILE"
    exit 1
  fi
  i=$((i + 1))
  sleep 0.5
done

echo "Launch timed out. See $ART_DIR/dev.log" >&2
"$ROOT/.cursor/skills/verify-brandmybeast/scripts/cleanup.sh" >/dev/null 2>&1 || true
exit 1
