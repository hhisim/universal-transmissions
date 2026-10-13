#!/usr/bin/env bash
#
# batch14az-boundary-default-acl-regression.sh
#
# FOCUSED REGRESSION for the Batch 14 function boundary against DEFAULT FUNCTION ACLs.
#
# WHY THIS EXISTS
# The boundary (`20261017_function_surface_boundary.sql`) revoked PUBLIC, anon and
# authenticated on all 17 bundle-owned functions and granted `service_role` the release
# closure — but it never WITHDREW `service_role` from the survivors outside that closure.
# In a private cluster that is sufficient, because a function's default ACL there is
# `{=X/owner, owner=X/owner}`: with PUBLIC revoked, `service_role` holds nothing. On
# Supabase it is NOT sufficient: `pg_default_acl` in `public` grants EXECUTE on functions
# to anon, authenticated AND `service_role` (two rows, owned by `supabase_admin` and
# `postgres`), so an EXPLICIT `service_role` grant survives the revoke, the surface stays
# wider than the closure, and the boundary's own final assertion aborts — rolling the whole
# boundary back and leaving the pre-boundary surface exposed. That is what happened on
# production at step 8 of the installation; no isolated run could have shown it, because
# no isolated run had production's default privileges.
#
# WHAT THIS PROVES, under BOTH default-ACL regimes:
#   1. the PRE-REPAIR boundary reproduces the production abort when the default privileges
#      grant `service_role` — and passes when they do not (the portability gap itself);
#   2. the REPAIRED boundary applies, then RE-APPLIES (idempotent), under both regimes;
#   3. the retained surface is exactly the ten functions, with `service_role` EXECUTE on
#      the four-function release closure and on nothing else, and PUBLIC/anon/authenticated
#      holding nothing;
#   4. the postflight verdict reads `t`;
#   5. the rollback-only `service_role` smoke passes with BOTH post-conditions true.
#
# Usage:
#   PGBIN=/usr/lib/postgresql/17/bin bash scripts/batch14az-boundary-default-acl-regression.sh
#   B14AZ_REGIMES="production" ... (default: both, "ordinary production")
#
set -uo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
MIG="$REPO/supabase/migrations"
PGBIN=${PGBIN:-/usr/lib/postgresql/17/bin}
PG_MAJOR=$(basename "$(dirname "$PGBIN")")
REGIMES=${B14AZ_REGIMES:-"ordinary production"}
STAMP=$(date +%s)
BASE=$(mktemp -d /var/tmp/b14az-regress-XXXXXX)
DIAG="/var/tmp/b14az-regress-diag-$STAMP"
DB=b14az

# The boundary as it stood BEFORE the repair — the artifact that failed on production.
# Fixed on purpose: a regression's baseline is a known-bad artifact.
PRE_REPAIR_CANDIDATE=44c5a0f62ddae613fd10e13e0312ea612da5c398
# The pre-repair boundary's blob, from the release record. Whatever source is used, the
# baseline is ATTESTED against it — a regression that silently tests the wrong file proves
# nothing. Source order: $B14AZ_PRE_REPAIR_BOUNDARY, then the repo's own history.
PRE_REPAIR_BLOB=878af9c7d8c44d969497ffbda6462b391bc5605c

resolve_pre_repair() {  # -> $BASE/pre_repair_boundary.sql, or a non-zero status
  local out="$BASE/pre_repair_boundary.sql"
  if [ -n "${B14AZ_PRE_REPAIR_BOUNDARY:-}" ] && [ -f "$B14AZ_PRE_REPAIR_BOUNDARY" ]; then
    cp "$B14AZ_PRE_REPAIR_BOUNDARY" "$out"
  elif git -C "$REPO" cat-file -e "$PRE_REPAIR_CANDIDATE:supabase/migrations/20261017_function_surface_boundary.sql" 2>/dev/null; then
    git -C "$REPO" show "$PRE_REPAIR_CANDIDATE:supabase/migrations/20261017_function_surface_boundary.sql" >"$out" 2>/dev/null
  else
    return 1
  fi
  [ "$(git hash-object "$out" 2>/dev/null)" = "$PRE_REPAIR_BLOB" ] || return 2
  return 0
}

BOUNDARY="$MIG/20261017_function_surface_boundary.sql"
BATCH13="$MIG/20261010_membership_access_hardening.sql"
POST="$REPO/scripts/batch14ax-postflight-production.sql"
SMOKE_SRC="$REPO/scripts/batch14ay-service-role-smoke.sql"
BUNDLE=(
  "20261010_membership_write_contract.sql"
  "20261012_apply_lifecycle_update.sql"
  "20261013_lifecycle_linkage_sync.sql"
  "20261014_lifecycle_sync_wrapper.sql"
  "20261015_lifecycle_per_entry_skip.sql"
  "20261016_entitlement_authority.sql"
)

fails=0
oks=0
ok()   { echo "    ok   $1"; oks=$((oks+1)); }
bad()  { echo "    FAIL $1"; fails=$((fails+1)); }
chkeq(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', observed '$3')"; fi; }
chkne(){ if [ "$2" != "$3" ]; then ok "$1"; else bad "$1 (expected anything but '$3')"; fi; }

for f in "$BOUNDARY" "$BATCH13" "$POST" "$SMOKE_SRC"; do
  [ -f "$f" ] || { echo "MISSING $f"; exit 2; }
done

# ------------------------------------------------------------------ harness state --
R=""
SOCK=""; DATA=""; PLOG=""
q()   { su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
qraw(){ su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
psql_() { su postgres -c "psql -h $SOCK -d $DB -X -q -v ON_ERROR_STOP=1 -f $1" 2>&1; }
# Unaligned + tuples-only for anything that must be PARSED (the verdict, the smoke's
# post-conditions): the aligned form's last non-empty line is the row-count footer.
psql_at() { su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $1" 2>&1; }
run_file() {  # run_file <path> <tag>  -> writes $R/<tag>.out, echoes the psql exit code
  local src="$1" tag="$2"
  cp "$src" "$R/$tag.sql"; chmod 644 "$R/$tag.sql"
  su postgres -c "psql -h $SOCK -d $DB -X -q -v ON_ERROR_STOP=1 -f $R/$tag.sql" >"$R/$tag.out" 2>&1
  echo $?
}

cleanup() {
  mkdir -p "$DIAG" 2>/dev/null
  for d in "$BASE"/*/; do [ -d "$d" ] && cp -f "$d"/*.sql "$d"/*.out 2>/dev/null; done
  for d in "$BASE"/*/; do
    [ -f "$d/data/PG_VERSION" ] && su postgres -c "$PGBIN/pg_ctl -D $d/data -m immediate stop" >/dev/null 2>&1
  done
  cp -f "$BASE"/*/*.out "$DIAG"/ 2>/dev/null
  rm -rf "$BASE" 2>/dev/null
}
trap cleanup EXIT INT TERM HUP

chown postgres "$BASE"; chmod 755 "$BASE"

# --------------------------------------------------------------------- one regime --
run_regime() {
  local regime="$1"
  R="$BASE/$regime"; mkdir -p "$R"; chown postgres "$R"; chmod 755 "$R"
  SOCK="$R/sock"; DATA="$R/data"; PLOG="$R/pg.log"
  mkdir -p "$SOCK"; chown postgres "$SOCK"

  echo ""
  echo "=============================================================="
  echo "== regime: $regime  (PostgreSQL $PG_MAJOR)"
  echo "=============================================================="

  su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$R/initdb.log" 2>&1 \
    || { echo "  initdb FAILED"; tail -5 "$R/initdb.log"; return; }
  su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses=' -l $PLOG -w start" >"$R/ctl.log" 2>&1 \
    || { echo "  start FAILED"; tail -5 "$PLOG"; return; }

  # ------------------------------------------------------------------ fixture ----
  cat >"$R/schema.sql" <<'EOF'
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
create or replace function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
create policy allow_authenticated_read on public.ut_members for select to authenticated using (auth.uid() is not null);
create policy srv_full_access on public.ut_members for all to service_role using (true) with check (true);
alter table public.ut_members enable row level security;
alter table public.profiles   enable row level security;
EOF
  if [ "$regime" = "production" ]; then
    # The exact production default privileges, on the role that creates the bundle's
    # objects (postgres), in the schema they land in. Read from pg_default_acl on the
    # project database; see docs/BATCH14AZ-*.md.
    cat >>"$R/schema.sql" <<'EOF'
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
EOF
  fi
  chmod 644 "$R/schema.sql"
  su postgres -c "createdb -h $SOCK $DB" >/dev/null 2>&1 || { echo "  createdb FAILED"; return; }
  if ! psql_ "$R/schema.sql" >"$R/schema.out" 2>&1; then echo "  fixture FAILED"; tail -6 "$R/schema.out"; return; fi

  local dacl
  dacl=$(q "select count(*) from pg_default_acl d join pg_namespace n on n.oid = d.defaclnamespace where n.nspname='public' and d.defaclobjtype='f'")
  chkeq "fixture: public FUNCTION default-ACL rows = $([ "$regime" = production ] && echo '1 (production-shaped)' || echo '0 (ordinary)')" \
        "$([ "$regime" = production ] && echo 1 || echo 0)" "$dacl"

  # ------------------------------------------------------- Bundle 13 + 1..6 ------
  local rc
  rc=$(run_file "$BATCH13" "b13"); chkeq "Batch 13 applies" "0" "$rc"
  for f in "${BUNDLE[@]}"; do
    rc=$(run_file "$MIG/$f" "$(basename "$f" .sql)"); chkeq "$f applies" "0" "$rc"
  done
  q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1
  chkeq "the exclusive statement trigger is installed" "exclusive" \
        "$(q "select public.b14ac_install_trigger('exclusive')")"
  chkeq "pre-boundary: 13 bundle functions carry PUBLIC EXECUTE" "13" \
        "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
               where n.nspname='public' and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
                 and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
                              where a.grantee=0 and a.privilege_type='EXECUTE')")"

  # ---------------------------------------- 1. the PRE-REPAIR boundary ----------
  echo "    -- the boundary as it was, before the repair --"
  local prc=0
  resolve_pre_repair || prc=$?
  if [ "$prc" = "0" ]; then
    cp "$BASE/pre_repair_boundary.sql" "$R/pre_repair_boundary.sql"
    rc=$(run_file "$R/pre_repair_boundary.sql" "pre_repair")
    if [ "$regime" = "production" ]; then
      chkne "the pre-repair boundary FAILS under production-shaped default ACLs (reproduces the incident)" "$rc" "0"
      if grep -q "surface not as intended" "$R/pre_repair.out"; then
        ok "  ...and its abort names the surface it could not reach"
      else
        bad "  ...its abort message is not the expected one: $(grep -m1 -i 'error' "$R/pre_repair.out")"
      fi
      local flagged
      flagged=$(grep -o "b14ab_linkage_key(service_role grant)\|b14ac_install_trigger(service_role grant)\|b14ac_linkage_keys_for_payload(service_role grant)\|b14ac_trg_stmt_exclusive(service_role grant)\|b14ac_trg_stmt_shared(service_role grant)" "$R/pre_repair.out" | wc -l)
      chkeq "  ...naming exactly the five unrevoked service_role grants" "5" "$flagged"
    else
      chkeq "the pre-repair boundary PASSES under ordinary defaults (the portability gap this regression exists for)" "0" "$rc"
    fi
    # In the ordinary regime the pre-repair boundary SUCCEEDS, so the surface legitimately
    # changes (13 -> 0 PUBLIC-executable). Under production-shaped defaults it aborts and
    # rolls back, so those 13 are still PUBLIC-executable — the exposure the incident left
    # behind, and the reason this repair is not cosmetic.
    local expect_public
    expect_public=$([ "$regime" = "production" ] && echo 13 || echo 0)
    chkeq "  ...surface after it: $([ "$regime" = "production" ] && echo 'unchanged — 13 still PUBLIC-executable (it rolled back)' || echo 'restricted — 0 PUBLIC-executable (it applied)')" \
      "$expect_public" \
      "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
             where n.nspname='public' and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
               and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
                            where a.grantee=0 and a.privilege_type='EXECUTE')")"
  else
    if [ "$prc" = "1" ]; then
      bad "cannot obtain the pre-repair boundary: set B14AZ_PRE_REPAIR_BOUNDARY=<path> or run from a clone with $PRE_REPAIR_CANDIDATE"
    else
      bad "the pre-repair boundary supplied does not match blob $PRE_REPAIR_BLOB — refusing to test an unattested baseline"
    fi
  fi

  # --------------------------------------------- 2. the REPAIRED boundary -------
  echo "    -- the repaired boundary --"
  rc=$(run_file "$BOUNDARY" "boundary1"); chkeq "applies (initial application)" "0" "$rc"
  if [ "$rc" != "0" ]; then tail -6 "$R/boundary1.out" | sed 's/^/      /'; return; fi
  rc=$(run_file "$BOUNDARY" "boundary2"); chkeq "re-applies (idempotent, not merely tolerable)" "0" "$rc"

  # ------------------------------------------------------ 3. the surface --------
  local sig expected
  while read -r sig expected; do
    chkeq "service_role EXECUTE on $sig = $expected" "$expected" \
      "$(q "select has_function_privilege('service_role', 'public.$sig'::regprocedure, 'EXECUTE')")"
  done <<'EOF'
apply_lifecycle_update(jsonb) t
apply_lifecycle_update_sync(jsonb) f
apply_lifecycle_update_sync_global(jsonb) t
b14ab_acquire_global_lock(boolean) t
b14ab_linkage_global_key() t
b14ab_linkage_key(text,text) f
b14ac_install_trigger(text) f
b14ac_linkage_keys_for_payload(jsonb) f
b14ac_trg_stmt_exclusive() f
b14ac_trg_stmt_shared() f
EOF
  chkeq "no bundle-owned function is reachable by anon" "0" \
    "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
             and has_function_privilege('anon', p.oid, 'EXECUTE')")"
  chkeq "no bundle-owned function is reachable by authenticated" "0" \
    "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
             and has_function_privilege('authenticated', p.oid, 'EXECUTE')")"
  chkeq "no bundle-owned function carries a PUBLIC EXECUTE grant" "0" \
    "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
             and exists (select 1 from aclexplode(coalesce(p.proacl, acldefault('f',p.proowner))) a
                          where a.grantee=0 and a.privilege_type='EXECUTE')")"
  chkeq "the seven Batch 14ab prototypes are absent" "0" \
    "$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace
           where n.nspname='public' and p.proname in ('b14ab_install_trigger','b14ab_trg_row','b14ab_trg_stmt',
             'b14ab_lifecycle_apply','b14ab_lifecycle_apply_nosync','b14ab_acquire_linkage_locks','b14ab_linkage_keys')")"

  # ----------------------------------------------------- 4. the postflight ------
  cp "$POST" "$R/postflight.sql"; chmod 644 "$R/postflight.sql"
  psql_at "$R/postflight.sql" >"$R/postflight.out" 2>&1
  rc=$?
  chkeq "the postflight runs to completion" "0" "$rc"
  local verdict
  verdict=$(grep -v '^[[:space:]]*$' "$R/postflight.out" | tail -1 | tr -d '[:space:]')
  chkeq "the postflight verdict is t" "t" "$verdict"

  # --------------------------------------------------------- 5. the smoke --------
  grep -v '^\\set' "$SMOKE_SRC" >"$R/smoke.sql"; chmod 644 "$R/smoke.sql"
  local mem_before prof_before
  mem_before=$(q "select count(*) from public.ut_members")
  prof_before=$(q "select count(*) from public.profiles")
  psql_at "$R/smoke.sql" >"$R/smoke.out" 2>&1
  rc=$?
  chkeq "the smoke exits cleanly" "0" "$rc"
  chkeq "  ...nothing persisted in ut_members (post-condition true)" "t" \
    "$(grep '^nothing_persisted_in_ut_members' "$R/smoke.out" | awk -F'|' '{print $2}' | tr -d ' ')"
  chkeq "  ...nothing persisted in profiles (post-condition true)" "t" \
    "$(grep '^nothing_persisted_in_profiles' "$R/smoke.out" | awk -F'|' '{print $2}' | tr -d ' ')"
  chkeq "  ...nothing persisted (row counts unchanged)" "$mem_before|$prof_before" \
    "$(q "select count(*) from public.ut_members")|$(q "select count(*) from public.profiles")"
  if grep -q "SMOKE OK" "$R/smoke.out"; then ok "  ...the smoke's own assertions passed (no Stripe, no network)"; else bad "  ...the smoke did not report OK"; fi
}

for regime in $REGIMES; do run_regime "$regime"; done

echo ""
echo "=============================================================="
echo "assertions passed: $oks  failed: $fails"
echo "diag: $DIAG"
if [ "$fails" = "0" ]; then echo "BATCH14AZ_DEFAULT_ACL_REGRESSION_PASSED"; exit 0;
else echo "BATCH14AZ_DEFAULT_ACL_REGRESSION_FAILED"; exit 1; fi
