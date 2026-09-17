#!/usr/bin/env bash
# Drive Wave 0 (slices 0.1–0.4) plus the rest of the verify map.
# Slice 13.41 — also runs Playwright for 9.6–9.10 and 12.45–12.46.
# Used by /maintain-verification-skill live pass. CI red here = merge nothing else.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

PORT="${BMB_VERIFY_PORT:-3010}"
export BMB_VERIFY_PORT="$PORT"
export BMB_VERIFY_URL="http://127.0.0.1:${PORT}"
export BMB_VERIFY_RUN_ID="${BMB_VERIFY_RUN_ID:-$(date +%Y%m%dT%H%M%S)}"
export WAITLIST_MODE=memory
export INTENT_MODE=memory
export AUTH_MODE=test
export AUTH_SECRET="${AUTH_SECRET:-verify-brandmybeast-auth-secret-min-32!!}"
export AUTH_TEST_PASSWORD="${AUTH_TEST_PASSWORD:-test}"

SCRIPTS="$ROOT/.cursor/skills/verify-brandmybeast/scripts"

# Slice 13.41 — auction tail (9.6 9.7 9.8 9.9 9.10) + concurrent/reject (12.45 12.46).
PROVE_ALL_PLAYWRIGHT_SPECS=(
  # 9.6
  tests/slice-9-6-failed-winner-offer.spec.ts
  # 9.7
  tests/slice-9-7-withdraw-pending.spec.ts
  # 9.8
  tests/slice-9-8-edit-pending.spec.ts
  # 9.9
  tests/slice-9-9-public-seat-log.spec.ts
  # 9.10
  tests/slice-9-10-pledged-approved-only.spec.ts
  # 12.45
  tests/slice-12-45-concurrent-hood.spec.ts
  # 12.46
  tests/slice-12-46-reject-note.spec.ts
)

"$SCRIPTS/launch.sh" >/dev/null
"$SCRIPTS/doctor.sh"

# Wave 0 — must cover SLICES 0.1–0.4 before anything else merges.
"$SCRIPTS/prove-wave0.sh"
"$SCRIPTS/prove-campaign-board.sh"
"$SCRIPTS/prove-panel-grid.sh"
"$SCRIPTS/prove-waitlist-signup.sh"
"$SCRIPTS/prove-identity-locks.sh"
"$SCRIPTS/prove-panel-intent.sh"

# Slice 13.41 — reuse launch.sh server; do not spawn a second Next on PORT.
export PLAYWRIGHT_BASE_URL="$BMB_VERIFY_URL"
export PORT="$PORT"
(
  # reuseExistingServer is false when CI=1; this lever already owns the server.
  unset CI
  npx playwright test "${PROVE_ALL_PLAYWRIGHT_SPECS[@]}" --workers=1
)

"$SCRIPTS/cleanup.sh"
echo "PROVE_ALL_OK run=$BMB_VERIFY_RUN_ID out=$ROOT/.cursor/skills/verify-brandmybeast/artifacts/$BMB_VERIFY_RUN_ID"
