#!/bin/sh

base=${BASE:-main}
head=${HEAD:-HEAD}

if ! printf '%s\n%s\n' "${PR_HEAD_BRANCH:-}" "${PR_TITLE:-}" | grep -E -i -q 'fix|bug'; then
  exit 0
fi

tmp=$(mktemp 2>/dev/null) || exit 0
trap 'rm -f "$tmp"' EXIT

if ! git diff --name-only "origin/${base}...${head}" >"$tmp" 2>/dev/null; then
  exit 0
fi

product=0
tested=0
while IFS= read -r f || [ -n "$f" ]; do
  [ -n "$f" ] || continue
  case ${f#src/} in
    "$f") ;;
    *) product=1 ;;
  esac
  [ "$f" = src ] && product=1
  case ${f#tests/} in
    "$f") ;;
    *) tested=1 ;;
  esac
  [ "$f" = tests ] && tested=1
  name=${f##*/}
  case $name in
    *.test.*|*.spec.*) tested=1 ;;
  esac
done <"$tmp"

if [ "$product" -eq 1 ] && [ "$tested" -eq 0 ]; then
  printf '%s\n' '::warning::fix or bug PR changes product files under src/ but does not change test files (tests/**, *.test.*, *.spec.*)'
fi
exit 0
