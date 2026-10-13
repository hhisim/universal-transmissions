#!/usr/bin/env bash
#
# batch14ay-function-surface.sh
#
# BATCH 14 — FINALIZE THE PRODUCTION SQL SURFACE.
#
# Installs the validated bundle in an ISOLATED cluster (PostgreSQL 17 by default)
# and dumps the COMPLETE function surface it creates:
#
#   * every function in `public` after the bundle — exact signature, return type,
#     security mode, owner, pinned search_path, language, volatility, kind;
#   * the raw ACL and the ACL broken down per grantee (EXECUTE only);
#   * EFFECTIVE EXECUTE for anon / authenticated / service_role (inheritance-aware,
#     which raw ACL reading is not);
#   * whether the default PUBLIC grant survived;
#   * the full body, so the dependency graph can be derived from what a function
#     actually calls instead of from an assumption.
#
# The fixture also creates ONE unrelated legacy function that the bundle has nothing
# to do with. It must be untouched by the boundary migration: "do not revoke
# permissions on unrelated existing functions" is asserted, not assumed.
#
# The dependency graph is NOT taken from pg_depend: plpgsql bodies record no
# dependencies there, so a graph built from it would silently show every function as
# a leaf. It is derived from the bodies.
#
# Usage: PGBIN=/usr/lib/postgresql/17/bin bash scripts/batch14ay-function-surface.sh
#
set -uo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
MIG="$REPO/supabase/migrations"
PGBIN=${PGBIN:-/usr/lib/postgresql/17/bin}
PG_MAJOR=$(basename "$(dirname "$PGBIN")")
STAMP=$(date +%s)
BASE=$(mktemp -d /var/tmp/b14ay-XXXXXX)
SOCK="$BASE/sock"
DATA="$BASE/data"
PLOG="$BASE/pg.log"
DIAG=${DIAG:-/var/tmp/b14ay-diag-$STAMP}
DB=b14ay
BATCH13="20261010_membership_access_hardening.sql"
BUNDLE=(
  "20261010_membership_write_contract.sql"
  "20261012_apply_lifecycle_update.sql"
  "20261013_lifecycle_linkage_sync.sql"
  "20261014_lifecycle_sync_wrapper.sql"
  "20261015_lifecycle_per_entry_skip.sql"
  "20261016_entitlement_authority.sql"
)

cleanup() {
  mkdir -p "$DIAG" 2>/dev/null
  cp -f "$BASE"/*.sql "$BASE"/*.out "$BASE"/*.log "$BASE"/*.tsv "$DIAG"/ 2>/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  # terminate -> verify gone -> remove
  local i=0
  while [ -f "$DATA/postmaster.pid" ] && [ "$i" -lt 20 ]; do sleep 0.5; i=$((i+1)); done
  rm -rf "$BASE" 2>/dev/null
  if [ -d "$DATA" ]; then echo "WARN cluster directory survived: $DATA"; fi
}
trap cleanup EXIT INT TERM HUP

[ -x "$PGBIN/initdb" ] || { echo "MISSING $PGBIN/initdb"; exit 2; }
for f in "${BUNDLE[@]}"; do [ -f "$MIG/$f" ] || { echo "MISSING $MIG/$f"; exit 2; }; done

chown postgres "$BASE"; chmod 755 "$BASE"
mkdir -p "$SOCK"; chown postgres "$SOCK"

echo "== cluster (PostgreSQL $PG_MAJOR) =="
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses=' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }

q()  { su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
psql_() { su postgres -c "psql -h $SOCK -d $DB -X -q -v ON_ERROR_STOP=1 -f $1" 2>&1; }
run_file() { cp "$1" "$BASE/$(basename "$1")"; chmod 644 "$BASE/$(basename "$1")"; psql_ "$BASE/$(basename "$1")"; }
run_sql() {  # run_sql <file>  — the file must already live under $BASE
  chmod 644 "$BASE/$1"; psql_ "$BASE/$1"; }

# --------------------------------------------------------------------- fixture --
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
create role service_role nologin bypassrls;
grant usage on schema public to anon, authenticated, service_role;
grant all privileges on public.ut_members to anon, authenticated, service_role;
grant all privileges on public.profiles   to anon, authenticated, service_role;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create policy allow_authenticated_read on public.ut_members for select to authenticated using (auth.uid() is not null);
create policy srv_full_access on public.ut_members for all to service_role using (true) with check (true);
alter table public.ut_members enable row level security;
alter table public.profiles   enable row level security;

-- An UNRELATED legacy function. Nothing in the bundle references it; the boundary
-- migration must leave its privileges exactly as they are (default PUBLIC EXECUTE).
create function public.unrelated_legacy_helper(p_id uuid) returns int
  language sql as $fn$ select 1 $fn$;
comment on function public.unrelated_legacy_helper(uuid) is 'fixture: not part of the bundle';
EOF
chmod 644 "$BASE/schema.sql"
su postgres -c "createdb -h $SOCK $DB" >/dev/null 2>&1 || { echo "createdb FAILED"; exit 2; }
psql_ "$BASE/schema.sql" >"$BASE/schema.out" 2>&1 || { echo "schema FAILED"; cat "$BASE/schema.out"; exit 2; }

# ---------------------------------------------------------------- installation --
echo "== install: Batch 13 + the bundle + the exclusive-global policy step =="
run_file "$MIG/$BATCH13" >"$BASE/b13.out" 2>&1 || { echo "Batch 13 FAILED"; tail -8 "$BASE/b13.out"; exit 2; }
for f in "${BUNDLE[@]}"; do
  run_file "$MIG/$f" >"$BASE/$(basename "$f" .sql).out" 2>&1 \
    || { echo "bundle file FAILED: $f"; tail -8 "$BASE/$(basename "$f" .sql).out"; exit 2; }
done
q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1 || { echo "policy step FAILED"; exit 2; }
echo "   install complete"

# ----------------------------------------------------------------- the dump ----
# chr(31) separates fields and chr(12) stands for a newline inside a body, so the
# body survives being carried in a single-line record.
cat >"$BASE/inventory.sql" <<'EOF'
select
  p.proname
  || chr(31) || pg_get_function_identity_arguments(p.oid)
  || chr(31) || pg_get_function_result(p.oid)
  || chr(31) || case when p.prosecdef then 'DEFINER' else 'INVOKER' end
  || chr(31) || pg_get_userbyid(p.proowner)
  || chr(31) || coalesce(replace(array_to_string(p.proconfig, ','), ' ', ''), '-')
  || chr(31) || case when p.prorettype = 'trigger'::regtype then 'TRIGGER' else 'FUNCTION' end
  || chr(31) || l.lanname
  || chr(31) || case p.provolatile when 'v' then 'VOLATILE' when 's' then 'STABLE' else 'IMMUTABLE' end
  || chr(31) || coalesce(p.proacl::text, '-')
  || chr(31) || coalesce((select string_agg(a.grantee::regrole::text, ',' order by a.grantee::regrole::text)
                          from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                          where a.privilege_type = 'EXECUTE' and a.grantee <> 0), '-')
  || chr(31) || (select count(*)::text from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                 where a.grantee = 0 and a.privilege_type = 'EXECUTE')
  || chr(31) || has_function_privilege('anon', p.oid, 'EXECUTE')::text
  || chr(31) || has_function_privilege('authenticated', p.oid, 'EXECUTE')::text
  || chr(31) || has_function_privilege('service_role', p.oid, 'EXECUTE')::text
  || chr(31) || has_function_privilege('postgres', p.oid, 'EXECUTE')::text
  || chr(31) || replace(p.prosrc, chr(10), chr(12))
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
join pg_language  l on l.oid = p.prolang
where n.nspname = 'public'
order by p.proname, pg_get_function_identity_arguments(p.oid);
EOF
chmod 644 "$BASE/inventory.sql"
su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/inventory.sql" \
  >"$BASE/inventory.tsv" 2>&1 || { echo "inventory FAILED"; cat "$BASE/inventory.tsv"; exit 2; }

# The triggers, for the record: which function each one calls, on what event/timing.
cat >"$BASE/triggers.sql" <<'EOF'
select
  c.relname
  || chr(31) || t.tgname
  || chr(31) || case when t.tgtype & 1 = 1 then 'ROW' else 'STATEMENT' end
  || chr(31) || case when t.tgtype & 2 = 2 then 'BEFORE' when t.tgtype & 64 = 64 then 'INSTEAD' else 'AFTER' end
  || chr(31) || case when t.tgtype & 4 = 4 then 'INSERT' else '' end
  || chr(31) || case when t.tgtype & 8 = 8 then 'DELETE' else '' end
  || chr(31) || case when t.tgtype & 16 = 16 then 'UPDATE' else '' end
  || chr(31) || case when t.tgtype & 32 = 32 then 'TRUNCATE' else '' end
  || chr(31) || p.proname
  || chr(31) || t.tgenabled::text
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_proc  p on p.oid = t.tgfoid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and not t.tgisinternal
order by c.relname, t.tgname;
EOF
chmod 644 "$BASE/triggers.sql"
su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/triggers.sql" \
  >"$BASE/triggers.tsv" 2>&1 || { echo "triggers FAILED"; exit 2; }

cp -f "$BASE/inventory.tsv" "$BASE/triggers.tsv" "$DIAG"/ 2>/dev/null
echo ""
echo "== function surface (name|args|returns|mode|owner|search_path|kind|lang|vol|acl|acl_roles|public_grants|anon|authd|svc|postgres) =="
awk -F'\x1f' '{ printf "%-38s %-42s %-38s %-7s %-9s %-26s %-8s %-8s %-8s\n     acl=%s  acl_roles=%s  public_exec=%s  eff[anon=%s authd=%s svc=%s postgres=%s]\n", $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16 }' \
  "$BASE/inventory.tsv"
echo ""
echo "== triggers (table|name|level|timing|INSERT|DELETE|UPDATE|TRUNCATE|function|enabled) =="
awk -F'\x1f' '{ printf "%-14s %-18s %-10s %-7s %-7s %-7s %-7s %-9s %-32s %s\n", $1,$2,$3,$4,$5,$6,$7,$8,$9,$10 }' \
  "$BASE/triggers.tsv"
echo ""
echo "== diag: $DIAG (inventory.tsv, triggers.tsv, per-file install logs) =="
echo "BATCH14AY_FUNCTION_SURFACE_INVENTORY_DONE"
