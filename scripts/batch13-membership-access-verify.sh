#!/bin/bash
# ============================================================================
# Batch 13 — isolated, DESTRUCTIVE verification. NEVER POINT THIS AT PRODUCTION.
#
# This script creates a throw-away database and deliberately performs destructive
# probes: it TRUNCATEs tables inside a rolled-back transaction and inserts
# synthetic rows. It never connects to Supabase and never touches production, but
# it has no guards against being aimed at a real database — do not run it with a
# production connection.
#
# For production use the READ-ONLY procedure instead:
#     psql "$PROD_URL" -f scripts/batch13-membership-access-verify-production.sql
#
# It builds a PostgreSQL database reproducing the DEPLOYED schema, ACLs and
# policies of public.profiles and public.ut_members, then runs the probe suite in
# three states: as deployed, after the migration, and after the reversal.
#
# Requires: a local PostgreSQL server and sudo access to the postgres user.
#
# Usage:  scripts/batch13-membership-access-verify.sh
# ============================================================================
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB=b13test
PSQL="sudo -u postgres psql"

echo "================================================================"
echo "  ISOLATED / DESTRUCTIVE SUITE — throw-away database only."
echo "  Production verification: scripts/batch13-membership-access-verify-production.sql"
echo "================================================================"
echo

echo "=== checking prerequisites ==="
command -v psql >/dev/null || { echo "psql not found"; exit 2; }
command -v sudo >/dev/null || { echo "sudo not found"; exit 2; }
if ! pg_isready -q 2>/dev/null; then
  echo "local PostgreSQL is not accepting connections; start it first (e.g. pg_ctlcluster 16 main start)"
  exit 2
fi

echo "=== building the isolated fixture (roles, database, schema, ACLs, policies) ==="
$PSQL -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture-roles.sql" || exit 3
$PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture.sql" || exit 3
$PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture-compat.sql" || exit 3
echo "    ok"

echo
echo "############ STATE A — as deployed (the defect) ############"
python3 "$HERE/batch13-membership-access-tests.py"; A=$?

echo
echo "############ STATE B — after the migration ############"
$PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/../supabase/migrations/20261010_membership_access_hardening.sql" || exit 4
python3 "$HERE/batch13-membership-access-tests.py"; B=$?

echo
echo "############ STATE B2 — read-only verification file, post-migration ############"
echo "    (same file used in production; here it validates against the fixture)"
$PSQL -d $DB -f "$HERE/batch13-membership-access-verify-production.sql" | grep -E "^(\(|\(\d|\(0 rows\)| |===)" | head -60

echo
echo "############ STATE C — after the reversal (mutation check) ############"
$PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-reversal.sql" || exit 5
python3 "$HERE/batch13-membership-access-tests.py"; C=$?

echo
echo "############ FOREIGN-KEY COMPATIBILITY ############"
$PSQL -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture-roles.sql" >/dev/null 2>&1
$PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture.sql" >/dev/null 2>&1
$PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture-compat.sql" >/dev/null 2>&1
echo "--- before the migration ---"
python3 "$HERE/batch13-membership-access-compat-test.py"; F1=$?
$PSQL -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/../supabase/migrations/20261010_membership_access_hardening.sql" >/dev/null 2>&1
echo "--- after the migration ---"
python3 "$HERE/batch13-membership-access-compat-test.py"; F2=$?

echo
echo "================ SUMMARY ================"
echo "  A  as deployed      : exit $A  (expected NON-zero: the defect is present)"
echo "  B  after migration  : exit $B  (expected zero)"
echo "  C  after reversal   : exit $C  (expected NON-zero: mutation detected)"
echo "  FK compat before    : exit $F1 (expected zero)"
echo "  FK compat after     : exit $F2 (expected zero)"
echo
echo "  NOTE: this fixture runs whatever PostgreSQL is installed locally. It was"
echo "  executed on 16.15, which has no MAINTAIN privilege, so MAINTAIN was NOT"
echo "  tested here. Production is 17.6 and the read-only production file covers it."
echo
if [ "$A" -ne 0 ] && [ "$B" -eq 0 ] && [ "$C" -ne 0 ] && [ "$F1" -eq 0 ] && [ "$F2" -eq 0 ]; then
  echo "BATCH13_VERIFICATION_PASSED"
  exit 0
fi
echo "BATCH13_VERIFICATION_FAILED"
exit 1
