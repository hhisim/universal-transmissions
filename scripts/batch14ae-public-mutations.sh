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
VERIFIER="$ROOT/scripts/batch14ae-verify-pub-mutation.sh"
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
  local log="$BASE/$fn.log"
  if ! mutate "$fn" "$mut"; then bad "$label: could not apply the mutation"; return; fi
  local mh; mh=$(sha256sum "$mut" | awk '{print $1}')
  if [ "$mh" = "$ORIG" ]; then bad "$label: the mutation did not change the file"; return; fi
  echo "  mutated COPY sha256: $mh"
  if [ "$(sha256sum "$WRAPPER" | awk '{print $1}')" != "$ORIG" ]; then
    bad "$label: the TRACKED wrapper changed during the mutation"; return
  fi
  echo "  -- running the boundary suite against the mutated copy --"
  # Detection is DELEGATED to the verifier. "The suite failed" is not the finding:
  # the suite also fails when it cannot set up at all (exit 2), and an assertion's
  # text appears in an `ok` line exactly as it does in a `FAIL` line, so matching
  # the assertion NAME proves only that it ran.
  bash "$SUITE" "$mut" >"$log" 2>&1
  local rc=$?
  chkeq "$label: the suite exited with the ASSERTION-FAILURE status" "1" "$rc"
  if bash "$VERIFIER" "$fn" "$log" "$rc" >"$BASE/$fn.verify" 2>&1; then
    ok "$label: the verifier counts this as a DETECTED PUBLIC mutation"
  else
    bad "$label: the verifier REFUSED this log as a detected PUBLIC mutation"
  fi
  sed 's/^/     /' "$BASE/$fn.verify"
  echo
}

echo "=== MU-PUB-SYNC: restore PUBLIC execution on the per-identity wrapper ==="
detect "MU-PUB-SYNC" apply_lifecycle_update_sync
echo "=== MU-PUB-GLOBAL: restore PUBLIC execution on the global wrapper ==="
detect "MU-PUB-GLOBAL" apply_lifecycle_update_sync_global

echo "=== NEGATIVE CONTROL 1: boundary assertions pass, an UNRELATED assertion fails ==="
nc_fn="apply_lifecycle_update_sync"
nc_mut="$BASE/nc-revoke-service.sql"
if python3 - "$WRAPPER" "$nc_mut" "$nc_fn" <<'PY'
import sys, pathlib
src, dst, fn = sys.argv[1], sys.argv[2], sys.argv[3]
s = pathlib.Path(src).read_text()
REV = "revoke all on function public.%s(jsonb) from service_role;\n" % fn
if s.count("\ncommit;\n") != 1:
    raise SystemExit("expected exactly one top-level commit")
s = s.replace("\ncommit;\n",
              "\n-- NEGATIVE CONTROL: the AUTHORIZED role loses access instead\n" + REV + "\ncommit;\n", 1)
pathlib.Path(dst).write_text(s)
PY
then
  echo "  mutated COPY sha256: $(sha256sum "$nc_mut" | awk '{print $1}')"
  bash "$SUITE" "$nc_mut" >"$BASE/nc.log" 2>&1
  nc_rc=$?
  chkeq "NC1 the suite did fail (assertion-failure status)" "1" "$nc_rc"
  if grep -Eq "^  FAIL ACL: (anon|authenticated) has EXECUTE on $nc_fn = 0" "$BASE/nc.log"; then
    bad "NC1 an anon/authenticated ACL assertion failed, so this is NOT an unrelated failure"
  else
    ok "NC1 the anon/authenticated ACL assertions still PASSED — the failure is unrelated"
  fi
  if grep -Eq "^  FAIL ACL: service_role has EXECUTE on $nc_fn = 1 \(expected '1', got '0'\)" "$BASE/nc.log"; then
    ok "NC1 the failing assertion is the service_role ACL, unrelated to PUBLIC exposure"
  else
    bad "NC1 the expected unrelated failure was not present"
  fi
  if bash "$VERIFIER" "$nc_fn" "$BASE/nc.log" "$nc_rc" >"$BASE/nc.verify" 2>&1; then
    bad "NC1 the verifier WRONGLY counted an unrelated failure as a detected PUBLIC mutation"
  else
    ok "NC1 the verifier REFUSED to count it (correct)"
  fi
  sed 's/^/     /' "$BASE/nc.verify"
else
  bad "NC1 could not build the negative-control mutation"
fi

echo
echo "=== NEGATIVE CONTROL 2: assertion text present as an OK line (the original false positive) ==="
cat >"$BASE/nc-ok.log" <<'EOF'
  ok   ACL: anon has EXECUTE on apply_lifecycle_update_sync = 0
  ok   DENIAL POINT: anon -> apply_lifecycle_update_sync denial names the WRAPPER (landed at: wrapper)
BATCH14AE_BOUNDARY_SUITE_FAILED
EOF
if bash "$VERIFIER" apply_lifecycle_update_sync "$BASE/nc-ok.log" 1 >/dev/null 2>&1; then
  bad "NC2 the verifier accepted OK lines as a detection — the original bug is not fixed"
else
  ok "NC2 the verifier refuses OK lines: matching an assertion's text is not a detection"
fi

echo
echo "=== NEGATIVE CONTROL 3: an unrelated FAIL line only ==="
cat >"$BASE/nc-unrel.log" <<'EOF'
  FAIL STATE: anon -> apply_lifecycle_update_sync changed no membership state (expected 'initiate', got 'free')
BATCH14AE_BOUNDARY_SUITE_FAILED
EOF
if bash "$VERIFIER" apply_lifecycle_update_sync "$BASE/nc-unrel.log" 1 >/dev/null 2>&1; then
  bad "NC3 the verifier accepted an unrelated failure as a detection"
else
  ok "NC3 the verifier refuses an unrelated failure"
fi

echo
echo "=== NEGATIVE CONTROL 4: suite exit 2 (infrastructure, not an assertion failure) ==="
if bash "$VERIFIER" apply_lifecycle_update_sync "$BASE/nc-ok.log" 2 >/dev/null 2>&1; then
  bad "NC4 the verifier accepted a non-assertion-failure exit status"
else
  ok "NC4 the verifier refuses exit 2: an infrastructure failure is not a detection"
fi

AFTER=$(sha256sum "$WRAPPER" | awk '{print $1}')
echo "tracked wrapper sha256 AFTER:  $AFTER"
chkeq "the tracked wrapper is BYTE-IDENTICAL (never written to)" "$ORIG" "$AFTER"

printf '\nassertions passed: %d\nassertions failed: %d\n' "$PASS" "$FAIL"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14AE_PUBLIC_MUTATIONS_FAILED"; exit 1; fi
echo "BATCH14AE_PUBLIC_MUTATIONS_PASSED"
