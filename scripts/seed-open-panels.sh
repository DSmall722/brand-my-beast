#!/usr/bin/env bash
# Slice 12.10 — seed 12 open panels, zero standing. CI / local test only.
# Refuses production. Does not set CLOSE_AT. Intent only — no capture.
set -euo pipefail

if [[ "${VERCEL_ENV:-}" == "production" || "${NODE_ENV:-}" == "production" ]]; then
  echo "seed-open-panels: refused in production" >&2
  exit 1
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
curl -fsS -X POST "${BASE_URL}/api/test/seed-open-panels" \
  -H "content-type: application/json"
echo
