#!/bin/bash
# Batch 14 — isolated PostgreSQL 17 fixture + probes. Synthetic data only.
set -u
export PATH=/usr/lib/postgresql/17/bin:/opt/pg17srv/usr/lib/postgresql/17/bin:$PATH
PSQL="psql -X -q -h /var/tmp/b14sock -p 55434 -U prime -d b14test"
WT=/mnt/deploy-ssd/worktrees/ut-batch14
MIG=$WT/supabase/migrations/20261010_membership_write_contract.sql
REV=$WT/scripts/batch14-membership-write-contract-reversal.sql

echo "server: $($PSQL -tAX -c "select current_setting('server_version')")  ($($PSQL -tAX -c "select current_setting('server_version_num')"))"

echo
echo "############################################################"
echo "# 1. LOAD DEPLOYED SCHEMA + SYNTHETIC ROWS"
echo "############################################################"
$PSQL -f /var/tmp/b14/fixture.sql 2>&1 | grep -vE "^\s*$" || true
echo "rows: ut_members=$($PSQL -tAX -c 'select count(*) from ut_members') profiles=$($PSQL -tAX -c 'select count(*) from profiles')"

echo
echo "############################################################"
echo "# 2. PROBES AS DEPLOYED"
echo "############################################################"
$PSQL -f /var/tmp/b14/probes-before.sql 2>&1 | grep -E "NOTICE|P[0-9]" || true

echo
echo "############################################################"
echo "# 3. GUARD: migration must ABORT on case-normalised duplicates"
echo "############################################################"
$PSQL -c "insert into public.ut_members (email, plan) values ('synthetic-guard@example.invalid','guest'),('SYNTHETIC-GUARD@example.invalid','guest')" >/dev/null 2>&1
GEXIT=0
$PSQL -v ON_ERROR_STOP=1 -f $MIG >/var/tmp/b14-guard.log 2>&1 || GEXIT=$?
echo "guard run exit = $GEXIT"
grep -oE "BATCH14 ABORT: [^;]*" /var/tmp/b14-guard.log | head -2 || echo "  (no abort message — guard did NOT fire)"
echo "index created despite duplicates? $($PSQL -tAX -c "select count(*) from pg_indexes where schemaname='public' and indexname='ut_members_email_lower_key'")"
$PSQL -c "delete from public.ut_members where lower(email)='synthetic-guard@example.invalid'" >/dev/null 2>&1

echo
echo "############################################################"
echo "# 4. APPLY THE MIGRATION"
echo "############################################################"
AEXIT=0
$PSQL -v ON_ERROR_STOP=1 -f $MIG 2>&1 | grep -E "NOTICE" || true
$PSQL -v ON_ERROR_STOP=1 -f $MIG >/dev/null 2>&1; AEXIT=$?
echo "migration exit = $AEXIT"
echo "index present = $($PSQL -tAX -c "select count(*) from pg_indexes where schemaname='public' and tablename='ut_members' and indexname='ut_members_email_lower_key'")"

echo
echo "reapply (idempotence):"
REXIT=0
$PSQL -v ON_ERROR_STOP=1 -f $MIG >/dev/null 2>&1 || REXIT=$?
echo "reapply exit = $REXIT"

echo
echo "############################################################"
echo "# 5. PROBES AFTER THE MIGRATION"
echo "############################################################"
$PSQL -f /var/tmp/b14/probes-after.sql 2>&1 | grep -E "NOTICE|Q[0-9]" || true

echo
echo "############################################################"
echo "# 6. REVERSAL"
echo "############################################################"
VEXIT=0
$PSQL -v ON_ERROR_STOP=1 -f $REV >/dev/null 2>&1 || VEXIT=$?
echo "reversal exit = $VEXIT"
echo "index present after reversal = $($PSQL -tAX -c "select count(*) from pg_indexes where schemaname='public' and tablename='ut_members' and indexname='ut_members_email_lower_key'")"

echo
echo "############################################################"
echo "# 7. POST-REVERSAL: the defect state returns"
echo "############################################################"
$PSQL -f /var/tmp/b14/probes-before.sql 2>&1 | grep -E "P1 |P2 " || true

echo
echo "B14_PG_FIXTURE_DONE"