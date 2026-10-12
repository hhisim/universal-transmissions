#!/usr/bin/env bash
#
# batch14af-atomic-integration.sh
#
# Real isolated PostgreSQL cluster for the integrated TypeScript lifecycle path.
# The cluster is private: a unix socket in a private directory, NO TCP listener
# (asserted below). It is torn down WITH its data directory on every exit path,
# and diagnostics are copied out first.
#
# It applies, in order: the schema, the COMMITTED reviewed RPC (byte-identically),
# the linkage-key helpers, the synchronization wrapper, and finally the Batch 14af
# per-entry skip candidate — which supersedes the primitive's body while leaving
# the reviewed FILE untouched.
#
set -uo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
MIG="$REPO/supabase/migrations"
PGBIN=/usr/lib/postgresql/16/bin
STAMP=$(date +%s)
BASE=$(mktemp -d /var/tmp/b14af-XXXXXX)
SOCK="$BASE/sock"
DATA="$BASE/data"
PLOG="$BASE/pg.log"
DIAG="/var/tmp/b14af-diag-$STAMP"

SQL_REVIEWED="$MIG/20261012_apply_lifecycle_update.sql"
SQL_KEYS="$MIG/20261013_lifecycle_linkage_sync.sql"
SQL_WRAPPER="$MIG/20261014_lifecycle_sync_wrapper.sql"
SQL_SKIP="$MIG/20261015_lifecycle_per_entry_skip.sql"

fails=0
chkeq() {
  if [ "$2" = "$3" ]; then echo "  ok   $1"; else echo "  FAIL $1 (expected $2, observed $3)"; fails=$((fails+1)); fi
}

cleanup() {
  mkdir -p "$DIAG" 2>/dev/null
  cp -f "$BASE"/*.sql "$BASE"/*.out "$BASE"/*.log "$DIAG"/ 2>/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  # The data directory is removed with the rest of the workspace.
  rm -rf "$BASE" 2>/dev/null
  if [ -d "$DATA" ]; then echo "  WARN cluster directory survived: $DATA"; fi
}
trap cleanup EXIT INT TERM HUP

for f in "$SQL_REVIEWED" "$SQL_KEYS" "$SQL_WRAPPER" "$SQL_SKIP"; do
  [ -f "$f" ] || { echo "MISSING $f"; exit 2; }
done

chown postgres "$BASE"
chmod 755 "$BASE"
mkdir -p "$SOCK"
chown postgres "$SOCK"

echo "== cluster =="
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses= -c deadlock_timeout=1s' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }

q() {
  su postgres -c "PGAPPNAME=super psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1
}
chkeq "no TCP listener" "0" "$(q "select count(*) from pg_settings where name='listen_addresses' and setting<>''")"

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
create role anon nologin;
create role authenticated nologin;
create role service_role nologin;
grant usage on schema public to anon, authenticated, service_role;
EOF
chmod 644 "$BASE/schema.sql"
su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/schema.sql" >"$BASE/schema.out" 2>&1 \
  || { echo "schema FAILED"; cat "$BASE/schema.out"; exit 2; }
echo "  ok   schema + roles"

REV_SHA_BEFORE=$(sha256sum "$SQL_REVIEWED" | awk '{print $1}')
cp "$SQL_REVIEWED" "$BASE/reviewed.sql"; chmod 644 "$BASE/reviewed.sql"
su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/reviewed.sql" >"$BASE/reviewed.out" 2>&1 \
  || { echo "REVIEWED MIGRATION FAILED"; tail -20 "$BASE/reviewed.out"; exit 2; }
chkeq "the reviewed RPC is installed" "apply_lifecycle_update" \
  "$(q "select proname from pg_proc where proname='apply_lifecycle_update'")"
chkeq "the reviewed FILE was not modified by applying it" "$REV_SHA_BEFORE" "$(sha256sum "$SQL_REVIEWED" | awk '{print $1}')"

for f in "$SQL_KEYS" "$SQL_WRAPPER" "$SQL_SKIP"; do
  b=$(basename "$f" .sql)
  cp "$f" "$BASE/$b.sql"; chmod 644 "$BASE/$b.sql"
  su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/$b.sql" >"$BASE/$b.out" 2>&1 \
    || { echo "FAILED to apply $b"; tail -20 "$BASE/$b.out"; exit 2; }
  echo "  ok   applied $b"
done
chkeq "the synchronized entry point is installed" "apply_lifecycle_update_sync_global" \
  "$(q "select proname from pg_proc where proname='apply_lifecycle_update_sync_global'")"

echo ""
echo "== integrated TypeScript path against the real primitive =="
B14AF_SOCK="$SOCK" B14AF_BASE="$BASE" node "$REPO/scripts/batch14af-atomic-integration.js"
rc=$?

echo ""
if [ "$rc" -eq 0 ] && [ "$fails" -eq 0 ]; then
  echo "BATCH14AF_INTEGRATION_HARNESS_PASSED"
  exit 0
fi
echo "BATCH14AF_INTEGRATION_HARNESS_FAILED (runner rc=$rc, setup failures=$fails)"
exit 1
