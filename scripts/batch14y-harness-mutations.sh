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
# The harness is restored from the exact bytes read at start after EVERY outcome,
# and the restore is verified by sha256. A missed mutation or a failed restore is
# a non-zero exit.
#
# Usage: bash scripts/batch14y-harness-mutations.sh
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HARNESS="$ROOT/scripts/batch14u-rpc-harness.sh"
BASE="/var/tmp/b14y-mut-$$"
mkdir -p "$BASE"

[ -f "$HARNESS" ] || { echo "harness not found: $HARNESS" >&2; exit 2; }
cp "$HARNESS" "$BASE/harness.orig"
ORIG=$(sha256sum "$HARNESS" | awk '{print $1}')
echo "harness sha256 (original): $ORIG"

DETECTED=0; MISSED=0; RESTORE_FAIL=0

run_harness() { timeout 600 bash "$HARNESS" 2>&1; }

echo
echo "=== control: no mutation ==="
out=$(run_harness); rc=$?
echo "control: exit=$rc | $(printf '%s' "$out" | grep -o 'assertions passed: [0-9]*' | tail -1) | $(printf '%s' "$out" | grep -o 'assertions failed: [0-9]*' | tail -1)"
if [ "$rc" -ne 0 ]; then
  echo "control run FAILED — aborting before mutating anything"
  printf '%s' "$out" | grep 'FAIL:' | head -5
  exit 2
fi
echo "control clean OK"

mutate() { # mutate <key|worker>
  python3 - "$HARNESS" "$1" <<'PY'
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

  if ! mutate "$mode"; then
    echo "  ERROR: could not apply $label"; MISSED=$((MISSED + 1)); return
  fi
  local mh; mh=$(sha256sum "$HARNESS" | awk '{print $1}')
  if [ "$mh" = "$ORIG" ]; then
    echo "  ERROR: $label did not change the harness"; MISSED=$((MISSED + 1))
  else
    echo "  mutated sha256: $mh"
    local out rc fl
    out=$(run_harness); rc=$?
    fl=$(printf '%s' "$out" | grep -o 'assertions failed: [0-9]*' | tail -1)
    echo "  run: exit=$rc | $fl"
    if [ "$rc" -ne 0 ] && printf '%s' "$out" | grep -qF "FAIL: $want"; then
      echo "  DETECTED: '$want' failed as required"
      DETECTED=$((DETECTED + 1))
    else
      echo "  MISSED: expected '$want' to fail"
      printf '%s' "$out" | grep 'FAIL:' | head -3
      MISSED=$((MISSED + 1))
    fi
  fi

  cp "$BASE/harness.orig" "$HARNESS"
  local rh; rh=$(sha256sum "$HARNESS" | awk '{print $1}')
  if [ "$rh" = "$ORIG" ]; then
    echo "  restore: hash verified ($rh)"
  else
    echo "  RESTORE FAILED: $rh != $ORIG"
    RESTORE_FAIL=$((RESTORE_FAIL + 1))
  fi
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
echo "harness sha256 (final): $FINAL"
[ "$FINAL" = "$ORIG" ] && echo "harness is byte-identical to the original" || { echo "HARNESS NOT RESTORED"; RESTORE_FAIL=$((RESTORE_FAIL + 1)); }

echo
echo "mutations detected: $DETECTED"
echo "mutations missed:   $MISSED"
echo "restores failed:    $RESTORE_FAIL"
if [ "$MISSED" -ne 0 ] || [ "$RESTORE_FAIL" -ne 0 ]; then
  echo; echo "BATCH14Y_HARNESS_MUTATIONS_FAILED"; exit 1
fi
echo "BATCH14Y_HARNESS_MUTATIONS_PASSED"
