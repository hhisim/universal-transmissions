#!/usr/bin/env bash
#
# batch14ae-public-mutations.sh — disposable-copy mutations that RESTORE PUBLIC
# execution on each wrapper, to prove the boundary suite actually detects them.
#
#   MU-PUB-SYNC    grant execute on apply_lifecycle_update_sync        to public
#   MU-PUB-GLOBAL  grant execute on apply_lifecycle_update_sync_global to public
#
# Each mutation is applied to a DISPOSABLE COPY; the tracked wrapper is only ever
# read, and its sha256 is verified before and after the run.
#
# The delicate part: an exposed INVOKER wrapper still runs as its caller, and the
# BASE RPC is separately restricted to service_role — so an anonymous call still
# ends in 42501, raised DOWNSTREAM. "The call failed" therefore proves nothing
# about the wrapper. The detection here rests on (1) the WRAPPER's own ACL and
# (2) the DENIAL POINT moving from the wrapper to the base RPC.
#
# Usage: bash scripts/batch14ae-public-mutations.sh
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SUITE="$ROOT/scripts/batch14ae-boundary-suite.sh"
WRAPPER="$ROOT/supabase/migrations/20261014_lifecycle_sync_wrapper.sql"
BASE=$(mktemp -d /var/tmp/b14aemut-XXXXXX)

cleanup() {
  local rc=$?
  trap - EXIT INT TERM HUP
  if [ "${FAIL:-0}" -ne 0 ] || [ "$rc" -ne 0 ]; then
    DIAG=/var/tmp/b14aemut-diag-$(date +%s); mkdir -p "$DIAG"; chmod 755 "$DIAG"
    cp -a "$BASE"/*.log "$BASE"/*.sql "$DIAG"/ 2>/dev/null
    echo "  diagnostics preserved: $DIAG"
  fi
  find "$BASE" -mindepth 1 -depth -delete 2>/dev/null
  rmdir "$BASE" 2>/dev/null
  exit "$rc"
}
trap cleanup EXIT INT TERM HUP

PASS=0; FAIL=0
ok()  { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }
chkeq() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi; }

ORIG=$(sha256sum "$WRAPPER" | awk '{print $1}')
echo "tracked wrapper sha256 BEFORE: $ORIG"
echo

echo "=== control: the boundary suite against the TRACKED wrapper ==="
if bash "$SUITE" >"$BASE/control.log" 2>&1; then
  ok "control: the boundary suite PASSES on the tracked wrapper"
  grep -E '^assertions (passed|failed)' "$BASE/control.log" | sed 's/^/     /'
else
  bad "control: the boundary suite FAILED on the tracked wrapper"
  tail -20 "$BASE/control.log"
fi
echo

mutate() { # mutate <wrapper-fn-name> <out-file>
  python3 - "$WRAPPER" "$2" "$1" <<'PY'
import sys, pathlib
src, dst, fn = sys.argv[1], sys.argv[2], sys.argv[3]
s = pathlib.Path(src).read_text()
GRANT = "grant execute on function public.%s(jsonb) to public;\n" % fn
if s.count("\ncommit;\n") != 1:
    raise SystemExit("expected exactly one top-level commit")
if GRANT in s:
    raise SystemExit("the grant is already present")
s = s.replace("\ncommit;\n", "\n-- MUTATION: restore PUBLIC execution\n" + GRANT + "\ncommit;\n", 1)
pathlib.Path(dst).write_text(s)
PY
}

detect() { # detect <label> <wrapper-fn-name>
  local label="$1" fn="$2"
  local mut="$BASE/mut-$fn.sql"
  if ! mutate "$fn" "$mut"; then bad "$label: could not apply the mutation"; return; fi
  local mh; mh=$(sha256sum "$mut" | awk '{print $1}')
  if [ "$mh" = "$ORIG" ]; then bad "$label: the mutation did not change the file"; return; fi
  echo "  mutated COPY sha256: $mh"
  if [ "$(sha256sum "$WRAPPER" | awk '{print $1}')" != "$ORIG" ]; then
    bad "$label: the TRACKED wrapper changed during the mutation"; return
  fi
  echo "  -- running the boundary suite against the mutated copy --"
  if bash "$SUITE" "$mut" >"$BASE/$fn.log" 2>&1; then
    bad "$label: the boundary suite did NOT detect the restored PUBLIC execution"
    grep -E '^assertions (passed|failed)' "$BASE/$fn.log" | sed 's/^/     /'
    return
  fi
  ok "$label: the boundary suite REJECTED the mutated install"
  # It must reject for the RIGHT reason: the wrapper's own ACL.
  if grep -q "ACL: anon has EXECUTE on $fn = 0" "$BASE/$fn.log"; then
    ok "$label: the wrapper's OWN ACL assertion is among the failures"
  else
    bad "$label: the failure did not name the wrapper ACL assertion"
  fi
  # And it must identify the denial point as having moved downstream.
  if grep -q "DENIAL POINT: anon -> $fn denial names the WRAPPER" "$BASE/$fn.log"; then
    ok "$label: the suite's denial-point assertion is among the failures"
  else
    bad "$label: the suite did not flag the denial point"
  fi
  # The suite must have OBSERVED the denial landing at the base RPC — that is what
  # makes the point: an exposed INVOKER wrapper still yields 42501, from below.
  if grep -q "denial names the WRAPPER (landed at: base)" "$BASE/$fn.log"; then
    ok "$label: the suite observed the denial landing at the BASE RPC, not the wrapper"
  else
    bad "$label: the suite did not observe the denial moving to the base RPC"
  fi
  echo
}

echo "=== MU-PUB-SYNC: restore PUBLIC execution on the per-identity wrapper ==="
detect "MU-PUB-SYNC" apply_lifecycle_update_sync
echo "=== MU-PUB-GLOBAL: restore PUBLIC execution on the global wrapper ==="
detect "MU-PUB-GLOBAL" apply_lifecycle_update_sync_global

AFTER=$(sha256sum "$WRAPPER" | awk '{print $1}')
echo "tracked wrapper sha256 AFTER:  $AFTER"
chkeq "the tracked wrapper is BYTE-IDENTICAL (never written to)" "$ORIG" "$AFTER"

printf '\nassertions passed: %d\nassertions failed: %d\n' "$PASS" "$FAIL"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14AE_PUBLIC_MUTATIONS_FAILED"; exit 1; fi
echo "BATCH14AE_PUBLIC_MUTATIONS_PASSED"
