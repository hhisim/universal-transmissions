#!/bin/bash
# ============================================================================
# Batch 13 — isolated, DESTRUCTIVE verification. NEVER POINT THIS AT PRODUCTION.
#
# Creates a throw-away database and deliberately performs destructive probes
# (TRUNCATE inside a rolled-back transaction, synthetic inserts, privilege
# seeding). It never connects to Supabase and never touches production.
#
# For production use the READ-ONLY procedure instead:
#     psql "$PROD_URL" -f scripts/batch13-membership-access-verify-production.sql
#
# Target a specific server with B13_PGHOST / B13_PGPORT, e.g. the isolated
# PostgreSQL 17 instance:
#     B13_PGHOST=/var/tmp/pg17sock B13_PGPORT=55433 scripts/batch13-...-verify.sh
#
# Requires a local PostgreSQL server and sudo access to the postgres user.
# ============================================================================
set -u
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB=b13test

PGARGS=()
[ -n "${B13_PGHOST:-}" ] && PGARGS+=(-h "$B13_PGHOST")
[ -n "${B13_PGPORT:-}" ] && PGARGS+=(-p "$B13_PGPORT")
PSQL=(sudo -u postgres psql "${PGARGS[@]}")

echo "================================================================"
echo "  ISOLATED / DESTRUCTIVE SUITE — throw-away database only."
echo "  Production verification: scripts/batch13-membership-access-verify-production.sql"
echo "================================================================"
echo
echo "=== target server ==="
"${PSQL[@]}" -d postgres -t -A -c "select 'server: ' || version();" 2>&1
"${PSQL[@]}" -d postgres -t -A -c "select 'num   : ' || current_setting('server_version_num');" 2>&1
if "${PSQL[@]}" -d postgres -t -A -c "select has_table_privilege('postgres','pg_class','MAINTAIN');" 2>/dev/null | grep -q t; then
  echo "MAINTAIN supported: yes"
else
  echo "MAINTAIN supported: no (pre-17) — the MAINTAIN branch will be skipped by design"
fi
echo

fresh() {
  "${PSQL[@]}" -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture-roles.sql" >/dev/null 2>&1 || return 1
  "${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture.sql" >/dev/null 2>&1 || return 1
  "${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture-compat.sql" >/dev/null 2>&1 || return 1
}

MIG="$HERE/../supabase/migrations/20261010_membership_access_hardening.sql"

echo "############ STATE A — as deployed (the defect) ############"
fresh || { echo "fixture build failed"; exit 3; }
python3 "$HERE/batch13-membership-access-tests.py"; A=$?

echo
echo "############ STATE A2 — seed independent COLUMN grants ############"
"${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-fixture-colgrants.sql" || exit 3
"${PSQL[@]}" -d $DB -t -A -c "
select '  column grants before migration: ' || coalesce(string_agg(x, ', '), '(none)')
from (
  select r.rolname||'|'||t.tablename||'|'||c.col||'|'||p.priv as x
  from (values ('anon'),('authenticated')) r(rolname)
  cross join (values ('profiles'),('ut_members')) t(tablename)
  cross join (values ('email'),('plan')) c(col)
  cross join (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(priv)
  where has_column_privilege(r.rolname,'public.'||t.tablename,c.col,p.priv)
) s;"

echo
echo "############ STATE B — apply the migration ############"
"${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -f "$MIG" 2>&1 | grep -E "NOTICE|ERROR|ROLLBACK|COMMIT|^BEGIN|^DROP|^REVOKE|^SET|^DO"
echo "  migration exit=${PIPESTATUS[0]}"

echo
echo "  column grants AFTER migration (must be none):"
"${PSQL[@]}" -d $DB -t -A -c "
select '    ' || coalesce(string_agg(x, ', '), '(none)')
from (
  select r.rolname||'|'||t.tablename||'|'||c.col||'|'||p.priv as x
  from (values ('anon'),('authenticated')) r(rolname)
  cross join (values ('profiles'),('ut_members')) t(tablename)
  cross join (values ('email'),('plan')) c(col)
  cross join (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(priv)
  where has_column_privilege(r.rolname,'public.'||t.tablename,c.col,p.priv)
) s;"
"${PSQL[@]}" -d $DB -t -A -c "
select '    has_any_column_privilege leftovers: ' || coalesce(string_agg(x,', '),'(none)')
from (select r.rolname||'|'||t.tablename||'|'||p.priv as x
      from (values ('anon'),('authenticated')) r(rolname)
      cross join (values ('profiles'),('ut_members')) t(tablename)
      cross join (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(priv)
      where has_any_column_privilege(r.rolname,'public.'||t.tablename,p.priv)) s;"

echo
echo "############ STATE B — probes ############"
python3 "$HERE/batch13-membership-access-tests.py"; B=$?

echo
echo "############ STATE B2 — every production verification statement, individually ############"
python3 "$HERE/batch13-membership-access-run-verify.py"; V=$?

echo
echo "############ STATE B3 — direct test of the column-revocation path ############"
python3 "$HERE/batch13-membership-access-column-revoke-test.py"; K=$?

echo
echo "############ STATE B4 — reapplication (idempotency) ############"
"${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -f "$MIG" >/dev/null 2>&1
echo "  second apply exit=$?"

echo
echo "############ STATE C — reversal restores the detected defects ############"
fresh || exit 3
"${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -q -f "$MIG" >/dev/null 2>&1
"${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -q -f "$HERE/batch13-membership-access-reversal.sql" >/dev/null 2>&1
python3 "$HERE/batch13-membership-access-tests.py"; C=$?

echo
echo "############ FOREIGN-KEY COMPATIBILITY ############"
fresh || exit 3
echo "--- before the migration ---"
python3 "$HERE/batch13-membership-access-compat-test.py"; F1=$?
"${PSQL[@]}" -d $DB -v ON_ERROR_STOP=1 -q -f "$MIG" >/dev/null 2>&1
echo "--- after the migration ---"
python3 "$HERE/batch13-membership-access-compat-test.py"; F2=$?

echo
echo "================ SUMMARY ================"
echo "  A  as deployed            : exit $A  (expected NON-zero)"
echo "  B  after migration        : exit $B  (expected zero)"
echo "  B2 verification statements: exit $V  (expected zero)"
echo "  B3 column-revoke path     : exit $K  (expected zero)"
echo "  C  after reversal         : exit $C  (expected NON-zero)"
echo "  FK compat before / after  : exit $F1 / $F2 (expected zero / zero)"
echo
if [ "$A" -ne 0 ] && [ "$B" -eq 0 ] && [ "$V" -eq 0 ] && [ "$K" -eq 0 ] && [ "$C" -ne 0 ] && [ "$F1" -eq 0 ] && [ "$F2" -eq 0 ]; then
  echo "BATCH13_VERIFICATION_PASSED"
  exit 0
fi
echo "BATCH13_VERIFICATION_FAILED"
exit 1
