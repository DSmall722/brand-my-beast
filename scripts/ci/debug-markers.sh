#!/bin/sh
set -eu

base_ref="origin/${BASE:-main}"
head_rev=${HEAD:-HEAD}
needle=$(printf '\133DEBUG-')

if ! git rev-parse --verify --quiet "${base_ref}^{commit}" >/dev/null; then
  printf 'debug-markers: %s does not exist\n' "$base_ref" >&2
  exit 1
fi
if ! git rev-parse --verify --quiet "${head_rev}^{commit}" >/dev/null; then
  printf 'debug-markers: %s does not exist\n' "$head_rev" >&2
  exit 1
fi

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
git diff "${base_ref}...${head_rev}" >"$tmp"

bad=0
file='(unknown)'
while IFS= read -r line || [ -n "$line" ]; do
  case $line in
    '+++ '*)
      file=${line#'+++ '}
      continue
      ;;
  esac
  case $line in
    +*)
      case $line in
        *"$needle"*)
          printf 'debug-markers: added line contains the debug marker (%s)\n' \
            "$file" >&2
          bad=1
          ;;
      esac
      ;;
  esac
done <"$tmp"

exit "$bad"
