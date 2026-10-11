#!/usr/bin/env bash
#
# batch14y-harness-mutations.sh — prove the two NEG predicates in the harness are
# INDEPENDENTLY load-bearing.
#
#   MU-KEY     remove the advisory-key filter from owns_key
#              -> NEG3 (same worker, different key) must fail
#   MU-WORKER  remove the worker filter from owns_key
#              -> NEG4 (same key, different worker) must fail
#
# SAFETY — THE TRACKED HARNESS IS NEVER MODIFIED.
#   Every mutation is applied to a DISPOSABLE COPY under a private temp directory,
#   and the copy is run with the ORIGINAL migration path passed explicitly. Each
#   mutation starts from the exact original bytes read fresh from the tracked file.
#   The tracked harness is only ever read, and its sha256 is verified before and
#   after the whole run. There is no restore step, because nothing is ever
#   written to it.
#
# CLEANUP
#   Runs on normal exit and on the catchable signals INT/TERM/HUP, preserving the
#   failure status (128+signum for a signal), removing the temp workspace and the
#   discovery pointer, and terminating any child harness run.
#   NOT guaranteed on SIGKILL, a crash, or the machine disappearing — nothing can
#   be. That does not endanger the tracked harness, which is never written to.
#
# Usage: bash scripts/batch14y-harness-mutations.sh
#
set -u
set -m   # job control: every background job gets its OWN process group, so the
         # parent owns a signalable group for the run it launched.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="$ROOT/scripts/batch14u-rpc-harness.sh"
SQL="$ROOT/supabase/migrations/20261012_apply_lifecycle_update.sql"
PTR="/var/tmp/b14z-mutations.current"
RUN_TIMEOUT="${RUN_TIMEOUT:-600}"
CHILD_DEADLINE="${CHILD_DEADLINE:-10}"
CHILD=""

[ -f "$HARNESS" ] || { echo "harness not found: $HARNESS" >&2; exit 2; }
[ -f "$SQL" ] || { echo "migration not found: $SQL" >&2; exit 2; }

BASE="$(mktemp -d /var/tmp/b14z-mut-XXXXXX)"

# Is the owned child still running? Reads /proc so a reaped-but-unwaited zombie
# is not mistaken for a live process.
child_alive() { # child_alive [pid]
  local p="${1:-${CHILD:-}}"
  [ -n "$p" ] || return 1
  [ -d "/proc/$p" ] || return 1
  local st; st=$(awk '{print $3}' "/proc/$p/stat" 2>/dev/null)
  [ -n "$st" ] && [ "$st" != "Z" ]
}

cleanup() { # cleanup <exit-status>
  local rc="$1"
  trap - EXIT INT TERM HUP

  # 1. Terminate the run THIS invocation owns, and VERIFY it is gone before
  #    removing anything it might still be writing to. Bounded, then escalated.
  if child_alive; then
    echo "  cleanup: terminating the owned run (pid $CHILD, process group -$CHILD)"
    kill -TERM -"$CHILD" 2>/dev/null || kill -TERM "$CHILD" 2>/dev/null
    local n=0
    while child_alive && [ "$n" -lt $((CHILD_DEADLINE * 10)) ]; do sleep 0.1; n=$((n + 1)); done
    if child_alive; then
      echo "  cleanup: pid $CHILD ignored SIGTERM for ${CHILD_DEADLINE}s — escalating to SIGKILL"
      kill -KILL -"$CHILD" 2>/dev/null || kill -KILL "$CHILD" 2>/dev/null
      n=0
      while child_alive && [ "$n" -lt 50 ]; do sleep 0.1; n=$((n + 1)); done
      child_alive && echo "  cleanup: pid $CHILD STILL ALIVE after SIGKILL"
    fi
    wait "$CHILD" 2>/dev/null
    CHILD=""
    echo "  cleanup: owned run terminated"
  fi

  # 2. Remove ONLY this run's workspace and pointer.
  if [ -n "${PTR:-}" ] && [ -f "$PTR" ] && [ "$(cat "$PTR" 2>/dev/null)" = "${BASE:-}" ]; then
    find "$PTR" -maxdepth 0 -delete 2>/dev/null
  fi
  if [ -n "${BASE:-}" ] && [ -d "$BASE" ]; then
    find "$BASE" -mindepth 1 -depth -delete 2>/dev/null
    rmdir "$BASE" 2>/dev/null
  fi
  exit "$rc"
}
trap 'cleanup $?' EXIT
trap 'cleanup $((128 + 2))' INT
trap 'cleanup $((128 + 15))' TERM
trap 'cleanup $((128 + 1))' HUP

# Discovery pointer + phase marker, so an interruption test can tell when a
# mutated run is actually in flight.
echo "$BASE" >"$PTR"
echo "start" >"$BASE/phase"

ORIG=$(sha256sum "$HARNESS" | awk '{print $1}')
echo "tracked harness:            $HARNESS"
echo "tracked harness sha256 BEFORE: $ORIG"
echo "migration passed explicitly:   $SQL"
echo "disposable workspace:          $BASE"

DETECTED=0; MISSED=0; TOUCHED=0

RUN_RC=0
RUN_LOG=""
run_harness() { # run_harness <harness-copy> [sql-path] -> sets RUN_RC, RUN_LOG
  # Run DIRECTLY in the parent shell. It must never be called inside $(...): a
  # command substitution runs in a subshell, so the child PID would be set in
  # that subshell and the parent would own nothing to signal or reap. Callers
  # read $RUN_RC and $RUN_LOG instead of capturing stdout.
  #
  # No `timeout` wrapper: the parent owns the harness process itself, in its own
  # process group (see `set -m`), so `kill -TERM -$CHILD` reaches the harness and
  # everything it spawned — and `wait` returns the harness's own status rather
  # than a wrapper's.
  local h="$1" sql="${2:-$SQL}"
  RUN_LOG="$BASE/run.$(basename "$h" .sh).out"
  bash "$h" "$sql" >"$RUN_LOG" 2>&1 &
  CHILD=$!
  echo "$CHILD" >"$BASE/child.pid"

  # Bounded wait for the owned run.
  local n=0
  while child_alive && [ "$n" -lt $((RUN_TIMEOUT * 10)) ]; do sleep 0.1; n=$((n + 1)); done
  if child_alive; then
    echo "  run exceeded ${RUN_TIMEOUT}s — terminating the owned run (pid $CHILD)"
    kill -TERM -"$CHILD" 2>/dev/null || kill -TERM "$CHILD" 2>/dev/null
    local m=0
    while child_alive && [ "$m" -lt $((CHILD_DEADLINE * 10)) ]; do sleep 0.1; m=$((m + 1)); done
    child_alive && { kill -KILL -"$CHILD" 2>/dev/null || kill -KILL "$CHILD" 2>/dev/null; }
    wait "$CHILD" 2>/dev/null
    RUN_RC=124
  else
    wait "$CHILD"; RUN_RC=$?
  fi

  CHILD=""
  [ -f "$BASE/child.pid" ] && find "$BASE/child.pid" -maxdepth 0 -delete 2>/dev/null
  return "$RUN_RC"
}
check_tracked() { # assert the tracked harness is still the original bytes
  local now; now=$(sha256sum "$HARNESS" | awk '{print $1}')
  if [ "$now" = "$ORIG" ]; then return 0; fi
  echo "  TRACKED HARNESS CHANGED: $now != $ORIG"
  TOUCHED=1
  return 1
}

echo
echo "=== the explicit migration path is load-bearing ==="
# A copy's own ROOT resolves to the temp parent, where no migration exists. This
# copy is invoked with NO argument so the harness's own default applies: it must
# refuse. (Passing an empty string would NOT test this — "${1:-default}" treats
# an empty argument as unset and would silently substitute the real path.)
cp "$HARNESS" "$BASE/harness.nopath.sh"
nopath_log="$BASE/run.nopath.out"
timeout 60 bash "$BASE/harness.nopath.sh" >"$nopath_log" 2>&1
nopath_rc=$?
if [ "$nopath_rc" -ne 0 ] && grep -q 'migration not found' "$nopath_log"; then
  echo "  OK: a copy with no explicit path REFUSES (exit=$nopath_rc)"
else
  echo "  UNEXPECTED: a copy with no explicit path did not refuse (exit=$nopath_rc)"
  head -2 "$nopath_log"
  MISSED=$((MISSED + 1))
fi
check_tracked || true

echo
echo "=== control: a PRISTINE COPY, unmutated, with the explicit path ==="
echo "control" >"$BASE/phase"
cp "$HARNESS" "$BASE/harness.control.sh"
CTRL_SHA=$(sha256sum "$BASE/harness.control.sh" | awk '{print $1}')
[ "$CTRL_SHA" = "$ORIG" ] && echo "  copy is the exact original bytes" || { echo "  ERROR: copy differs from the original"; MISSED=$((MISSED + 1)); }
run_harness "$BASE/harness.control.sh"; rc=$RUN_RC
echo "control: exit=$rc | $(grep -o 'assertions passed: [0-9]*' "$RUN_LOG" | tail -1) | $(grep -o 'assertions failed: [0-9]*' "$RUN_LOG" | tail -1)"
if [ "$rc" -ne 0 ]; then
  echo "control run FAILED — aborting before mutating anything"
  grep 'FAIL:' "$RUN_LOG" | head -5
  exit 2
fi
check_tracked || true
echo "control clean OK"

mutate_copy() { # mutate_copy <copy-path> <key|worker>
  python3 - "$1" "$2" <<'PY'
import sys, pathlib
path, mode = sys.argv[1], sys.argv[2]
p = pathlib.Path(path); s = p.read_text()
GRANT = "and l.granted"
KEYP  = "\n        and l.classid = (($1)::bigint >> 32) and l.objid = (($1)::bigint & 4294967295)"
WORKP = "\n        and a.application_name = '$2'"
# GRANT + KEYP is unique to owns_key(); waits_key() says "and not l.granted".
if mode == "key":
    old, new = GRANT + KEYP, GRANT
else:
    old, new = GRANT + KEYP + WORKP, GRANT + KEYP
n = s.count(old)
assert n == 1, ("anchor not unique: %d occurrences" % n)
p.write_text(s.replace(old, new, 1))
PY
}

mutation() { # mutation <label> <key|worker> <expected-failing-assertion>
  local label="$1" mode="$2" want="$3"
  local copy="$BASE/harness.MU-$mode.sh"

  # ALWAYS from the exact original bytes.
  cp "$HARNESS" "$copy"
  local before; before=$(sha256sum "$copy" | awk '{print $1}')
  if [ "$before" != "$ORIG" ]; then
    echo "  ERROR: $label copy is not the original bytes"; MISSED=$((MISSED + 1)); return
  fi

  if ! mutate_copy "$copy" "$mode"; then
    echo "  ERROR: could not apply $label"; MISSED=$((MISSED + 1)); return
  fi
  local mh; mh=$(sha256sum "$copy" | awk '{print $1}')
  if [ "$mh" = "$ORIG" ]; then
    echo "  ERROR: $label did not change the copy"; MISSED=$((MISSED + 1)); return
  fi
  echo "  mutated COPY sha256: $mh"

  echo "mutated:$mode:running" >"$BASE/phase"
  local rc fl
  run_harness "$copy"; rc=$RUN_RC
  echo "done:$mode" >"$BASE/phase"
  fl=$(grep -o 'assertions failed: [0-9]*' "$RUN_LOG" | tail -1)
  echo "  run: exit=$rc | $fl"
  if [ "$rc" -ne 0 ] && grep -qF "FAIL: $want" "$RUN_LOG"; then
    echo "  DETECTED: '$want' failed as required"
    DETECTED=$((DETECTED + 1))
  else
    echo "  MISSED: expected '$want' to fail"
    grep 'FAIL:' "$RUN_LOG" | head -3
    MISSED=$((MISSED + 1))
  fi
  check_tracked && echo "  tracked harness untouched (hash matches)" || true
}

echo
echo "=== MU-KEY: remove the key filter -> NEG3 must fail ==="
mutation "MU-KEY" key "NEG3 the KNOWN HOLDER's name does not match a key it does not hold"

echo
echo "=== MU-WORKER: remove the worker filter -> NEG4 must fail ==="
mutation "MU-WORKER" worker "NEG4 the KNOWN KEY does not match a worker that does not hold it"

echo
echo "=== final state ==="
FINAL=$(sha256sum "$HARNESS" | awk '{print $1}')
echo "tracked harness sha256 AFTER:  $FINAL"
if [ "$FINAL" = "$ORIG" ]; then
  echo "tracked harness is byte-identical to the original (it was never written to)"
else
  echo "TRACKED HARNESS CHANGED"; TOUCHED=1
fi

echo
echo "mutations detected: $DETECTED"
echo "mutations missed:   $MISSED"
echo "tracked harness modified: $TOUCHED"
if [ "$MISSED" -ne 0 ] || [ "$TOUCHED" -ne 0 ]; then
  echo; echo "BATCH14Y_HARNESS_MUTATIONS_FAILED"; exit 1
fi
echo "BATCH14Y_HARNESS_MUTATIONS_PASSED"
