#!/usr/bin/env bash
set -euo pipefail

if [[ "${VERCEL_ENV:-}" == "production" || "${NODE_ENV:-}" == "production" ]]; then
  echo "seed-demo: refused in production" >&2
  exit 1
fi

BASE_URL="${BASE_URL:-http://127.0.0.1:3000}"
curl -fsS -X POST "${BASE_URL}/api/test/seed-demo" \
  -H "content-type: application/json"
echo
