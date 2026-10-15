#!/bin/sh
set -eu

base_ref="origin/${BASE:-main}"
head_rev=${HEAD:-HEAD}

for rev in "$base_ref" "$head_rev"; do
  if ! git rev-parse --verify --quiet "${rev}^{commit}" >/dev/null; then
    printf 'new-comments: %s does not exist\n' "$rev" >&2
    exit 0
  fi
done

allowed='eslint-disable|eslint-enable|@ts-expect-error|@ts-ignore|@ts-nocheck|@ts-check|noqa|shellcheck|prettier-ignore|stylelint-|biome-ignore|istanbul ignore|c8 ignore|@vitest-environment|@generated|DO NOT EDIT|SPDX-License-Identifier|[Cc]opyright|@type |@typedef |^/// *<reference'

git diff --unified=0 "${base_ref}...${head_rev}" | awk -v allowed="$allowed" '
  function lang(path) {
    if (path ~ /^\.cursor\// || path ~ /(^|\/)next-env\.d\.ts$/) return ""
    if (path ~ /\.(ts|tsx|js|jsx|mjs|cjs|css)$/) return "c"
    if (path ~ /\.(sh|py|yml|yaml)$/ || path ~ /(^|\/)Dockerfile$/) return "hash"
    return ""
  }
  /^\+\+\+ / { file = substr($0, 5); sub(/^b\//, "", file); kind = lang(file); next }
  /^@@ / { split($3, h, ","); line = substr(h[1], 2) + 0; next }
  /^\+/ {
    text = substr($0, 2)
    trimmed = text
    sub(/^[ \t]+/, "", trimmed)
    hit = 0
    if (kind == "c" && (trimmed ~ /^\/\// || trimmed ~ /^\/\*/ || trimmed ~ /^\{\/\*/)) hit = 1
    if (kind == "hash" && trimmed ~ /^#/ && !(line == 1 && trimmed ~ /^#!/)) hit = 1
    if (hit && trimmed !~ allowed) {
      printf "::warning file=%s,line=%d::Rule 11: new code comment. Put the explanation in the PR or commit message instead.\n", file, line
      count++
    }
    line++
  }
  END { printf "new-comments: %d added comment line(s)\n", count + 0 }
'
exit 0
