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

if [[ ! -d .next ]]; then
  npm run build
fi

export WAITLIST_MODE=memory
export PORT="$PORT"
npx next start --hostname 127.0.0.1 --port "$PORT" >"$ART_DIR/dev.log" 2>&1 &
echo $! >"$PID_FILE"

i=0
while [[ $i -lt 60 ]]; do
  if curl -sf "$URL" | grep -q "BrandMyBeast"; then
    echo "Ready $URL pid=$(cat "$PID_FILE")"
    echo "$URL"
    exit 0
  fi
  i=$((i + 1))
  sleep 0.5
done

echo "Launch timed out. See $ART_DIR/dev.log" >&2
exit 1
