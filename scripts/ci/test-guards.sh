#!/bin/sh
# Self-check for the PR guards. Builds throwaway repos under mktemp.
set -eu

HERE=$(CDPATH= cd -- "$(dirname "$0")" && pwd)
pass=0
fail=0
tmps=''

cleanup() {
  for d in $tmps; do
    rm -rf "$d"
  done
}
trap cleanup EXIT INT TERM

new_repo() {
  _repo=$(mktemp -d)
  tmps="$tmps $_repo"
  git -C "$_repo" init -q -b main
  git -C "$_repo" config user.name Base
  git -C "$_repo" config user.email base@example.com
  git -C "$_repo" config commit.gpgsign false
  GIT_AUTHOR_NAME=Base GIT_AUTHOR_EMAIL=base@example.com \
  GIT_COMMITTER_NAME=Base GIT_COMMITTER_EMAIL=base@example.com \
    git -C "$_repo" commit -q --allow-empty -m base
  git -C "$_repo" update-ref refs/remotes/origin/main HEAD
}

commit_file() {
  dir=$1
  author=$2
  committer=$3
  msg=$4
  path=$5
  content=$6
  mkdir -p "$dir/$(dirname -- "$path")"
  printf '%s\n' "$content" >"$dir/$path"
  git -C "$dir" add -- "$path"
  GIT_AUTHOR_NAME=Author GIT_AUTHOR_EMAIL="$author" \
  GIT_COMMITTER_NAME=Committer GIT_COMMITTER_EMAIL="$committer" \
    git -C "$dir" commit -q -m "$msg"
}

# Octal 133 is the bracket. Keeps the marker bytes out of this file.
marker() {
  printf '\133DEBUG-'
}

expect() {
  name=$1
  want=$2
  mode=$3
  shift 3
  out=$(mktemp)
  tmps="$tmps $out"
  set +e
  "$@" >"$out" 2>&1
  rc=$?
  set -e
  if [ "$rc" -ne "$want" ]; then
    printf 'FAIL %s: exit %s want %s\n' "$name" "$rc" "$want" >&2
    if ! grep -F -q "$(marker)" "$out" 2>/dev/null; then
      cat "$out" >&2
    fi
    fail=$((fail + 1))
    return
  fi
  case $mode in
    warn)
      if ! grep -q '::warning::' "$out"; then
        printf 'FAIL %s: missing ::warning::\n' "$name" >&2
        fail=$((fail + 1))
        return
      fi
      ;;
    nowarn)
      if grep -q '::warning::' "$out"; then
        printf 'FAIL %s: unexpected ::warning::\n' "$name" >&2
        cat "$out" >&2
        fail=$((fail + 1))
        return
      fi
      ;;
    empty)
      if ! grep -q 'ALLOWED_COMMIT_EMAILS is empty' "$out"; then
        printf 'FAIL %s: missing empty-allowlist message\n' "$name" >&2
        cat "$out" >&2
        fail=$((fail + 1))
        return
      fi
      ;;
    any) ;;
    *)
      printf 'FAIL %s: bad mode %s\n' "$name" "$mode" >&2
      fail=$((fail + 1))
      return
      ;;
  esac
  printf 'ok %s\n' "$name"
  pass=$((pass + 1))
}

run_identity() {
  dir=$1
  allow=$2
  head=$3
  (
    cd "$dir"
    BASE=main
    HEAD=$head
    ALLOWED_COMMIT_EMAILS=$allow
    export BASE HEAD ALLOWED_COMMIT_EMAILS
    sh "$HERE/commit-identity.sh"
  )
}

run_debug() {
  dir=$1
  head=$2
  (
    cd "$dir"
    BASE=main
    HEAD=$head
    export BASE HEAD
    sh "$HERE/debug-markers.sh"
  )
}

run_missing() {
  dir=$1
  branch=$2
  title=$3
  head=$4
  (
    cd "$dir"
    BASE=main
    HEAD=$head
    PR_HEAD_BRANCH=$branch
    PR_TITLE=$title
    export BASE HEAD PR_HEAD_BRANCH PR_TITLE
    sh "$HERE/missing-tests.sh"
  )
}

expect 'empty allowlist' 1 empty \
  sh -c 'cd /tmp && ALLOWED_COMMIT_EMAILS= BASE=main HEAD=HEAD sh "$1"' \
  sh "$HERE/commit-identity.sh"

expect 'blank allowlist' 1 empty \
  sh -c 'cd /tmp && ALLOWED_COMMIT_EMAILS=" , " BASE=main HEAD=HEAD sh "$1"' \
  sh "$HERE/commit-identity.sh"

new_repo
id_repo=$_repo
commit_file "$id_repo" 'dev@example.com' 'dev@example.com' 'good' src/app.ts 'ok'
good_sha=$(git -C "$id_repo" rev-parse HEAD)
expect 'allowlisted author and committer' 0 any \
  run_identity "$id_repo" ' Dev@Example.com , other@example.com ' "$good_sha"

new_repo
bad_author=$_repo
commit_file "$bad_author" 'stranger@example.com' 'dev@example.com' 'bad author' src/app.ts 'ok'
expect 'author not allowlisted' 1 any \
  run_identity "$bad_author" 'dev@example.com' "$(git -C "$bad_author" rev-parse HEAD)"

new_repo
bad_committer=$_repo
commit_file "$bad_committer" 'dev@example.com' 'stranger@example.com' 'bad committer' src/app.ts 'ok'
expect 'committer not allowlisted' 1 any \
  run_identity "$bad_committer" 'dev@example.com' "$(git -C "$bad_committer" rev-parse HEAD)"

new_repo
web=$_repo
commit_file "$web" 'dev@example.com' 'NoReply@GitHub.com' 'web flow' src/app.ts 'ok'
expect 'committer noreply is allowed' 0 any \
  run_identity "$web" 'dev@example.com' "$(git -C "$web" rev-parse HEAD)"

new_repo
noreply_author=$_repo
commit_file "$noreply_author" 'noreply@github.com' 'dev@example.com' 'author noreply' src/app.ts 'ok'
expect 'author noreply is not a free pass' 1 any \
  run_identity "$noreply_author" 'dev@example.com' "$(git -C "$noreply_author" rev-parse HEAD)"

new_repo
grok_author=$_repo
commit_file "$grok_author" 'Grok@Example.com' 'dev@example.com' 'grok author' src/app.ts 'ok'
expect 'grok author fails even if allowlisted' 1 any \
  run_identity "$grok_author" 'grok@example.com,dev@example.com' "$(git -C "$grok_author" rev-parse HEAD)"

new_repo
grok_committer=$_repo
commit_file "$grok_committer" 'dev@example.com' 'bot.grok@example.com' 'grok committer' src/app.ts 'ok'
expect 'grok committer fails even if allowlisted' 1 any \
  run_identity "$grok_committer" 'dev@example.com,bot.grok@example.com' "$(git -C "$grok_committer" rev-parse HEAD)"

new_repo
grok_dot=$_repo
commit_file "$grok_dot" 'grok.bot@example.com' 'grok.bot@example.com' 'not the banned substring' src/app.ts 'ok'
expect 'grok dot is not grok@' 0 any \
  run_identity "$grok_dot" 'grok.bot@example.com' "$(git -C "$grok_dot" rev-parse HEAD)"

new_repo
env_head=$_repo
commit_file "$env_head" 'dev@example.com' 'dev@example.com' 'good tip' src/app.ts 'ok'
env_sha=$(git -C "$env_head" rev-parse HEAD)
commit_file "$env_head" 'stranger@example.com' 'stranger@example.com' 'later bad tip' src/later.ts 'no'
expect 'uses HEAD sha not checked-out tip' 0 any \
  run_identity "$env_head" 'dev@example.com' "$env_sha"

new_repo
diverge=$_repo
git -C "$diverge" checkout -q -b feature
commit_file "$diverge" 'dev@example.com' 'dev@example.com' 'feature' src/app.ts 'ok'
feature_sha=$(git -C "$diverge" rev-parse HEAD)
git -C "$diverge" checkout -q main
commit_file "$diverge" 'stranger@example.com' 'stranger@example.com' 'main only' src/main-only.ts 'no'
git -C "$diverge" update-ref refs/remotes/origin/main HEAD
expect 'two-dot range ignores the other side' 0 any \
  run_identity "$diverge" 'dev@example.com' "$feature_sha"

new_repo
clean=$_repo
git -C "$clean" checkout -q -b feature
commit_file "$clean" 'dev@example.com' 'dev@example.com' 'clean' src/app.ts 'hello'
expect 'clean diff passes' 0 any \
  run_debug "$clean" "$(git -C "$clean" rev-parse HEAD)"

new_repo
marked=$_repo
git -C "$marked" checkout -q -b feature
commit_file "$marked" 'dev@example.com' 'dev@example.com' 'marked' src/app.ts "code $(marker) here"
expect 'added marker fails' 1 any \
  run_debug "$marked" "$(git -C "$marked" rev-parse HEAD)"

new_repo
removed=$_repo
commit_file "$removed" 'dev@example.com' 'dev@example.com' 'has marker' keep.txt "$(marker)"
git -C "$removed" update-ref refs/remotes/origin/main HEAD
git -C "$removed" checkout -q -b feature
commit_file "$removed" 'dev@example.com' 'dev@example.com' 'drop marker' keep.txt 'clean'
expect 'removed marker passes' 0 any \
  run_debug "$removed" "$(git -C "$removed" rev-parse HEAD)"

new_repo
context=$_repo
commit_file "$context" 'dev@example.com' 'dev@example.com' 'context base' keep.txt "$(printf '%s\n' alpha "$(marker)" omega)"
git -C "$context" update-ref refs/remotes/origin/main HEAD
git -C "$context" checkout -q -b feature
commit_file "$context" 'dev@example.com' 'dev@example.com' 'edit neighbor' keep.txt "$(printf '%s\n' alpha "$(marker)" omega2)"
expect 'context marker passes' 0 any \
  run_debug "$context" "$(git -C "$context" rev-parse HEAD)"

new_repo
header=$_repo
git -C "$header" checkout -q -b feature
header_path=$(printf 'src/%sfile.ts' "$(marker)")
commit_file "$header" 'dev@example.com' 'dev@example.com' 'odd name' "$header_path" 'clean'
expect 'header line is ignored' 0 any \
  run_debug "$header" "$(git -C "$header" rev-parse HEAD)"

new_repo
threedot=$_repo
commit_file "$threedot" 'dev@example.com' 'dev@example.com' 'base marker' keep.txt "$(marker)"
printf '%s\n' base >"$threedot/other.txt"
git -C "$threedot" add -- other.txt
GIT_AUTHOR_NAME=Author GIT_AUTHOR_EMAIL=dev@example.com \
GIT_COMMITTER_NAME=Committer GIT_COMMITTER_EMAIL=dev@example.com \
  git -C "$threedot" commit -q -m 'base other'
git -C "$threedot" checkout -q -b feature
commit_file "$threedot" 'dev@example.com' 'dev@example.com' 'feature edit' other.txt 'feature'
feature_only=$(git -C "$threedot" rev-parse HEAD)
git -C "$threedot" checkout -q main
commit_file "$threedot" 'dev@example.com' 'dev@example.com' 'main drops marker' keep.txt 'clean'
git -C "$threedot" update-ref refs/remotes/origin/main HEAD
expect 'three-dot diff ignores the other side' 0 any \
  run_debug "$threedot" "$feature_only"

new_repo
warn_repo=$_repo
git -C "$warn_repo" checkout -q -b fix-login
commit_file "$warn_repo" 'dev@example.com' 'dev@example.com' 'product' src/app/page.tsx 'export const page = 1'
warn_sha=$(git -C "$warn_repo" rev-parse HEAD)
expect 'fix branch without tests warns' 0 warn \
  run_missing "$warn_repo" 'fix-login' 'Add login' "$warn_sha"

expect 'bug in title warns' 0 warn \
  run_missing "$warn_repo" 'feature' 'Please fix the header' "$warn_sha"

expect 'debug branch matches bug' 0 warn \
  run_missing "$warn_repo" 'debug-panel' 'Add panel' "$warn_sha"

expect 'unrelated branch is quiet' 0 nowarn \
  run_missing "$warn_repo" 'feature' 'Add panel' "$warn_sha"

new_repo
with_tests=$_repo
git -C "$with_tests" checkout -q -b fix-login
commit_file "$with_tests" 'dev@example.com' 'dev@example.com' 'product' src/app/page.tsx 'export const page = 1'
commit_file "$with_tests" 'dev@example.com' 'dev@example.com' 'unit' tests/unit/page.test.ts 'test("ok", () => {})'
expect 'tests under tests/ suppress the warning' 0 nowarn \
  run_missing "$with_tests" 'fix-login' 'Fix page' "$(git -C "$with_tests" rev-parse HEAD)"

new_repo
spec_only=$_repo
git -C "$spec_only" checkout -q -b BUGFIX
commit_file "$spec_only" 'dev@example.com' 'dev@example.com' 'spec' src/components/Button.spec.tsx 'test("btn", () => {})'
expect 'spec file counts as a test' 0 nowarn \
  run_missing "$spec_only" 'BUGFIX' 'Bugfix button' "$(git -C "$spec_only" rev-parse HEAD)"

new_repo
docs_only=$_repo
git -C "$docs_only" checkout -q -b fix-docs
commit_file "$docs_only" 'dev@example.com' 'dev@example.com' 'docs' README.md 'hello'
expect 'non-product change is quiet' 0 nowarn \
  run_missing "$docs_only" 'fix-docs' 'Fix the readme' "$(git -C "$docs_only" rev-parse HEAD)"

printf 'passed %s failed %s\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
[ "$pass" -gt 0 ]
