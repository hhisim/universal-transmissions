#!/usr/bin/env bash
#
# batch14z-interruption-test.sh — interrupt the mutation runner DURING a mutated
# run and ASSERT that the runner's cleanup terminates the run IT owned, before
# removing its workspace, with the tracked harness untouched.
#
# It asserts, rather than prints:
#   - a specific worker was RUNNING at the moment of interruption, and the copy
#     it is running is the mutated one;
#   - that worker TERMINATES within the cleanup deadline;
#   - the workspace and the discovery pointer are REMOVED;
#   - the tracked harness is BYTE-IDENTICAL.
# Plus a NEGATIVE CONTROL: a worker that ignores SIGTERM must be REJECTED by the
# same termination check, proving the check can actually fail.
#
# SCOPE: only SIGTERM against a runner-launched run is exercised. The runner
# traps INT and HUP too, but those combinations are NOT tested here and nothing
# is claimed about them.
#
# Usage: bash scripts/batch14z-interruption-test.sh
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="$ROOT/scripts/batch14u-rpc-harness.sh"
PTR="/var/tmp/b14z-mutations.current"
OUT="/var/tmp/b14z-interrupt-runner.log"
CHILD_DEADLINE="${CHILD_DEADLINE:-10}"
BUDGET=$((CHILD_DEADLINE + 10))

PASS=0; FAIL=0
chk() { if [ "$2" = "$3" ]; then PASS=$((PASS + 1)); else FAIL=$((FAIL + 1)); echo "  FAIL: $1 (expected '$2', got '$3')"; fi; }
chk_rc() { if [ "$2" = "0" ]; then PASS=$((PASS + 1)); else FAIL=$((FAIL + 1)); echo "  FAIL: $1"; fi; }

# /proc-based: a reaped-but-unwaited zombie is NOT "alive".
proc_alive() {
  local p="$1"
  [ -n "$p" ] || return 1
  [ -d "/proc/$p" ] || return 1
  local st; st=$(awk '{print $3}' "/proc/$p/stat" 2>/dev/null)
  [ -n "$st" ] && [ "$st" != "Z" ]
}
# Bounded: 0 if the process is gone within <secs>, 1 if it is still there.
wait_gone() { # wait_gone <pid> <secs>
  local p="$1" secs="$2" n=0
  while [ "$n" -lt $((secs * 10)) ]; do
    proc_alive "$p" || return 0
    sleep 0.1; n=$((n + 1))
  done
  proc_alive "$p" && return 1
  return 0
}

[ -f "$HARNESS" ] || { echo "harness not found: $HARNESS" >&2; exit 2; }
ORIG=$(sha256sum "$HARNESS" | awk '{print $1}')
echo "tracked harness:               $HARNESS"
echo "tracked harness sha256 BEFORE: $ORIG"
echo "cleanup deadline:              ${CHILD_DEADLINE}s (termination budget ${BUDGET}s)"
[ -f "$PTR" ] && find "$PTR" -maxdepth 0 -delete 2>/dev/null

bash "$ROOT/scripts/batch14y-harness-mutations.sh" >"$OUT" 2>&1 &
RPID=$!

n=0; until [ -f "$PTR" ] || [ $n -ge 900 ]; do sleep 0.1; n=$((n + 1)); done
if [ ! -f "$PTR" ]; then echo "FAIL: the runner never published its discovery pointer"; kill "$RPID" 2>/dev/null; exit 1; fi
BASE=$(cat "$PTR")
echo "runner workspace:              $BASE"

n=0; until grep -q '^mutated:' "$BASE/phase" 2>/dev/null || [ $n -ge 1800 ]; do sleep 0.1; n=$((n + 1)); done
PHASE=$(cat "$BASE/phase" 2>/dev/null)
echo "phase at interruption:         ${PHASE:-<none>}"
printf '%s' "$PHASE" | grep -q '^mutated:' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: never reached a mutated run"; }

# The SPECIFIC worker the runner owns.
CPID=$(cat "$BASE/child.pid" 2>/dev/null || echo "")
echo "owned worker pid:              ${CPID:-<none>}"
chk "the runner published the PID of the worker it owns" "published" "$([ -n "$CPID" ] && echo published || echo none)"
chk_rc "the owned worker is RUNNING at the moment of interruption" "$(proc_alive "$CPID"; echo $?)"

WCMD=$(tr '\0' ' ' <"/proc/$CPID/cmdline" 2>/dev/null || echo "")
echo "owned worker cmdline:          ${WCMD:0:100}"
printf '%s' "$WCMD" | grep -q 'harness\.MU-' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: the owned worker is not running a mutated copy"; }
MUTCOPY=$(printf '%s' "$WCMD" | tr ' ' '\n' | grep 'harness\.MU-' | head -1)
if [ -n "$MUTCOPY" ] && [ -f "$MUTCOPY" ]; then
  chk "the in-flight copy is MUTATED (differs from the tracked bytes)" "differs" \
    "$([ "$(sha256sum "$MUTCOPY" | awk '{print $1}')" != "$ORIG" ] && echo differs || echo same)"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: no in-flight mutated copy found"
fi

echo
echo "--- sending SIGTERM to the runner (pid $RPID); this is the only signal tested ---"
kill -TERM "$RPID"

wait_gone "$RPID" "$BUDGET" || { FAIL=$((FAIL + 1)); echo "  FAIL: the runner itself did not exit within ${BUDGET}s"; }
wait "$RPID" 2>/dev/null; RC=$?
echo "runner exit status:            $RC"
chk "the interrupted runner did NOT exit 0" "non-zero" "$([ "$RC" -ne 0 ] && echo non-zero || echo zero)"
chk "the exit status is 128+SIGTERM" "143" "$RC"

# The worker the runner OWNED must be GONE, within the cleanup deadline.
if wait_gone "$CPID" "$BUDGET"; then
  PASS=$((PASS + 1)); echo "  OK: the owned worker terminated within the cleanup budget"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: the owned worker (pid $CPID) is STILL RUNNING after ${BUDGET}s"
  kill -KILL "$CPID" 2>/dev/null
fi

# Cleanup: workspace and pointer removed.
if [ -d "$BASE" ]; then FAIL=$((FAIL + 1)); echo "  FAIL: the workspace was NOT removed: $BASE";
else PASS=$((PASS + 1)); echo "  OK: the workspace was removed"; fi
if [ -f "$PTR" ]; then FAIL=$((FAIL + 1)); echo "  FAIL: the discovery pointer was NOT removed";
else PASS=$((PASS + 1)); echo "  OK: the discovery pointer was removed"; fi

AFTER=$(sha256sum "$HARNESS" | awk '{print $1}')
echo "tracked harness sha256 AFTER:  $AFTER"
chk "the tracked harness is BYTE-IDENTICAL after interruption" "$ORIG" "$AFTER"

echo
echo "=== NEGATIVE CONTROL: a worker that IGNORES SIGTERM must be REJECTED ==="
# `trap "" TERM` then exec: SIG_IGN survives the exec, so SIGTERM is ignored.
bash -c 'trap "" TERM; exec sleep 30' >/dev/null 2>&1 &
NEGPID=$!
sleep 0.5
chk_rc "the negative-control worker is running" "$(proc_alive "$NEGPID"; echo $?)"
kill -TERM "$NEGPID" 2>/dev/null
if wait_gone "$NEGPID" 2; then
  FAIL=$((FAIL + 1)); echo "  FAIL: the termination check ACCEPTED a worker that ignores SIGTERM"
else
  PASS=$((PASS + 1)); echo "  OK: the termination check REJECTED the SIGTERM-ignoring worker (alive after 2s)"
fi
kill -KILL "$NEGPID" 2>/dev/null
if wait_gone "$NEGPID" 5; then
  PASS=$((PASS + 1)); echo "  OK: the same check reports a SIGKILLed worker as gone"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: the check did not report the SIGKILLed worker as gone"
fi

echo
echo "=== leftovers (informational) ==="
echo "  postgres cluster dirs in /var/tmp: $(find /var/tmp -maxdepth 1 -type d -name 'b14u-pg-*' 2>/dev/null | wc -l)  (separate follow-up)"
echo "  runner workspaces left:            $(find /var/tmp -maxdepth 1 -type d -name 'b14z-mut-*' 2>/dev/null | wc -l)"
echo "  harness processes running:         $(pgrep -cf 'batch14u-rpc-harness' 2>/dev/null || echo 0)"

echo
echo "assertions passed: $PASS"
echo "assertions failed: $FAIL"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14Z_INTERRUPTION_TEST_FAILED"; exit 1; fi
echo "BATCH14Z_INTERRUPTION_TEST_PASSED"
