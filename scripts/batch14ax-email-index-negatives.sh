#!/usr/bin/env bash
#
# batch14ax-email-index-negatives.sh
#
# Negative and positive cases for the HARDENED address-uniqueness guards in
# supabase/migrations/20261010_membership_write_contract.sql.
#
# A NAME IS NOT A CONSTRAINT. The hardening makes the migration verify the object
# STRUCTURALLY — correct table, exactly one key expression, no partial predicate,
# uniqueness, and valid/ready/live — on both sides of the create. This harness
# proves each property is actually enforced by planting an object that violates it
# under the expected name and requiring the migration to ABORT rather than accept
# it.
#
# Cases:
#   N0  clean                      applies, postflight passes, index is correct
#   N1  WRONG TABLE (profiles)     abort
#   N2  PARTIAL (where ...)        abort
#   N3  COMPOSITE (expr, plan)     abort
#   N4  INVALID (indisvalid=false) abort
#   N5  NOT READY (indisready=false) abort
#   N6  NOT UNIQUE                 abort
#   N7  right name, WRONG EXPRESSION (plain email) abort
#   N8  idempotency: a second clean apply is a no-op and still passes
#
# Private PostgreSQL cluster: unix socket in a private directory, NO TCP listener
# (asserted), torn down with its data directory on every exit path.
#
set -uo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
MIG="$REPO/supabase/migrations/20261010_membership_write_contract.sql"
PGBIN=/usr/lib/postgresql/16/bin
STAMP=$(date +%s)
BASE=$(mktemp -d /var/tmp/b14ax-neg-XXXXXX)
SOCK="$BASE/sock"
DATA="$BASE/data"
PLOG="$BASE/pg.log"
DIAG="/var/tmp/b14ax-neg-diag-$STAMP"
DB=b14ax

fails=0
oks=0
ok()   { echo "  ok   $1"; oks=$((oks+1)); }
bad()  { echo "  FAIL $1"; fails=$((fails+1)); }
chkeq(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', observed '$3')"; fi; }

cleanup() {
  mkdir -p "$DIAG" 2>/dev/null
  cp -f "$BASE"/*.sql "$BASE"/*.out "$BASE"/*.log "$DIAG"/ 2>/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  rm -rf "$BASE" 2>/dev/null
  if [ -d "$DATA" ]; then echo "  WARN cluster directory survived: $DATA"; fi
}
trap cleanup EXIT INT TERM HUP

[ -f "$MIG" ] || { echo "MISSING $MIG"; exit 2; }
MIG_SHA_BEFORE=$(sha256sum "$MIG" | awk '{print $1}')

chown postgres "$BASE"; chmod 755 "$BASE"
mkdir -p "$SOCK"; chown postgres "$SOCK"

echo "== cluster =="
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses=' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }

psql_() {  # psql_ <database> <file>
  su postgres -c "PAPPNAME=b14ax psql -h $SOCK -d $1 -X -q -v ON_ERROR_STOP=1 -f $2" 2>&1
}
q() { su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
# The database does not exist yet when the listener is asserted, so that one
# check runs against the maintenance database.
qp() { su postgres -c "psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }

chkeq "no TCP listener" "0" "$(qp "select count(*) from pg_settings where name='listen_addresses' and setting<>''")"

cat >"$BASE/schema.sql" <<'EOF'
create table public.ut_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text default 'guest',
  subscription_status text default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);
create table public.profiles (
  user_id uuid primary key,
  email text,
  plan text default 'guest',
  subscription_status text default 'inactive',
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz
);
EOF
chmod 644 "$BASE/schema.sql"
su postgres -c "createdb -h $SOCK $DB" >/dev/null 2>&1 || { echo "createdb FAILED"; exit 2; }
psql_ "$DB" "$BASE/schema.sql" >"$BASE/schema.out" 2>&1 || { echo "schema FAILED"; cat "$BASE/schema.out"; exit 2; }
ok "schema created in $DB"

cp "$MIG" "$BASE/migration.sql"; chmod 644 "$BASE/migration.sql"

# run_case <tag> <setup-sql-or-empty> <expect: ok|abort> <message-fragment>
run_case() {
  local tag="$1" setup="$2" expect="$3" fragment="$4"
  q "drop index if exists public.ut_members_email_lower_key" >/dev/null 2>&1
  if [ -n "$setup" ]; then
    printf '%s\n' "$setup" >"$BASE/$tag.setup.sql"; chmod 644 "$BASE/$tag.setup.sql"
    psql_ "$DB" "$BASE/$tag.setup.sql" >"$BASE/$tag.setup.out" 2>&1 \
      || { bad "$tag could not plant its starting object"; cat "$BASE/$tag.setup.out"; return; }
  fi
  psql_ "$DB" "$BASE/migration.sql" >"$BASE/$tag.out" 2>&1
  local rc=$?
  if [ "$expect" = "ok" ]; then
    chkeq "$tag the migration applies" "0" "$rc"
  else
    if [ "$rc" != "0" ]; then ok "$tag the migration ABORTS (exit $rc)"; else bad "$tag the migration did NOT abort"; fi
    if grep -q "$fragment" "$BASE/$tag.out"; then ok "$tag the abort names the defect"; else
      bad "$tag the abort does not mention '$fragment'"; sed -n '1,6p' "$BASE/$tag.out"; fi
  fi
}

echo ""
echo "== N0 clean =="
run_case n0 "" ok ""

echo "== index properties after the clean apply =="
chkeq "index is on ut_members"      "ut_members" "$(q "select c.relname from pg_index i join pg_class c on c.oid=i.indrelid where i.indexrelid='public.ut_members_email_lower_key'::regclass")"
# psql -A prints booleans as true/false (t/f is the aligned format).
chkeq "unique / valid / ready / live" "true|true|true|true" "$(q "select i.indisunique||'|'||i.indisvalid||'|'||i.indisready||'|'||i.indislive from pg_index i where i.indexrelid='public.ut_members_email_lower_key'::regclass")"
chkeq "one key column, no INCLUDE"  "1|1" "$(q "select i.indnkeyatts||'|'||i.indnatts from pg_index i where i.indexrelid='public.ut_members_email_lower_key'::regclass")"
chkeq "no partial predicate"        "0" "$(q "select count(*) from pg_index i where i.indexrelid='public.ut_members_email_lower_key'::regclass and i.indpred is not null")"
chkeq "expression is lower(btrim(email))" "lower(btrim(email))" "$(q "select replace(pg_get_expr(i.indexprs,i.indrelid),' ','') from pg_index i where i.indexrelid='public.ut_members_email_lower_key'::regclass")"
q "insert into public.ut_members(email) values ('a@x.com')" >/dev/null 2>&1
DUP_OUT=$(q "insert into public.ut_members(email) values ('A@X.COM')" 2>&1)
if printf '%s' "$DUP_OUT" | grep -q 'duplicate key value violates unique constraint'; then
  ok "the index enforces the contract: a case-variant duplicate is refused"
else
  bad "a case-variant duplicate was NOT refused ($DUP_OUT)"
fi

echo ""
echo "== N1 wrong table =="
run_case n1 "create unique index ut_members_email_lower_key on public.profiles (lower(btrim(email)));" abort "already exists on table profiles"

echo "== N2 partial =="
run_case n2 "create unique index ut_members_email_lower_key on public.ut_members (lower(btrim(email))) where subscription_status = 'active';" abort "PARTIAL index"

echo "== N3 composite =="
run_case n3 "create unique index ut_members_email_lower_key on public.ut_members (lower(btrim(email)), plan);" abort "single-expression address key"

echo "== N4 invalid =="
run_case n4 "create unique index ut_members_email_lower_key on public.ut_members (lower(btrim(email))); update pg_index set indisvalid = false where indexrelid = 'public.ut_members_email_lower_key'::regclass;" abort "is INVALID"

echo "== N5 not ready =="
run_case n5 "create unique index ut_members_email_lower_key on public.ut_members (lower(btrim(email))); update pg_index set indisready = false where indexrelid = 'public.ut_members_email_lower_key'::regclass;" abort "not READY"

echo "== N6 not unique =="
run_case n6 "create index ut_members_email_lower_key on public.ut_members (lower(btrim(email)));" abort "is NOT unique"

echo "== N7 wrong expression =="
run_case n7 "create unique index ut_members_email_lower_key on public.ut_members (email);" abort "not lower(btrim(email))"

echo ""
echo "== N8 idempotency =="
run_case n8 "" ok ""
psql_ "$DB" "$BASE/migration.sql" >"$BASE/n8-second.out" 2>&1
N8_RC=$?
chkeq "a second clean apply exits 0" "0" "$N8_RC"
chkeq "a second clean apply is a no-op (preflight accepts the existing index)" "1" \
  "$(grep -c 'already satisfies every structural check' "$BASE/n8-second.out")"

echo ""
chkeq "the migration FILE was not modified by applying it" "$MIG_SHA_BEFORE" "$(sha256sum "$MIG" | awk '{print $1}')"

echo ""
echo "assertions passed: $oks  failed: $fails"
if [ "$fails" -gt 0 ]; then echo "BATCH14AX_EMAIL_INDEX_NEGATIVES_FAILED"; exit 1; fi
echo "BATCH14AX_EMAIL_INDEX_NEGATIVES_PASSED"
