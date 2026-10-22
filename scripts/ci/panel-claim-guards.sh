#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname "$0")/../.." && pwd)
campaign="$root/CAMPAIGN.md"
source="$root/src/lib/campaign.ts"
copy="$root/src/lib/panel-claim.ts"

if ! grep -q '| n | Panel | Opening | Claim |' "$campaign"; then
  printf 'panel-claim-guards: CAMPAIGN.md inventory is missing a Claim column\n' >&2
  exit 1
fi

sum=$(awk '
  BEGIN { FS="|" }
  /^\| [0-9]+ \|/ {
    gsub(/[$, ]/, "", $5)
    if ($5 ~ /^[0-9]+$/) sum += $5
  }
  END { print sum + 0 }
' "$campaign")
if [ "$sum" != "120000" ]; then
  printf 'panel-claim-guards: CAMPAIGN.md Claim column sums to %s, want 120000\n' "$sum" >&2
  exit 1
fi

fail=0
check_price() {
  name=$1
  price=$2
  if ! grep -q "| ${name} | .* | \$${price} |" "$campaign"; then
    printf 'panel-claim-guards: CAMPAIGN.md missing %s claim $%s\n' "$name" "$price" >&2
    fail=1
  fi
  if ! grep -q "name: \"${name}\"" "$source"; then
    printf 'panel-claim-guards: campaign.ts missing %s\n' "$name" >&2
    fail=1
  fi
}

check_price "Hood" "13,000"
check_price "Front Fascia" "10,000"
check_price "Front Bumper" "4,000"
check_price "Driver Side Doors" "22,000"
check_price "Driver Rear Sail" "6,000"
check_price "Driver Side Bed" "10,000"
check_price "Passenger Side Doors" "22,000"
check_price "Passenger Rear Sail" "6,000"
check_price "Passenger Side Bed" "10,000"
check_price "Tailgate" "13,000"
check_price "Rear Bumper" "4,000"

if grep -E $'\u2014|\u2013' "$copy" >/dev/null; then
  printf 'panel-claim-guards: em dash or en dash in panel-claim.ts copy\n' >&2
  fail=1
fi
if grep -Ei '(^|[^a-z])lease([^a-z]|$)' "$copy" >/dev/null; then
  printf 'panel-claim-guards: banned word lease in panel-claim.ts\n' >&2
  fail=1
fi
if grep -Ei '(^|[^a-z])financing([^a-z]|$)' "$copy" >/dev/null; then
  printf 'panel-claim-guards: banned word financing in panel-claim.ts\n' >&2
  fail=1
fi

if [ "$fail" -ne 0 ]; then
  exit 1
fi

printf 'panel-claim-guards: ok (Claim column $120,000; copy lint clean)\n'
