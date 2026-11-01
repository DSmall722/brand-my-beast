#!/bin/sh
set -eu

base_ref="origin/${BASE:-main}"
head_rev=${HEAD:-HEAD}

exempt() {
  path=$1
  base=${path##*/}
  case $base in
    *lock*|*.lock|pnpm-lock.yaml|package-lock.json|uv.lock|poetry.lock|Cargo.lock) return 0 ;;
    *.gen.*|routeTree.gen.ts|*.generated.*|*.snap|*.min.*|*.md|*.json|*.svg) return 0 ;;
  esac
  case $path in
    fixtures/*|*/fixtures/*|__fixtures__/*|*/__fixtures__/*) return 0 ;;
    tests/data/*|*/tests/data/*) return 0 ;;
    migrations/*|*/migrations/*|drizzle/*|*/drizzle/*) return 0 ;;
  esac
  return 1
}

lines_at() {
  rev=$1
  path=$2
  if git cat-file -e "${rev}:${path}" 2>/dev/null; then
    git cat-file blob "${rev}:${path}" | wc -l | awk '{print $1}'
  else
    printf '0\n'
  fi
}

for rev in "$base_ref" "$head_rev"; do
  if ! git rev-parse --verify --quiet "${rev}^{commit}" >/dev/null; then
    printf 'file-size-ratchet: %s does not exist\n' "$rev" >&2
    printf 'ratchet: 0 file(s) grew past 400\n'
    exit 0
  fi
done

mb=$(git merge-base "$base_ref" "$head_rev" 2>/dev/null) || {
  printf 'file-size-ratchet: merge-base failed\n' >&2
  printf 'ratchet: 0 file(s) grew past 400\n'
  exit 0
}

tmp=$(mktemp)
trap 'rm -f "$tmp"' EXIT
git diff --name-status --find-renames --diff-filter=ACMR "${base_ref}...${head_rev}" \
  | awk -F '\t' '
      $1 ~ /^(R|C)/ { printf "%s\t%s\n", $2, $3; next }
      NF >= 2 { printf "%s\t%s\n", $2, $2 }
    ' >"$tmp"

grew=0
while IFS=$(printf '\t') read -r old new; do
  [ -n "${new:-}" ] || continue
  if exempt "$new"; then
    continue
  fi
  added=$(git diff --numstat --find-renames "${base_ref}...${head_rev}" -- "$new" | awk 'NR==1 { print $1; exit }')
  if [ "$added" = "-" ]; then
    continue
  fi
  base_lines=$(lines_at "$mb" "$old")
  head_lines=$(lines_at "$head_rev" "$new")
  if [ "$head_lines" -gt 400 ] && [ "$head_lines" -gt "$base_lines" ]; then
    printf '::warning file=%s::%s grew from %s to %s lines\n' "$new" "$new" "$base_lines" "$head_lines"
    grew=$((grew + 1))
  fi
done <"$tmp"

printf 'ratchet: %s file(s) grew past 400\n' "$grew"
exit 0
