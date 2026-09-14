#!/usr/bin/env bash
# Drive every P1 feature map entry once. Used by /maintain-verification-skill live pass.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$ROOT"

PORT="${BMB_VERIFY_PORT:-3010}"
export BMB_VERIFY_PORT="$PORT"
export BMB_VERIFY_URL="${BMB_VERIFY_URL:-http://127.0.0.1:${PORT}}"
export BMB_VERIFY_RUN_ID="${BMB_VERIFY_RUN_ID:-$(date +%Y%m%dT%H%M%S)}"
export WAITLIST_MODE=memory
export INTENT_MODE=memory
export AUTH_MODE=test
export AUTH_SECRET="${AUTH_SECRET:-verify-brandmybeast-auth-secret-min-32!!}"
export AUTH_TEST_PASSWORD="${AUTH_TEST_PASSWORD:-test}"

SCRIPTS="$ROOT/.cursor/skills/verify-brandmybeast/scripts"

"$SCRIPTS/launch.sh" >/dev/null
"$SCRIPTS/doctor.sh"

"$SCRIPTS/prove-campaign-board.sh"
"$SCRIPTS/prove-panel-grid.sh"
"$SCRIPTS/prove-waitlist-signup.sh"
"$SCRIPTS/prove-identity-locks.sh"
"$SCRIPTS/prove-panel-intent.sh"

"$SCRIPTS/cleanup.sh"
echo "PROVE_ALL_OK run=$BMB_VERIFY_RUN_ID out=$ROOT/.cursor/skills/verify-brandmybeast/artifacts/$BMB_VERIFY_RUN_ID"
