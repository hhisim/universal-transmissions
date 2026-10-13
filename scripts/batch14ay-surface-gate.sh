#!/usr/bin/env bash
#
# batch14ay-surface-gate.sh
#
# BATCH 14 — FINALIZE THE PRODUCTION SQL SURFACE: the focused validation.
#
# Installs the validated bundle (Batch 13 -> 20261010..20261016 -> the
# exclusive-global policy step) and then the BOUNDARY migration
# (20261017_function_surface_boundary.sql) in an ISOLATED cluster, and proves:
#
#   A. the boundary applies cleanly, twice (idempotent);
#   B. the resulting surface is exactly the intended one — existence, exact
#      signature, mode, owner, pinned search_path, no PUBLIC / anon / authenticated
#      EXECUTE, and service_role exactly where intended — and the seven Batch 14ab
#      prototype functions are ABSENT;
#   C. an unrelated legacy function is UNTOUCHED (still holds its default PUBLIC
#      EXECUTE): "do not revoke permissions on unrelated existing functions" is
#      asserted, not assumed;
#   D. DENIED: anon, authenticated and a role holding only PUBLIC are refused when
#      they CALL each retained function;
#   E. AUTHORIZED: as service_role the atomic RPC still works and a direct INSERT
#      and UPDATE still commit with the statement trigger firing — closing PUBLIC
#      did not break the application or the direct writers — while the withdrawn
#      per-identity variant is genuinely refused and still works for the operator;
#   F. the granted closure is LOAD-BEARING: revoking service_role on a helper the
#      released paths call makes them FAIL, and restoring it makes them work again;
#   G. the denial is LOAD-BEARING: re-granting PUBLIC lets a PUBLIC-only role call
#      the helper, and revoking refuses it again;
#   H. fail-closed: a dependent object blocks the prototype DROP (RESTRICT) and the
#      boundary ABORTS instead of removing it silently.
#
# Version-parameterised: PGBIN=/usr/lib/postgresql/16/bin for PostgreSQL 16.
#
set -uo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
MIG="$REPO/supabase/migrations"
PGBIN=${PGBIN:-/usr/lib/postgresql/17/bin}
PG_MAJOR=$(basename "$(dirname "$PGBIN")")
STAMP=$(date +%s)
BASE=$(mktemp -d /var/tmp/b14ay-gate-XXXXXX)
SOCK="$BASE/sock"
DATA="$BASE/data"
PLOG="$BASE/pg.log"
DIAG=${DIAG:-/var/tmp/b14ay-gate-diag-$STAMP}
DB=b14ay
EXPLORE=${EXPLORE:-0}
BATCH13="20261010_membership_access_hardening.sql"
BOUNDARY="20261017_function_surface_boundary.sql"
BUNDLE=(
  "20261010_membership_write_contract.sql"
  "20261012_apply_lifecycle_update.sql"
  "20261013_lifecycle_linkage_sync.sql"
  "20261014_lifecycle_sync_wrapper.sql"
  "20261015_lifecycle_per_entry_skip.sql"
  "20261016_entitlement_authority.sql"
)
# name|identity-args|mode|owner|search_path|anon|authenticated|public_probe|service_role|public_grants
EXPECT=(
  'apply_lifecycle_update|p_targets jsonb|DEFINER|postgres|search_path=pg_catalog,public|f|f|f|t|0'
  'apply_lifecycle_update_sync|p_targets jsonb|INVOKER|postgres|search_path=pg_catalog,public|f|f|f|f|0'
  'apply_lifecycle_update_sync_global|p_targets jsonb|INVOKER|postgres|search_path=pg_catalog,public|f|f|f|t|0'
  'b14ab_acquire_global_lock|p_shared boolean|INVOKER|postgres|search_path=pg_catalog,public|f|f|f|t|0'
  'b14ab_linkage_global_key||INVOKER|postgres|search_path=pg_catalog,public|f|f|f|t|0'
  'b14ab_linkage_key|p_kind text, p_value text|INVOKER|postgres|search_path=pg_catalog,public|f|f|f|f|0'
  'b14ac_install_trigger|p_mode text|INVOKER|postgres|search_path=pg_catalog,public|f|f|f|f|0'
  'b14ac_linkage_keys_for_payload|p_targets jsonb|INVOKER|postgres|search_path=pg_catalog,public|f|f|f|f|0'
  'b14ac_trg_stmt_exclusive||INVOKER|postgres|search_path=pg_catalog,public|f|f|f|f|0'
  'b14ac_trg_stmt_shared||INVOKER|postgres|search_path=pg_catalog,public|f|f|f|f|0'
)
PROTOTYPES=(b14ab_install_trigger b14ab_trg_row b14ab_trg_stmt b14ab_lifecycle_apply
            b14ab_lifecycle_apply_nosync b14ab_acquire_linkage_locks b14ab_linkage_keys)

fails=0
oks=0
ok()   { echo "  ok   $1"; oks=$((oks+1)); }
bad()  { echo "  FAIL $1"; fails=$((fails+1)); }
chkeq(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', observed '$3')"; fi; }

cleanup() {
  mkdir -p "$DIAG" 2>/dev/null
  cp -f "$BASE"/*.sql "$BASE"/*.out "$BASE"/*.log "$BASE"/*.tsv "$DIAG"/ 2>/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  local i=0
  while [ -f "$DATA/postmaster.pid" ] && [ "$i" -lt 20 ]; do sleep 0.5; i=$((i+1)); done
  rm -rf "$BASE" 2>/dev/null
  if [ -d "$DATA" ]; then echo "  WARN cluster directory survived: $DATA"; fi
}
trap cleanup EXIT INT TERM HUP

[ -f "$MIG/$BOUNDARY" ] || { echo "MISSING $MIG/$BOUNDARY"; exit 2; }
for f in "${BUNDLE[@]}" "$BATCH13"; do [ -f "$MIG/$f" ] || { echo "MISSING $MIG/$f"; exit 2; }; done

chown postgres "$BASE"; chmod 755 "$BASE"
mkdir -p "$SOCK"; chown postgres "$SOCK"

echo "== cluster (PostgreSQL $PG_MAJOR) =="
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses= -c track_functions=all' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }

q()      { su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
psql_()  { su postgres -c "psql -h $SOCK -d $DB -X -q -v ON_ERROR_STOP=1 -f $1" 2>&1; }
# No ON_ERROR_STOP and no -q: every statement is attempted and every error captured.
# The output is also written beside the input file as <name>.out, so a failure can be
# read after the fact rather than only through what the harness chose to print.
psql_err() {  # psql_err <file>
  local f="$1" o="$BASE/$(basename "$1" .sql).out"
  su postgres -c "psql -h $SOCK -d $DB -X -A -t -f $f" >"$o" 2>&1
  cat "$o"
}
run_file() { cp "$1" "$BASE/$(basename "$1")"; chmod 644 "$BASE/$(basename "$1")"; psql_ "$BASE/$(basename "$1")"; }
run_boundary() { su postgres -c "psql -h $SOCK -d $DB -X -q -v ON_ERROR_STOP=1 -f $BASE/boundary.sql" >"$BASE/boundary_run.out" 2>&1; echo $?; }

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
-- Holds ONLY whatever PUBLIC grants: the sharpest test of the default grant.
create role b14ay_public_probe nologin;
grant usage on schema public to anon, authenticated, service_role, b14ay_public_probe;
grant all privileges on public.ut_members to anon, authenticated, service_role;
grant all privileges on public.profiles   to anon, authenticated, service_role;
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create policy allow_authenticated_read on public.ut_members for select to authenticated using (auth.uid() is not null);
create policy srv_full_access on public.ut_members for all to service_role using (true) with check (true);
alter table public.ut_members enable row level security;
alter table public.profiles   enable row level security;

-- UNRELATED: not created by the bundle, referenced by nothing in it. Its
-- privileges must be exactly as they are here after the boundary runs.
create function public.unrelated_legacy_helper(p_id uuid) returns int
  language sql as $fn$ select 1 $fn$;
comment on function public.unrelated_legacy_helper(uuid) is 'fixture: unrelated, must stay untouched';
EOF
chmod 644 "$BASE/schema.sql"
su postgres -c "createdb -h $SOCK $DB" >/dev/null 2>&1 || { echo "createdb FAILED"; exit 2; }
psql_ "$BASE/schema.sql" >"$BASE/schema.out" 2>&1 || { echo "schema FAILED"; cat "$BASE/schema.out"; exit 2; }

echo "== install: Batch 13 + the bundle + the policy step + the boundary =="
run_file "$MIG/$BATCH13" >"$BASE/b13.out" 2>&1 || { echo "Batch 13 FAILED"; tail -8 "$BASE/b13.out"; exit 2; }
for f in "${BUNDLE[@]}"; do
  run_file "$MIG/$f" >"$BASE/$(basename "$f" .sql).out" 2>&1 \
    || { echo "bundle file FAILED: $f"; tail -8 "$BASE/$(basename "$f" .sql).out"; exit 2; }
done
q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1 || { echo "policy step FAILED"; exit 2; }
UNRELATED_BEFORE=$(q "select coalesce(proacl::text,'-') || '|' || pg_get_userbyid(proowner) from pg_proc where proname='unrelated_legacy_helper'")

echo ""
echo "== A: the boundary migration =="
cp -f "$MIG/$BOUNDARY" "$BASE/boundary.sql"; chmod 644 "$BASE/boundary.sql"
chkeq "A1 the boundary applies cleanly" "0" "$(run_boundary)"
if [ "$(cat "$BASE/boundary_run.out" | grep -c ERROR)" != "0" ]; then
  bad "A1 errors during the boundary: $(grep -m1 ERROR "$BASE/boundary_run.out")"
fi
chkeq "A2 re-applying it is a no-op (idempotent)" "0" "$(run_boundary)"

# --------------------------------------------------------------- B/C: surface --
cat >"$BASE/surface.sql" <<'EOF'
select p.proname
  || chr(31) || pg_get_function_identity_arguments(p.oid)
  || chr(31) || case when p.prosecdef then 'DEFINER' else 'INVOKER' end
  || chr(31) || pg_get_userbyid(p.proowner)
  || chr(31) || coalesce(replace(array_to_string(p.proconfig, ','), ' ', ''), '-')
  || chr(31) || case when has_function_privilege('anon', p.oid, 'EXECUTE') then 't' else 'f' end
  || chr(31) || case when has_function_privilege('authenticated', p.oid, 'EXECUTE') then 't' else 'f' end
  || chr(31) || case when has_function_privilege('b14ay_public_probe', p.oid, 'EXECUTE') then 't' else 'f' end
  || chr(31) || case when has_function_privilege('service_role', p.oid, 'EXECUTE') then 't' else 'f' end
  || chr(31) || (select count(*)::text from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) a
                  where a.grantee = 0 and a.privilege_type = 'EXECUTE')
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
order by p.proname, pg_get_function_identity_arguments(p.oid);
EOF
chmod 644 "$BASE/surface.sql"
su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/surface.sql" \
  >"$BASE/surface.tsv" 2>&1 || { echo "surface query FAILED"; cat "$BASE/surface.tsv"; exit 2; }

echo ""
echo "== B/C: the retained surface =="
while IFS= read -r line; do
  [ -n "$line" ] || continue
  got=$(printf '%s' "$line" | tr '\037' '|')
  name=${got%%|*}
  exp=""
  for e in "${EXPECT[@]}"; do case "$e" in "$name|"*) exp="$e";; esac; done
  if [ -z "$exp" ]; then bad "B unexpected bundle-owned function present: $name"; continue; fi
  if [ "$got" = "$exp" ]; then ok "B $name — exact"; else bad "B $name (expected '$exp', observed '$got')"; fi
done <"$BASE/surface.tsv"
chkeq "B the surface is exactly the 10 retained functions" "10" "$(grep -c . "$BASE/surface.tsv")"
for proto in "${PROTOTYPES[@]}"; do
  chkeq "B prototype absent: $proto" "0" \
    "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='$proto'")"
done

UNRELATED_AFTER=$(q "select coalesce(proacl::text,'-') || '|' || pg_get_userbyid(proowner) from pg_proc where proname='unrelated_legacy_helper'")
chkeq "C the unrelated legacy function is untouched" "$UNRELATED_BEFORE" "$UNRELATED_AFTER"
chkeq "C it still holds its default PUBLIC EXECUTE" "t" \
  "$(q "select has_function_privilege('b14ay_public_probe','public.unrelated_legacy_helper(uuid)','EXECUTE')")"

# ---------------------------------------------------------------- D: denials --
echo ""
echo "== D: denied calls, per role =="
for role in anon authenticated b14ay_public_probe; do
  probe="$BASE/denied_$role.sql"
  {
    echo "set role $role;"
    for e in "${EXPECT[@]}"; do
      nm=${e%%|*}
      case "$nm" in
        apply_lifecycle_update|apply_lifecycle_update_sync|apply_lifecycle_update_sync_global) call="public.$nm('[]'::jsonb)";;
        b14ab_acquire_global_lock)  call="public.$nm(false)";;
        b14ab_linkage_global_key)   call="public.$nm()";;
        b14ab_linkage_key)          call="public.$nm('customer','x')";;
        b14ac_install_trigger)      call="public.$nm('b14ay-probe-none')";;
        b14ac_linkage_keys_for_payload) call="public.$nm('[]'::jsonb)";;
        *)                          call="public.$nm()";;
      esac
      echo "select $call;"
    done
  } >"$probe"
  chmod 644 "$probe"
  psql_err "$probe" >/dev/null 2>&1
  for e in "${EXPECT[@]}"; do
    nm=${e%%|*}
    if grep -q "permission denied for function $nm" "$BASE/denied_$role.out"; then
      ok "D $role -> $nm refused (42501 on the function)"
    else
      obs=$(grep -i "$nm" "$BASE/denied_$role.out" | head -1)
      bad "D $role -> $nm NOT refused with a function-level 42501 (observed: ${obs:-<none>})"
    fi
  done
done
if [ "$EXPLORE" = "1" ]; then
  echo "  -- raw denial output (anon) --"; sed 's/^/  /' "$BASE/denied_anon.out" | head -40
fi

# ----------------------------------------------------------- E: authorization --
echo ""
echo "== E: authorized paths as service_role =="
# The payload mirrors the REVIEWED primitive's schema: target names are
# `ut_members` / `profiles`, every target carries a linkage, `seen_pks` is the
# optimistic-concurrency snapshot, and each entry carries the row's `original`
# values plus the `set` applied only when `original` still matches.
CUS=cus_b14ay
SUB=sub_b14ay
MEMPK=00000000-0000-0000-0000-0000000000a1
# Plan vocabulary is ['guest','free','initiate'] — asserted by the reviewed primitive,
# not guessed: the first payload used 'monthly' and was refused with PLAN_VOCABULARY.
cat >"$BASE/svc.sql" <<EOF
insert into public.ut_members (id, email, plan, subscription_status, stripe_customer_id, stripe_subscription_id)
  values ('$MEMPK', 'B14AY@Example.com', 'guest', 'inactive', '$CUS', '$SUB')
  on conflict (id) do nothing;
set role service_role;
update public.ut_members set current_period_end = now() where id = '$MEMPK';
select public.apply_lifecycle_update_sync_global(
  '[{"target":"ut_members","linkage":{"customer_id":"$CUS","subscription_ids":["$SUB"]},"intent":"update","seen_pks":["$MEMPK"],"entries":[{"pk":"$MEMPK","original":{"plan":"guest","subscription_status":"inactive","stripe_customer_id":"$CUS","stripe_subscription_id":"$SUB"},"set":{"plan":"initiate","subscription_status":"active","stripe_customer_id":"$CUS","stripe_subscription_id":"$SUB","entitlement_authority_at":"2026-10-13T00:00:00Z"}}]}]'::jsonb);
select plan, subscription_status from public.ut_members where id = '$MEMPK';
EOF
chmod 644 "$BASE/svc.sql"
psql_err "$BASE/svc.sql" >/dev/null 2>&1
chkeq "E1 the direct INSERT/UPDATE and the atomic RPC raise no error as service_role" "0" \
  "$(grep -c ERROR "$BASE/svc.out")"
chkeq "E2 the reviewed primitive raised no BATCH14 refusal" "0" \
  "$(grep -c 'BATCH14' "$BASE/svc.out")"
chkeq "E3 the statement trigger is still ENABLED on both tables" "2" \
  "$(q "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and t.tgname='b14ac_stmt_trg' and t.tgenabled='O'")"
chkeq "E4 the RPC path left the row exactly as intended" "initiate|active" \
  "$(q "select plan || '|' || subscription_status from public.ut_members where lower(btrim(email))=lower(btrim('b14ay@example.com'))")"
cat >"$BASE/svc_sync.sql" <<'EOF'
set role service_role;
select public.apply_lifecycle_update_sync('[]'::jsonb);
EOF
chmod 644 "$BASE/svc_sync.sql"
psql_err "$BASE/svc_sync.sql" >/dev/null 2>&1
if grep -q "permission denied for function apply_lifecycle_update_sync" "$BASE/svc_sync.out"; then
  ok "E5 the withdrawn per-identity variant is refused for service_role (42501)"
else
  bad "E5 service_role was NOT refused on apply_lifecycle_update_sync (observed: $(grep -m1 ERROR "$BASE/svc_sync.out"))"
fi
# Still available to the operator, with a payload that exercises the per-identity
# helper chain (b14ac_linkage_keys_for_payload -> b14ab_linkage_key) under the pin.
cat >"$BASE/op_sync.sql" <<'EOF'
select public.apply_lifecycle_update_sync(
  '[{"target":"ut_members","linkage":{"customer_id":"cus_b14ay","subscription_ids":["sub_b14ay"]},"intent":"update","seen_pks":["00000000-0000-0000-0000-0000000000a1"],"entries":[{"pk":"00000000-0000-0000-0000-0000000000a1","original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":"cus_b14ay","stripe_subscription_id":"sub_b14ay"},"set":{"plan":"initiate","subscription_status":"active"}}]}]'::jsonb);
EOF
chmod 644 "$BASE/op_sync.sql"
psql_err "$BASE/op_sync.sql" >/dev/null 2>&1
chkeq "E6 the per-identity variant still runs for the operator (pinned path resolves)" "0" \
  "$(grep -c ERROR "$BASE/op_sync.out")"

# A direct write by service_role, idempotent and free of the plan vocabulary: it exists
# only to prove the STATEMENT TRIGGER fires and that its INVOKER path is authorized.
cat >"$BASE/direct.sql" <<EOF
set role service_role;
update public.ut_members set current_period_end = now() where id = '$MEMPK';
EOF
chmod 644 "$BASE/direct.sql"

echo ""
echo "== E7-E11: the installer's modes (the rollback step and the unused one) =="
q "select public.b14ac_install_trigger('none')" >/dev/null 2>&1
chkeq "E7 'none' removes both statement triggers (the rollback step)" "0" \
  "$(q "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and t.tgname='b14ac_stmt_trg'")"
q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1
chkeq "E8 'exclusive' restores both, enabled" "2" \
  "$(q "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and t.tgname='b14ac_stmt_trg' and t.tgenabled='O' and p.proname='b14ac_trg_stmt_exclusive'")"
q "select public.b14ac_install_trigger('shared')" >/dev/null 2>&1
chkeq "E9 'shared' installs the shared variant (not the released mode, still supported)" "2" \
  "$(q "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and t.tgname='b14ac_stmt_trg' and p.proname='b14ac_trg_stmt_shared'")"
psql_err "$BASE/direct.sql" >/dev/null 2>&1
chkeq "E10 a direct write still commits under the shared trigger (its body runs)" "0" \
  "$(grep -c ERROR "$BASE/direct.out")"
cat >"$BASE/bogus.sql" <<'EOF'
do $b14ay$
declare v_state text;
begin
  begin
    perform public.b14ac_install_trigger('b14ay-bogus');
  exception when others then v_state := sqlstate;
  end;
  if v_state is null then raise exception 'the unknown mode was NOT refused'; end if;
  if v_state <> '22023' then raise exception 'the unknown mode was refused with % not 22023', v_state; end if;
end
$b14ay$;
EOF
chmod 644 "$BASE/bogus.sql"
psql_err "$BASE/bogus.sql" >/dev/null 2>&1
chkeq "E11 an unknown mode is refused with SQLSTATE 22023" "0" "$(grep -c ERROR "$BASE/bogus.out")"
q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1
chkeq "E12 the released mode is restored at the end" "2" \
  "$(q "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace join pg_proc p on p.oid=t.tgfoid where n.nspname='public' and t.tgname='b14ac_stmt_trg' and t.tgenabled='O' and p.proname='b14ac_trg_stmt_exclusive'")"

# ------------------------------------------------------- F: the grant matters --
echo ""
echo "== F: the granted closure is load-bearing =="
q "revoke all on function public.b14ab_acquire_global_lock(boolean) from service_role" >/dev/null 2>&1
psql_err "$BASE/direct.sql" >/dev/null 2>&1
if grep -q "permission denied for function b14ab_acquire_global_lock" "$BASE/direct.out"; then
  ok "F1 without the grant the released paths FAIL (42501 on the helper)"
else
  bad "F1 revoking the helper's grant did NOT break the direct write (observed: $(grep -m1 ERROR "$BASE/direct.out"))"
fi
q "grant execute on function public.b14ab_acquire_global_lock(boolean) to service_role" >/dev/null 2>&1
psql_err "$BASE/direct.sql" >/dev/null 2>&1
chkeq "F2 restoring the grant restores the direct write" "0" "$(grep -c ERROR "$BASE/direct.out")"

# ------------------------------------------------------- G: the denial matters --
echo ""
echo "== G: the denial is load-bearing =="
# The probe targets the LEAF helper (b14ab_linkage_global_key calls nothing), not the
# lock helper: re-granting PUBLIC on an OUTER helper alone does NOT make it callable,
# because the boundary grants only the release closure and the outer helper's INVOKER
# dependency is itself denied. Using the leaf isolates the ACL under test; the diag
# line below records that two-level behaviour explicitly rather than asserting it.
cat >"$BASE/pub.sql" <<'EOF'
\set VERBOSITY verbose
set role b14ay_public_probe;
select 'session role = ' || current_user as who;
select public.b14ab_linkage_global_key();
EOF
chmod 644 "$BASE/pub.sql"
G_GRANT=$(q "grant execute on function public.b14ab_linkage_global_key() to public")
chkeq "G0a the PUBLIC re-grant itself succeeds" "" "$G_GRANT"
chkeq "G0b the effective privilege is now visible to the PUBLIC-only role" "t" \
  "$(q "select case when has_function_privilege('b14ay_public_probe','public.b14ab_linkage_global_key()','EXECUTE') then 't' else 'f' end")"
echo "  -- G diag --"
q "select 'leaf acl = ' || coalesce(p.proacl::text,'-') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='b14ab_linkage_global_key'"
q "select 'outer-helper eff (denied: its own dependency is not granted) = ' || case when has_function_privilege('b14ay_public_probe','public.b14ab_acquire_global_lock(boolean)','EXECUTE') then 't' else 'f' end"
psql_err "$BASE/pub.sql" >/dev/null 2>&1
if grep -q "ERROR" "$BASE/pub.out"; then
  bad "G1 re-granting PUBLIC did NOT make the helper callable (the denial assertion would not be load-bearing): $(grep -m1 ERROR "$BASE/pub.out")"
else
  ok "G1 with PUBLIC re-granted, a PUBLIC-only role CAN call the helper"
fi
q "revoke all on function public.b14ab_linkage_global_key() from public" >/dev/null 2>&1
psql_err "$BASE/pub.sql" >/dev/null 2>&1
if grep -q "permission denied for function b14ab_linkage_global_key" "$BASE/pub.out"; then
  ok "G2 revoking PUBLIC refuses the PUBLIC-only role again (42501)"
else
  bad "G2 the PUBLIC-only role was still allowed (observed: $(grep -m1 ERROR "$BASE/pub.out"))"
fi

# ---------------------------------------------------------------- H: fail-closed --
echo ""
echo "== H: the prototype DROP is RESTRICT; the boundary fails closed =="
cat >"$BASE/dependent.sql" <<'EOF'
create function public.b14ab_trg_row() returns trigger language plpgsql as $fn$ begin return null; end $fn$;
create trigger b14ay_dependent_trg before insert on public.ut_members
  for each row execute function public.b14ab_trg_row();
EOF
chmod 644 "$BASE/dependent.sql"
psql_ "$BASE/dependent.sql" >"$BASE/dependent.out" 2>&1 || echo "  (dependent fixture setup: $(grep -m1 ERROR "$BASE/dependent.out"))"
H_RC=$(run_boundary)
if [ "$H_RC" != "0" ]; then
  ok "H1 a dependent trigger blocks the prototype DROP — the boundary ABORTS (RESTRICT)"
else
  bad "H1 the boundary removed a depended-on function instead of aborting"
fi
if grep -qiE "cannot drop function.*b14ab_trg_row|depends on function" "$BASE/boundary_run.out"; then
  ok "H2 the abort names the dependency"
else
  bad "H2 the abort did not name the dependency (observed: $(grep -m1 -i error "$BASE/boundary_run.out"))"
fi
q "drop trigger if exists b14ay_dependent_trg on public.ut_members" >/dev/null 2>&1
q "drop function if exists public.b14ab_trg_row()" >/dev/null 2>&1
chkeq "H3 with the dependency gone the boundary applies again" "0" "$(run_boundary)"

echo ""
echo "== I: the complete retained surface was EXERCISED (measured, track_functions=all) =="
echo "  (pg_stat_user_functions counts COMPLETED calls: a call that raised is not counted)"
cat >"$BASE/coverage.sql" <<'EOF'
select p.proname || chr(31) || coalesce(s.calls, 0)::text
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
left join pg_stat_user_functions s on s.funcid = p.oid
where n.nspname = 'public' and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
order by p.proname;
EOF
chmod 644 "$BASE/coverage.sql"
su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/coverage.sql" \
  >"$BASE/coverage.tsv" 2>&1 || { echo "coverage query FAILED"; cat "$BASE/coverage.tsv"; exit 2; }
echo "  measured calls per retained function:"
while IFS= read -r line; do
  [ -n "$line" ] || continue
  nm=${line%%$'\037'*}; calls=${line#*$'\037'}
  printf '    %-34s %s\n' "$nm" "$calls"
  if [ "$calls" -ge 1 ] 2>/dev/null; then ok "I $nm body COMPLETED ($calls call(s) recorded)"; else bad "I $nm completed no call (0 recorded: either never reached, or it raised)"; fi
done <"$BASE/coverage.tsv"

echo ""
echo "== totals: assertions passed: $oks  failed: $fails =="
echo "== diag: $DIAG =="
if [ "$fails" = "0" ]; then echo "BATCH14AY_SURFACE_GATE_PASSED"; else echo "BATCH14AY_SURFACE_GATE_FAILED"; fi
[ "$fails" = "0" ]
