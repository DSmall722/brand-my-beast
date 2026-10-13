#!/bin/sh
# Fail unless every commit in origin/$BASE..$HEAD has an allowlisted email.
# ALLOWED_COMMIT_EMAILS is comma-separated. Comparison is case-insensitive.
# A committer may be noreply@github.com (GitHub web flow). An author may not,
# unless that address is itself allowlisted.
# Any author or committer address containing grok@ fails, even if allowlisted.
set -eu

lower() {
  printf '%s' "$1" | tr '[:upper:]' '[:lower:]'
}

trim() {
  printf '%s' "$1" | sed 's/^[[:space:]]*//;s/[[:space:]]*$//'
}

allow_norm=''
raw=$(lower "${ALLOWED_COMMIT_EMAILS:-}")
old_ifs=$IFS
IFS=','
set -f
# shellcheck disable=SC2086
set -- $raw
set +f
IFS=$old_ifs
for item in "$@"; do
  item=$(trim "$item")
  if [ -n "$item" ]; then
    allow_norm="${allow_norm}${item}
"
  fi
done

if [ -z "$allow_norm" ]; then
  printf '%s\n' 'commit-identity: ALLOWED_COMMIT_EMAILS is empty' >&2
  exit 1
fi

in_allowlist() {
  needle=$(lower "$1")
  if printf '%s' "$allow_norm" | grep -F -x -q -- "$needle"; then
    return 0
  fi
  return 1
}

has_grok() {
  email_lc=$(lower "$1")
  case $email_lc in
    *grok@*) return 0 ;;
    *) return 1 ;;
  esac
}

is_noreply() {
  [ "$(lower "$1")" = 'noreply@github.com' ]
}

check_role() {
  role=$1
  email=$2
  rev=$3
  if has_grok "$email"; then
    printf 'commit-identity: %s email contains grok@ (%s, commit %s)\n' \
      "$role" "$email" "$rev" >&2
    return 1
  fi
  if in_allowlist "$email"; then
    return 0
  fi
  if [ "$role" = committer ] && is_noreply "$email"; then
    return 0
  fi
  printf 'commit-identity: %s email is not allowlisted (%s, commit %s)\n' \
    "$role" "$email" "$rev" >&2
  return 1
}

base_ref="origin/${BASE:-main}"
head_rev=${HEAD:-HEAD}

if ! git rev-parse --verify --quiet "${base_ref}^{commit}" >/dev/null; then
  printf 'commit-identity: %s does not exist\n' "$base_ref" >&2
  exit 1
fi
if ! git rev-parse --verify --quiet "${head_rev}^{commit}" >/dev/null; then
  printf 'commit-identity: %s does not exist\n' "$head_rev" >&2
  exit 1
fi

bad=0
revs=$(git rev-list "${base_ref}..${head_rev}")
for rev in $revs; do
  author=$(git log -1 --format='%ae' "$rev")
  committer=$(git log -1 --format='%ce' "$rev")
  if ! check_role author "$author" "$rev"; then
    bad=1
  fi
  if ! check_role committer "$committer" "$rev"; then
    bad=1
  fi
done

exit "$bad"
