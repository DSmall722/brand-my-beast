#!/bin/sh
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

write_lines() {
  dir=$1
  path=$2
  n=$3
  mkdir -p "$dir/$(dirname -- "$path")"
  awk -v n="$n" 'BEGIN { for (i = 1; i <= n; i++) print "line" }' >"$dir/$path"
}

commit_all() {
  dir=$1
  git -C "$dir" add -A
  GIT_AUTHOR_NAME=Author GIT_AUTHOR_EMAIL=dev@example.com \
  GIT_COMMITTER_NAME=Committer GIT_COMMITTER_EMAIL=dev@example.com \
    git -C "$dir" commit -q -m change
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
    cat "$out" >&2
    fail=$((fail + 1))
    return
  fi
  case $mode in
    warn)
      if ! grep -q '::warning file=' "$out"; then
        printf 'FAIL %s: missing ::warning file=\n' "$name" >&2
        cat "$out" >&2
        fail=$((fail + 1))
        return
      fi
      if ! grep -qx 'ratchet: 1 file(s) grew past 400' "$out"; then
        printf 'FAIL %s: missing grew summary\n' "$name" >&2
        cat "$out" >&2
        fail=$((fail + 1))
        return
      fi
      ;;
    nowarn)
      if grep -q '::warning' "$out"; then
        printf 'FAIL %s: unexpected ::warning::\n' "$name" >&2
        cat "$out" >&2
        fail=$((fail + 1))
        return
      fi
      if ! grep -qx 'ratchet: 0 file(s) grew past 400' "$out"; then
        printf 'FAIL %s: missing quiet summary\n' "$name" >&2
        cat "$out" >&2
        fail=$((fail + 1))
        return
      fi
      ;;
    *)
      printf 'FAIL %s: bad mode %s\n' "$name" "$mode" >&2
      fail=$((fail + 1))
      return
      ;;
  esac
  printf 'ok %s\n' "$name"
  pass=$((pass + 1))
}

run_ratchet() {
  dir=$1
  head=$2
  (
    cd "$dir"
    BASE=main
    HEAD=$head
    export BASE HEAD
    sh "$HERE/file-size-ratchet.sh"
  )
}

case_edit() {
  name=$1
  path=$2
  from=$3
  to=$4
  mode=$5
  new_repo
  repo=$_repo
  if [ "$from" -gt 0 ]; then
    write_lines "$repo" "$path" "$from"
    commit_all "$repo"
    git -C "$repo" update-ref refs/remotes/origin/main HEAD
  fi
  git -C "$repo" checkout -q -b feature
  write_lines "$repo" "$path" "$to"
  commit_all "$repo"
  expect "$name" 0 "$mode" run_ratchet "$repo" "$(git -C "$repo" rev-parse HEAD)"
}

case_edit 'new 401-line file warns' src/new-file.ts 0 401 warn
case_edit '500->501 warns' src/big.ts 500 501 warn
case_edit '500->450 silent' src/big.ts 500 450 nowarn
case_edit '399->400 silent' src/edge.ts 399 400 nowarn
case_edit '300->401 warns' src/cross.ts 300 401 warn
case_edit 'lockfile 900->950 silent' pnpm-lock.yaml 900 950 nowarn
case_edit 'migrations/x.sql 900->950 silent' migrations/x.sql 900 950 nowarn

new_repo
gone=$_repo
write_lines "$gone" src/gone.ts 500
commit_all "$gone"
git -C "$gone" update-ref refs/remotes/origin/main HEAD
git -C "$gone" checkout -q -b feature
git -C "$gone" rm -q -- src/gone.ts
commit_all "$gone"
expect 'deleted file silent' 0 nowarn run_ratchet "$gone" "$(git -C "$gone" rev-parse HEAD)"

printf 'passed %s failed %s\n' "$pass" "$fail"
[ "$fail" -eq 0 ]
[ "$pass" -eq 8 ]
