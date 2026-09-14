#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

ART_DIR="$ROOT/.cursor/skills/verify-brandmybeast/artifacts"
PID_FILE="$ART_DIR/dev.pid"

if [[ -f "$PID_FILE" ]]; then
  PID="$(cat "$PID_FILE")"
  if kill -0 "$PID" 2>/dev/null; then
    kill "$PID" 2>/dev/null || true
    # Next often spawns children; give the process group a moment.
    sleep 1
    kill -9 "$PID" 2>/dev/null || true
    echo "stopped pid=$PID"
  else
    echo "stale pid file (process gone)"
  fi
  rm -f "$PID_FILE"
else
  echo "no launch pid recorded"
fi
