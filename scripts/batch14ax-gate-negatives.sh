#!/usr/bin/env bash
#
# batch14ax-gate-negatives.sh
#
# NEGATIVE CONTROLS for the postflight verdict. A gate that cannot fail is not a
# gate: every case here installs a clean bundle, proves the verdict reads `t`,
# injects ONE drift, and requires the verdict to stop reading `t`. After each case
# the drift is reverted and the verdict must read `t` again — so the harness proves
# both halves: the gate REJECTS the drift, and the clean install PASSES.
#
# Cases:
#   0   clean-install control                        verdict must be t
#   1   table access re-granted to PUBLIC            reject
#   2   column access granted to authenticated       reject   (a table-level check
#                                                             would miss this)
#   3   the statement trigger DISABLED               reject
#   4   the trigger dropped on ONE table             reject   (partial coverage)
#   5   the trigger installed in SHARED mode         reject   (wrong protocol)
#   6   the wrapper exposed to anon                  reject
#   7   RLS disabled on one table                    reject
#   8   the withdrawn read policy re-created         reject
#   9   the authority column dropped                 reject
#   10  a required function signature dropped        reject
#   11  a wrapper re-created DEFINER, no search_path reject
#   12  function ownership moved off postgres        reject
#   F   the clean-install control, restored          verdict must be t
#
# Version-parameterised: PGBIN=/usr/lib/postgresql/17/bin bash <this file> runs the
# whole matrix against PostgreSQL 17, where the privilege lists include MAINTAIN.
#
set -uo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
MIG="$REPO/supabase/migrations"
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PG_MAJOR=$(basename "$(dirname "$PGBIN")")
STAMP=$(date +%s)
BASE=$(mktemp -d /var/tmp/b14ax-gate-XXXXXX)
SOCK="$BASE/sock"
DATA="$BASE/data"
PLOG="$BASE/pg.log"
DIAG="/var/tmp/b14ax-gate-diag-$STAMP"
DB=b14ax
POST="$REPO/scripts/batch14ax-postflight-production.sql"
COMPONENTS="$REPO/scripts/batch14ax-verdict-components.sql"
BATCH13="20261010_membership_access_hardening.sql"
BOUNDARY="20261017_function_surface_boundary.sql"
BUNDLE=(
  "20261010_membership_write_contract.sql"
  "20261012_apply_lifecycle_update.sql"
  "20261013_lifecycle_linkage_sync.sql"
  "20261014_lifecycle_sync_wrapper.sql"
  "20261015_lifecycle_per_entry_skip.sql"
  "20261016_entitlement_authority.sql"
  "20261017_function_surface_boundary.sql"
)

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

[ -f "$POST" ] || { echo "MISSING $POST"; exit 2; }
POST_SHA_BEFORE=$(sha256sum "$POST" | awk '{print $1}')

chown postgres "$BASE"; chmod 755 "$BASE"
mkdir -p "$SOCK"; chown postgres "$SOCK"

echo "== cluster (PostgreSQL $PG_MAJOR) =="
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses=' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }

q()  { su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
qp() { su postgres -c "psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
psql_() { su postgres -c "psql -h $SOCK -d $DB -X -q -v ON_ERROR_STOP=1 -f $1" 2>&1; }
run_file() { cp "$1" "$BASE/$(basename "$1")"; chmod 644 "$BASE/$(basename "$1")"; psql_ "$BASE/$(basename "$1")"; }
# The verdict contract: the postflight's LAST statement is the verdict, so the last
# non-empty line of its unaligned output is what the gate says.
verdict() {
  cp "$POST" "$BASE/post.verdict.sql"; chmod 644 "$BASE/post.verdict.sql"
  : >"$BASE/verdict.out"
  su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/post.verdict.sql" \
    >"$BASE/verdict.out" 2>&1
  local rc=$?
  [ "$rc" != "0" ] && { echo "error:$rc"; return; }
  local lines last
  lines=$(grep -c '[^[:space:]]' "$BASE/verdict.out" || true)
  last=$(tail -1 "$BASE/verdict.out")
  if [ "$lines" = "0" ]; then echo "missing"; return; fi
  if [ -z "$last" ]; then echo "null"; return; fi
  echo "$last"
}
# The parser above is itself a gate: it must tell a FALSE, a NULL and a MISSING
# verdict apart from each other and from a green one.
verdict_of() {  # verdict_of <path> <tag>
  cp "$1" "$BASE/$2.verdict.sql"; chmod 644 "$BASE/$2.verdict.sql"
  : >"$BASE/$2.verdict.out"
  su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/$2.verdict.sql" \
    >"$BASE/$2.verdict.out" 2>&1
  local rc=$?
  [ "$rc" != "0" ] && { echo "error:$rc"; return; }
  local lines last
  lines=$(grep -c '[^[:space:]]' "$BASE/$2.verdict.out" || true)
  last=$(tail -1 "$BASE/$2.verdict.out")
  if [ "$lines" = "0" ]; then echo "missing"; return; fi
  if [ -z "$last" ]; then echo "null"; return; fi
  echo "$last"
}

chkeq "no TCP listener" "0" "$(qp "select count(*) from pg_settings where name='listen_addresses' and setting<>''")"

# ---------------------------------------------------------------- installations --
install_schema() {
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
-- auth.role() too: production's policies are addressed TO public and constrain on it, so
-- the corrected policy condition can only be exercised faithfully if it exists here.
create or replace function auth.role() returns text language sql stable as $$ select current_setting('request.jwt.claim.role', true) $$;
create policy allow_authenticated_read on public.ut_members for select to authenticated using (auth.uid() is not null);
create policy srv_full_access on public.ut_members for all to service_role using (true) with check (true);
alter table public.ut_members enable row level security;
alter table public.profiles   enable row level security;
EOF
  chmod 644 "$BASE/schema.sql"
  su postgres -c "createdb -h $SOCK $DB" >/dev/null 2>&1 || { echo "createdb FAILED"; exit 2; }
  psql_ "$BASE/schema.sql" >"$BASE/schema.out" 2>&1 || { echo "schema FAILED"; cat "$BASE/schema.out"; exit 2; }
}
install_bundle() {
  run_file "$MIG/$BATCH13" >"$BASE/b13.out" 2>&1 || { echo "Batch 13 FAILED"; tail -6 "$BASE/b13.out"; exit 2; }
  for f in "${BUNDLE[@]}"; do
    run_file "$MIG/$f" >"$BASE/$(basename "$f" .sql).out" 2>&1 \
      || { echo "bundle file FAILED: $f"; tail -6 "$BASE/$(basename "$f" .sql).out"; exit 2; }
  done
  q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1 || { echo "trigger install FAILED"; exit 2; }
}

echo "== install: schema + Batch 13 + the bundle + the exclusive trigger =="
install_schema
install_bundle
ok "clean install complete"

expect_verdict() {  # expect_verdict <label> <t|reject>
  local label="$1" want="$2" v
  v=$(verdict)
  if [ "$want" = "t" ]; then
    if [ "$v" = "t" ]; then
      ok "$label — the verdict is t"
    else
      bad "$label — expected a green verdict, got '$v'"
      echo "  -- failing components --"
      run_components | sed 's/^/  /'
    fi
  else
    if [ "$v" = "t" ]; then
      bad "$label — THE DRIFT WAS NOT CAUGHT (verdict still t)"
    else
      ok "$label — rejected (verdict: $v)"
    fi
  fi
}
# The diagnostic is shared with the bundle validator: a red gate must name its
# cause, not just report a boolean.
run_components() {
  [ -f "$COMPONENTS" ] || { echo "(components file missing)"; return; }
  cp "$COMPONENTS" "$BASE/components.sql"; chmod 644 "$BASE/components.sql"
  psql_ "$BASE/components.sql" 2>&1
}

echo ""
echo "== CASE 0: the clean-install control =="
expect_verdict "C0 clean install" t

echo ""
echo "== CASE 1: table access re-granted to PUBLIC =="
q "grant select on public.ut_members to public" >/dev/null 2>&1
expect_verdict "C1 PUBLIC table access" reject
q "revoke all on public.ut_members from public" >/dev/null 2>&1
expect_verdict "C1 reverted" t

echo ""
echo "== CASE 2: COLUMN access granted to authenticated =="
q "grant select (email) on public.ut_members to authenticated" >/dev/null 2>&1
expect_verdict "C2 column access" reject
q "revoke select (email) on public.ut_members from authenticated" >/dev/null 2>&1
expect_verdict "C2 reverted" t

echo ""
echo "== CASE 3: the statement trigger DISABLED =="
q "alter table public.ut_members disable trigger b14ac_stmt_trg" >/dev/null 2>&1
expect_verdict "C3 disabled trigger" reject
q "alter table public.ut_members enable trigger b14ac_stmt_trg" >/dev/null 2>&1
expect_verdict "C3 reverted" t

echo ""
echo "== CASE 4: the trigger dropped on ONE table (partial coverage) =="
q "drop trigger b14ac_stmt_trg on public.profiles" >/dev/null 2>&1
expect_verdict "C4 partial trigger coverage" reject
q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1
expect_verdict "C4 reverted" t

echo ""
echo "== CASE 5: the trigger installed in SHARED mode (wrong protocol) =="
q "select public.b14ac_install_trigger('shared')" >/dev/null 2>&1
expect_verdict "C5 shared-mode trigger" reject
q "select public.b14ac_install_trigger('exclusive')" >/dev/null 2>&1
expect_verdict "C5 reverted" t

echo ""
echo "== CASE 6: the wrapper EXPOSED to anon =="
q "grant execute on function public.apply_lifecycle_update_sync_global(jsonb) to anon" >/dev/null 2>&1
expect_verdict "C6 exposed wrapper" reject
q "revoke all on function public.apply_lifecycle_update_sync_global(jsonb) from anon" >/dev/null 2>&1
expect_verdict "C6 reverted" t

echo ""
echo "== CASE 7: RLS disabled on one table =="
q "alter table public.profiles disable row level security" >/dev/null 2>&1
expect_verdict "C7 RLS drift" reject
q "alter table public.profiles enable row level security" >/dev/null 2>&1
expect_verdict "C7 reverted" t

echo ""
echo "== CASE 8: the withdrawn read policy re-created =="
q "create policy allow_authenticated_read on public.ut_members for select to authenticated using (auth.uid() is not null)" >/dev/null 2>&1
expect_verdict "C8 re-created read policy" reject
q "drop policy allow_authenticated_read on public.ut_members" >/dev/null 2>&1
expect_verdict "C8 reverted" t

echo ""
echo "== CASE 9: the authority column dropped =="
q "alter table public.profiles drop column entitlement_authority_at" >/dev/null 2>&1
expect_verdict "C9 missing authority column" reject
run_file "$MIG/20261016_entitlement_authority.sql" >/dev/null 2>&1
expect_verdict "C9 reverted" t

echo ""
echo "== CASE 10: a required function signature dropped =="
q "drop function public.apply_lifecycle_update_sync(jsonb)" >/dev/null 2>&1
expect_verdict "C10 missing signature" reject
run_file "$MIG/20261014_lifecycle_sync_wrapper.sql" >/dev/null 2>&1
run_file "$MIG/$BOUNDARY" >/dev/null 2>&1   # 20261014 re-grants the per-identity variant; the boundary is the authoritative surface statement
expect_verdict "C10 reverted" t

echo ""
echo "== CASE 11: a wrapper re-created DEFINER with no search_path =="
# Written to a file rather than passed through `psql -c`: the body needs dollar
# quoting, and nested shell quoting silently mangles it — the first version of this
# case ran an empty body, applied nothing, and reported the drift as "not caught".
# The DROP is required because the wrapper is `returns table (...)`: CREATE OR
# REPLACE cannot change a return type, so a stub with a different shape is refused.
cat >"$BASE/c11_inject.sql" <<'EOF'
drop function public.apply_lifecycle_update_sync(jsonb);
create function public.apply_lifecycle_update_sync(p_targets jsonb)
returns table (target text, outcome text, affected integer, located_pks uuid[])
language sql security definer
as $c11$ select null::text, null::text, null::integer, null::uuid[] $c11$;
EOF
chmod 644 "$BASE/c11_inject.sql"
C11_RC=$(psql_ "$BASE/c11_inject.sql" >"$BASE/c11_inject.out" 2>&1; echo $?)
chkeq "C11 the drift is installed (the injection itself succeeds)" "0" "$C11_RC"
if [ "$C11_RC" != "0" ]; then sed -n '1,6p' "$BASE/c11_inject.out"; fi
expect_verdict "C11 wrong security mode / unpinned search_path" reject
q "drop function if exists public.apply_lifecycle_update_sync(jsonb)" >/dev/null 2>&1
run_file "$MIG/20261014_lifecycle_sync_wrapper.sql" >/dev/null 2>&1
run_file "$MIG/$BOUNDARY" >/dev/null 2>&1   # 20261014 re-grants the per-identity variant; the boundary is the authoritative surface statement
expect_verdict "C11 reverted" t

echo ""
echo "== CASE 12: function ownership moved off postgres =="
q "alter function public.apply_lifecycle_update_sync_global(jsonb) owner to service_role" >/dev/null 2>&1
expect_verdict "C12 ownership drift" reject
# FINDING: ALTER FUNCTION ... OWNER TO is NOT ACL-neutral. Moving the owner away and
# back silently drops the service_role EXECUTE grant, so restoring the owner alone
# leaves the function unreachable by the application role. The revert therefore
# re-applies the migration that owns both the owner and the grants, and the ACL is
# asserted explicitly rather than assumed.
q "alter function public.apply_lifecycle_update_sync_global(jsonb) owner to postgres" >/dev/null 2>&1
chkeq "C12 the owner round-trip alone does NOT restore the ACL (the finding)" "f" \
  "$(q "select has_function_privilege('service_role', 'public.apply_lifecycle_update_sync_global(jsonb)', 'EXECUTE')")"
run_file "$MIG/20261014_lifecycle_sync_wrapper.sql" >/dev/null 2>&1
run_file "$MIG/$BOUNDARY" >/dev/null 2>&1   # 20261014 re-grants the per-identity variant; the boundary is the authoritative surface statement
chkeq "C12 re-applying the migration restores the EXECUTE grant" "t" \
  "$(q "select has_function_privilege('service_role', 'public.apply_lifecycle_update_sync_global(jsonb)', 'EXECUTE')")"
expect_verdict "C12 reverted" t

echo ""
echo "== CASE 13: the verdict PARSER itself (false / NULL / missing / error) =="
# A parser that cannot tell these apart is not a gate: a NULL would read as 'no
# output', and a file that stopped early could be mistaken for a pass.
#
# A NULL boolean and an absent verdict BOTH render as whitespace-only unaligned
# output, so the parser cannot — and does not need to — tell them apart: both are
# reported as 'missing' and both are REJECTED. What matters is that neither can
# ever be read as a pass, and that a FALSE verdict is still distinguishable as `f`.
printf 'select null::boolean as verdict;\n' >"$BASE/c13_null.sql"
printf -- '-- no statements at all\n' >"$BASE/c13_missing.sql"
printf 'select true as verdict;\nselect 1/0 as boom;\n' >"$BASE/c13_error.sql"
chmod 644 "$BASE"/c13_*.sql
chkeq "C13 a NULL verdict is REJECTED (reported as missing, never as a pass)" "missing" "$(verdict_of "$BASE/c13_null.sql" c13null)"
chkeq "C13 a file with no verdict is reported as 'missing'" "missing" "$(verdict_of "$BASE/c13_missing.sql" c13missing)"
chkeq "C13 an error before the verdict is reported as an error" "error:3" "$(verdict_of "$BASE/c13_error.sql" c13error)"
printf 'select false as verdict;\n' >"$BASE/c13_false.sql"; chmod 644 "$BASE/c13_false.sql"
chkeq "C13 a FALSE verdict is reported as f" "f" "$(verdict_of "$BASE/c13_false.sql" c13false)"

echo ""
echo "== CASE 14: PUBLIC EXECUTE re-granted on a bundle-owned helper =="
q "grant execute on function public.b14ab_acquire_global_lock(boolean) to public" >/dev/null 2>&1
expect_verdict "C14 PUBLIC EXECUTE on a helper" reject
q "revoke all on function public.b14ab_acquire_global_lock(boolean) from public" >/dev/null 2>&1
expect_verdict "C14 reverted" t

echo ""
echo "== CASE 15: a Batch 14ab prototype function re-created =="
# Written to a file: the body needs dollar quoting, and passing it through `psql -c`
# from inside `su -c` lets the INNER shell expand `$fn` to nothing — the injection then
# fails, nothing is installed, and the case reports the drift as "not caught". Exactly
# the trap C11 hit; both now go through a file and assert that the injection SUCCEEDED.
cat >"$BASE/c15_proto.sql" <<'EOF'
create function public.b14ab_trg_row() returns trigger language plpgsql as $fn$ begin return null; end $fn$;
EOF
chmod 644 "$BASE/c15_proto.sql"
C15_RC=$(psql_ "$BASE/c15_proto.sql" >"$BASE/c15_proto.out" 2>&1; echo $?)
chkeq "C15 the drift is installed (the injection itself succeeds)" "0" "$C15_RC"
if [ "$C15_RC" != "0" ]; then sed -n '1,4p' "$BASE/c15_proto.out"; fi
expect_verdict "C15 a prototype function present again" reject
run_file "$MIG/$BOUNDARY" >/dev/null 2>&1   # the boundary itself is the revert: it DROPs it
expect_verdict "C15 reverted (the boundary drops it again)" t

echo ""
echo "== CASE 16: service_role's grant on a required helper revoked =="
q "revoke all on function public.b14ab_acquire_global_lock(boolean) from service_role" >/dev/null 2>&1
expect_verdict "C16 the release closure broken" reject
run_file "$MIG/$BOUNDARY" >/dev/null 2>&1   # the boundary GRANTs the closure
expect_verdict "C16 reverted" t

echo ""
echo "== CASE 17: a bundle helper's search_path unpinned =="
q "alter function public.b14ac_trg_stmt_exclusive() reset search_path" >/dev/null 2>&1
expect_verdict "C17 an unpinned helper" reject
run_file "$MIG/$BOUNDARY" >/dev/null 2>&1   # the boundary re-pins it
expect_verdict "C17 reverted" t

echo ""
echo "== CASE 18: a policy addressed TO public with NO service_role constraint =="
# The corrected condition must still FAIL here: this is the shape that actually grants.
cat >"$BASE/c18.sql" <<'EOF'
create policy b14ay_open_policy on public.ut_members for select to public using (true);
EOF
chmod 644 "$BASE/c18.sql"
C18_RC=$(psql_ "$BASE/c18.sql" >"$BASE/c18.out" 2>&1; echo $?)
chkeq "C18 the drift is installed (the injection itself succeeds)" "0" "$C18_RC"
if [ "$C18_RC" != "0" ]; then sed -n '1,4p' "$BASE/c18.out"; fi
expect_verdict "C18 an open policy for PUBLIC" reject
q "drop policy if exists b14ay_open_policy on public.ut_members" >/dev/null 2>&1
expect_verdict "C18 reverted" t

echo ""
echo "== CASE 19: a policy TO public that CONSTRAINS to service_role (production's shape) =="
# The other direction: this must NOT be reported as a violation. Without this control the
# relaxation in CASE 18 would be untested in the direction that matters — a gate that
# rejects a correct production boundary blocks the rollout for a non-defect.
cat >"$BASE/c19.sql" <<'EOF'
create policy b14ay_srv_policy on public.ut_members for all to public
  using (auth.role() = 'service_role') with check (auth.role() = 'service_role');
EOF
chmod 644 "$BASE/c19.sql"
C19_RC=$(psql_ "$BASE/c19.sql" >"$BASE/c19.out" 2>&1; echo $?)
chkeq "C19 the production-shaped policy is installed (the injection itself succeeds)" "0" "$C19_RC"
if [ "$C19_RC" != "0" ]; then sed -n '1,4p' "$BASE/c19.out"; fi
expect_verdict "C19 a service_role policy addressed TO public" t
q "drop policy if exists b14ay_srv_policy on public.ut_members" >/dev/null 2>&1
expect_verdict "C19 reverted" t

echo ""
echo "== FINAL: the clean-install control, restored =="
expect_verdict "final clean install" t
chkeq "the postflight is unmodified by the whole matrix" "$POST_SHA_BEFORE" "$(sha256sum "$POST" | awk '{print $1}')"

echo ""
echo "assertions passed: $oks  failed: $fails"
if [ "$fails" -gt 0 ]; then echo "BATCH14AX_GATE_NEGATIVES_FAILED"; exit 1; fi
echo "BATCH14AX_GATE_NEGATIVES_PASSED"
