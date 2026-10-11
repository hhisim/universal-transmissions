#!/usr/bin/env bash
#
# batch14z-interruption-test.sh — interrupt the mutation runner DURING a mutated
# run and prove the tracked harness is still byte-identical.
#
# The runner mutates DISPOSABLE COPIES, so an interruption cannot damage the
# tracked harness. This test does not take that on trust: it interrupts a run that
# is demonstrably executing a mutated copy, and re-hashes the tracked harness.
#
# It asserts:
#   - a mutated copy was actually in flight at the moment of interruption;
#   - the runner exited non-zero with 128+SIGTERM;
#   - the tracked harness sha256 is unchanged.
# and then reports what cleanup did and did not remove.
#
# Usage: bash scripts/batch14z-interruption-test.sh
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="$ROOT/scripts/batch14u-rpc-harness.sh"
PTR="/var/tmp/b14z-mutations.current"
OUT="/var/tmp/b14z-interrupt-runner.log"

PASS=0; FAIL=0
chk() { if [ "$2" = "$3" ]; then PASS=$((PASS + 1)); else FAIL=$((FAIL + 1)); echo "  FAIL: $1 (expected '$2', got '$3')"; fi; }

[ -f "$HARNESS" ] || { echo "harness not found: $HARNESS" >&2; exit 2; }
ORIG=$(sha256sum "$HARNESS" | awk '{print $1}')
echo "tracked harness:               $HARNESS"
echo "tracked harness sha256 BEFORE: $ORIG"
[ -f "$PTR" ] && find "$PTR" -maxdepth 0 -delete 2>/dev/null

bash "$ROOT/scripts/batch14y-harness-mutations.sh" >"$OUT" 2>&1 &
RPID=$!

n=0; until [ -f "$PTR" ] || [ $n -ge 900 ]; do sleep 0.1; n=$((n + 1)); done
if [ ! -f "$PTR" ]; then
  echo "FAIL: the runner never published its discovery pointer"; kill "$RPID" 2>/dev/null; exit 1
fi
BASE=$(cat "$PTR")
echo "runner workspace:              $BASE"

# Wait until a MUTATED copy is actually executing.
n=0; until grep -q '^mutated:' "$BASE/phase" 2>/dev/null || [ $n -ge 1800 ]; do sleep 0.1; n=$((n + 1)); done
PHASE=$(cat "$BASE/phase" 2>/dev/null)
echo "phase at interruption:         ${PHASE:-<none>}"
printf '%s' "$PHASE" | grep -q '^mutated:' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: never reached a mutated run"; }

MUT=$(ls "$BASE"/harness.MU-*.sh 2>/dev/null | head -1)
if [ -n "$MUT" ]; then
  MH=$(sha256sum "$MUT" | awk '{print $1}')
  echo "in-flight copy:                $MUT"
  echo "in-flight copy sha256:         $MH"
  chk "the in-flight harness copy is MUTATED (differs from the tracked bytes)" "differs" "$([ "$MH" != "$ORIG" ] && echo differs || echo same)"
else
  FAIL=$((FAIL + 1)); echo "  FAIL: no mutated copy found on disk"
fi

echo
echo "--- sending SIGTERM to the runner (pid $RPID) ---"
kill -TERM "$RPID"
wait "$RPID"; RC=$?
echo "runner exit status:            $RC"
chk "the interrupted runner did NOT exit 0" "non-zero" "$([ "$RC" -ne 0 ] && echo non-zero || echo zero)"
chk "the exit status is 128+SIGTERM" "143" "$RC"

sleep 1
AFTER=$(sha256sum "$HARNESS" | awk '{print $1}')
echo "tracked harness sha256 AFTER:  $AFTER"
chk "the tracked harness is BYTE-IDENTICAL after interruption" "$ORIG" "$AFTER"

echo
echo "=== what cleanup did, and did not, remove ==="
[ -d "$BASE" ] && echo "  workspace STILL PRESENT: $BASE" || echo "  workspace removed"
[ -f "$PTR" ] && echo "  discovery pointer STILL PRESENT" || echo "  discovery pointer removed"
LEFT_CLUSTERS=$(find /var/tmp -maxdepth 1 -type d -name 'b14u-pg-*' 2>/dev/null | wc -l)
echo "  postgres cluster dirs left in /var/tmp: $LEFT_CLUSTERS"
LEFT_MUT=$(find /var/tmp -maxdepth 1 -type d -name 'b14z-mut-*' 2>/dev/null | wc -l)
echo "  runner workspaces left in /var/tmp:     $LEFT_MUT"
LEFT_PROC=$(pgrep -cf 'batch14u-rpc-harness' 2>/dev/null || echo 0)
echo "  harness processes still running:        $LEFT_PROC"
echo
echo "  Guaranteed on interruption: INT/TERM/HUP run the cleanup trap (workspace +"
echo "  pointer removed, child terminated) and the status is 128+signum."
echo "  NOT guaranteed: SIGKILL, a crash, or the host disappearing. The tracked"
echo "  harness is unaffected in every case, because it is never written to."

echo
echo "assertions passed: $PASS"
echo "assertions failed: $FAIL"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14Z_INTERRUPTION_TEST_FAILED"; exit 1; fi
echo "BATCH14Z_INTERRUPTION_TEST_PASSED"
