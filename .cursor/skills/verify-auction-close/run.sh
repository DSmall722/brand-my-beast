#!/bin/sh
# Recheck AuctionClose with TLC 2.19 (tla2tools 1.7.4).
# Exit status is TLC's: the first broken invariant, or 0 when all hold.
set -eu

cd "$(dirname "$0")"

JAVA="${JAVA:-java}"
BASE_CFG="${1:-AuctionClose.cfg}"
EXPECTED_SHA="936a262061c914694dfd669a543be24573c45d5aa0ff20a8b96b23d01e050e88"
RELEASE_URL="https://github.com/tlaplus/tlaplus/releases/download/v1.7.4/tla2tools.jar"

sha256_file() {
  sha256sum "$1" | awk 'NR==1 { print $1 }'
}

if [ -n "${TLA2TOOLS:-}" ]; then
  JAR="$TLA2TOOLS"
  if [ ! -f "$JAR" ]; then
    echo "TLA2TOOLS is set but the file is missing: $JAR" >&2
    exit 1
  fi
  got="$(sha256_file "$JAR")"
  if [ "$got" != "$EXPECTED_SHA" ]; then
    echo "TLA2TOOLS sha256 is $got, expected $EXPECTED_SHA" >&2
    exit 1
  fi
else
  JAR="${TMPDIR:-/tmp}/tla2tools-1.7.4.jar"
  if [ ! -f "$JAR" ] || [ "$(sha256_file "$JAR")" != "$EXPECTED_SHA" ]; then
    tmp="$(mktemp)"
    if ! curl -fsSL --retry 3 --retry-delay 2 -o "$tmp" "$RELEASE_URL"; then
      echo "TLC download failed: $RELEASE_URL" >&2
      rm -f "$tmp"
      exit 1
    fi
    got="$(sha256_file "$tmp")"
    if [ "$got" != "$EXPECTED_SHA" ]; then
      echo "Downloaded jar sha256 is $got, expected $EXPECTED_SHA" >&2
      rm -f "$tmp"
      exit 1
    fi
    mv "$tmp" "$JAR"
  fi
fi

if [ ! -f "$BASE_CFG" ]; then
  echo "Config not found: $BASE_CFG" >&2
  exit 1
fi
if [ ! -f AuctionClose.tla ]; then
  echo "AuctionClose.tla is not in $(pwd)" >&2
  exit 1
fi

work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
cp AuctionClose.tla "$work/AuctionClose.tla"
cp "$BASE_CFG" "$work/current.cfg"

failed_file="$work/failed"
: >"$failed_file"
first_code=0
run=0

while [ "$run" -lt 12 ]; do
  run=$((run + 1))
  out="$work/tlc-$run.out"
  set +e
  "$JAVA" -XX:+UseParallelGC -cp "$JAR" tlc2.TLC \
    -workers 1 -fp 0 -lncheck final \
    -config "$work/current.cfg" "$work/AuctionClose.tla" >"$out" 2>&1
  code=$?
  set -e
  cat "$out"
  inv="$(sed -n 's/^Error: Invariant \([A-Za-z0-9_]*\) is violated.*/\1/p' "$out" | head -n 1)"
  if [ -n "$inv" ]; then
    if [ "$first_code" -eq 0 ]; then
      first_code=$code
    fi
    printf '%s\n' "$inv" >>"$failed_file"
    grep -v "^INVARIANT ${inv}$" "$work/current.cfg" >"$work/next.cfg"
    mv "$work/next.cfg" "$work/current.cfg"
    continue
  fi
  if [ "$code" -ne 0 ]; then
    exit "$code"
  fi
  distinct="$(sed -n 's/^[0-9]* states generated, \([0-9]*\) distinct states found.*/\1/p' "$out" | tail -n 1)"
  if [ -z "$distinct" ]; then
    distinct="$(sed -n 's/The number of distinct states found: \([0-9]*\).*/\1/p' "$out" | tail -n 1)"
  fi
  printf '\n'
  printf 'verify-auction-close: distinct states %s\n' "${distinct:-unknown}"
  if [ -s "$failed_file" ]; then
    echo "verify-auction-close: invariants failed:"
    sed 's/^/  /' "$failed_file"
    echo "verify-auction-close: every invariant still in the config held."
    exit "$first_code"
  fi
  echo "verify-auction-close: every invariant in $BASE_CFG held."
  exit 0
done

echo "verify-auction-close: stopped after $run TLC runs" >&2
exit 1
