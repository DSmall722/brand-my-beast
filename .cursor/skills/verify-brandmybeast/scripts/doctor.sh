#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

PORT="${BMB_VERIFY_PORT:-3010}"
URL="http://127.0.0.1:${PORT}"

HTML="$(curl -sf "$URL")" || {
  echo "doctor fail: cannot GET $URL" >&2
  exit 1
}

echo "$HTML" | grep -q "BrandMyBeast" || {
  echo "doctor fail: missing BrandMyBeast" >&2
  exit 1
}
echo "$HTML" | grep -q '\$58,000' || {
  echo "doctor fail: missing \$58,000" >&2
  exit 1
}
echo "$HTML" | grep -q '\$120,000' || {
  echo "doctor fail: missing \$120,000" >&2
  exit 1
}

LOWER="$(echo "$HTML" | tr '[:upper:]' '[:lower:]')"
if echo "$LOWER" | grep -Eq '(^|[^a-z])lease([^a-z]|$)'; then
  echo "doctor fail: lease language present" >&2
  exit 1
fi
if echo "$LOWER" | grep -q 'gmail.com'; then
  echo "doctor fail: gmail.com present" >&2
  exit 1
fi

echo "doctor ok $URL"
