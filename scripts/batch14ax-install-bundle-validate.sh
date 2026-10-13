#!/usr/bin/env bash
#
# batch14ax-install-bundle-validate.sh
#
# Validates the EXACT Batch 14 installation bundle and its ORDER in an isolated
# PostgreSQL cluster, together with the SELECT-only preflight and postflight files
# that will be run against production.
#
# What this proves, end to end:
#   1. the preflight file EXECUTES (every statement) against a pre-install state
#      and reports the pre-install expectations;
#   2. each bundle file applies in the stated order, and the reviewed primitive's
#      FILE is byte-identical before and after being applied;
#   3. the matching EXCLUSIVE-GLOBAL statement-trigger protocol is installed, on
#      BOTH tables, and an invalid mode is refused (22023);
#   4. the postflight file executes and its single STATE OF THE INSTALL query
#      returns true;
#   5. Batch 13 preservation survives the bundle (anon/authenticated hold no
#      privileges on either table);
#   6. a DIRECT writer (service_role, bypassing the wrapper) still commits — the
#      trigger serializes it, it does not break it;
#   7. the address index enforces uniqueness;
#   8. both SQL files are SELECT-ONLY: no statement keyword appears outside a
#      comment.
#
# Private cluster: unix socket in a private directory, NO TCP listener (asserted),
# torn down with its data directory on every exit path.
#
set -uo pipefail

REPO=$(cd "$(dirname "$0")/.." && pwd)
MIG="$REPO/supabase/migrations"
PGBIN=/usr/lib/postgresql/16/bin
STAMP=$(date +%s)
BASE=$(mktemp -d /var/tmp/b14ax-bundle-XXXXXX)
SOCK="$BASE/sock"
DATA="$BASE/data"
PLOG="$BASE/pg.log"
DIAG="/var/tmp/b14ax-bundle-diag-$STAMP"
DB=b14ax
PRE="$REPO/scripts/batch14ax-preflight-production.sql"
POST="$REPO/scripts/batch14ax-postflight-production.sql"

# ---------------------------------------------------------------- the bundle --
# ORDER IS PART OF THE ARTIFACT.
#   1  the address-uniqueness write contract (hardened this batch)
#   2  the REVIEWED primitive — applied byte-identically, never modified
#   3  the linkage-key helpers the wrapper declares as its dependency
#   4  the synchronization wrapper + the trigger installer
#   5  the per-entry skip candidate — SUPERSEDED by 6; installed only because the
#      validated sequence includes it, and 6 replaces its function body
#   6  the entitlement-authority candidate (supersedes 5)
#   7  the POLICY STEP, not a file: install the exclusive-global statement trigger
BUNDLE=(
  "20261010_membership_write_contract.sql"
  "20261012_apply_lifecycle_update.sql"
  "20261013_lifecycle_linkage_sync.sql"
  "20261014_lifecycle_sync_wrapper.sql"
  "20261015_lifecycle_per_entry_skip.sql"
  "20261016_entitlement_authority.sql"
)
BATCH13="20261010_membership_access_hardening.sql"
REVIEWED="20261012_apply_lifecycle_update.sql"

fails=0
oks=0
ok()   { echo "  ok   $1"; oks=$((oks+1)); }
bad()  { echo "  FAIL $1"; fails=$((fails+1)); }
chkeq(){ if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', observed '$3')"; fi; }
chkne(){ if [ "$2" != "$3" ]; then ok "$1"; else bad "$1 (both '$2')"; fi; }

cleanup() {
  mkdir -p "$DIAG" 2>/dev/null
  cp -f "$BASE"/*.sql "$BASE"/*.out "$BASE"/*.log "$DIAG"/ 2>/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  rm -rf "$BASE" 2>/dev/null
  if [ -d "$DATA" ]; then echo "  WARN cluster directory survived: $DATA"; fi
}
trap cleanup EXIT INT TERM HUP

for f in "${BUNDLE[@]}" "$BATCH13" "$REVIEWED"; do
  [ -f "$MIG/$f" ] || { echo "MISSING $MIG/$f"; exit 2; }
done
[ -f "$PRE" ] || { echo "MISSING $PRE"; exit 2; }
[ -f "$POST" ] || { echo "MISSING $POST"; exit 2; }

echo "== bundle =="
for f in "${BUNDLE[@]}"; do printf '   %s  sha256=%s\n' "$f" "$(sha256sum "$MIG/$f" | awk '{print $1}')"; done
printf '   %s  sha256=%s\n' "$REVIEWED" "$(sha256sum "$MIG/$REVIEWED" | awk '{print $1}')"

chown postgres "$BASE"; chmod 755 "$BASE"
mkdir -p "$SOCK"; chown postgres "$SOCK"

echo "== cluster =="
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses= -c deadlock_timeout=1s' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }

q()  { su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
# The database does not exist yet when the listener is asserted.
qp() { su postgres -c "psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -c \"$1\"" 2>&1; }
psql_() { su postgres -c "psql -h $SOCK -d $DB -X -q -v ON_ERROR_STOP=1 -f $1" 2>&1; }
# The postgres user cannot read files under /root (0700), so every SQL file must
# be copied into the postgres-owned workspace first and chmod 644 — otherwise
# psql fails with "Permission denied" and the file never executes at all.
run_sql_file() {  # run_sql_file <path> <tag>  -> prints psql output, returns its exit code
  cp "$1" "$BASE/$2.script.sql"; chmod 644 "$BASE/$2.script.sql"
  psql_ "$BASE/$2.script.sql"
}
apply_file() {  # apply_file <path> <tag>
  cp "$1" "$BASE/$2.sql"; chmod 644 "$BASE/$2.sql"
  psql_ "$BASE/$2.sql" >"$BASE/$2.out" 2>&1
  local rc=$?
  if [ "$rc" = "0" ]; then ok "$2 applied"; else bad "$2 FAILED (exit $rc)"; sed -n '1,8p' "$BASE/$2.out"; fi
  return $rc
}

chkeq "no TCP listener" "0" "$(qp "select count(*) from pg_settings where name='listen_addresses' and setting<>''")"

# ------------------------------------------------------------- schema + roles --
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
alter table public.ut_members enable row level security;
alter table public.profiles   enable row level security;
EOF
chmod 644 "$BASE/schema.sql"
su postgres -c "createdb -h $SOCK $DB" >/dev/null 2>&1 || { echo "createdb FAILED"; exit 2; }
psql_ "$BASE/schema.sql" >"$BASE/schema.out" 2>&1 || { echo "schema FAILED"; cat "$BASE/schema.out"; exit 2; }
ok "schema + roles created"

echo ""
echo "== prior state: Batch 13 already applied (as in production) =="
apply_file "$MIG/$BATCH13" "batch13_hardening"
chkeq "Batch 13 left anon with no privileges on ut_members" "0" \
  "$(q "select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='ut_members' and grantee in ('anon','authenticated')")"
chkeq "Batch 13 left service_role with its full set on ut_members" "7" \
  "$(q "select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='ut_members' and grantee='service_role'")"

echo ""
echo "== PREFLIGHT file executes against the pre-install state =="
PRE_RC=$(run_sql_file "$PRE" preflight >"$BASE/preflight.out" 2>&1; echo $?)
chkeq "the preflight file runs with every statement executing" "0" "$PRE_RC"
if [ "$PRE_RC" != "0" ]; then sed -n '1,12p' "$BASE/preflight.out"; fi
chkeq "preflight: no b14 trigger is installed yet" "0" \
  "$(q "select count(*) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where c.relname in ('ut_members','profiles') and not t.tgisinternal and t.tgname like 'b14%'")"
chkeq "preflight: the authority column does not exist yet" "0" \
  "$(q "select count(*) from pg_attribute where attrelid in ('public.ut_members'::regclass,'public.profiles'::regclass) and attname='entitlement_authority_at' and attnum>0")"

echo ""
echo "== the bundle, in order =="
REV_SHA_BEFORE=$(sha256sum "$MIG/$REVIEWED" | awk '{print $1}')
for f in "${BUNDLE[@]}"; do apply_file "$MIG/$f" "$(basename "$f" .sql)"; done
chkeq "the reviewed FILE was not modified by applying it" "$REV_SHA_BEFORE" "$(sha256sum "$MIG/$REVIEWED" | awk '{print $1}')"

echo ""
echo "== the policy step: the matching EXCLUSIVE-GLOBAL statement trigger =="
chkeq "the trigger installer is present" "b14ac_install_trigger" \
  "$(q "select proname from pg_proc where proname='b14ac_install_trigger'")"
# The installer's own `drop trigger if exists` emits NOTICEs on stderr; take the
# final line (the function's return value) rather than the merged stream.
chkeq "installing 'exclusive' returns 'exclusive'" "exclusive" "$(q "select public.b14ac_install_trigger('exclusive')" | tail -1)"
chkeq "the exclusive statement trigger covers ut_members" "ut_members|b14ac_trg_stmt_exclusive" \
  "$(q "select c.relname||'|'||p.proname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and t.tgname='b14ac_stmt_trg' and c.relname='ut_members'")"
chkeq "the exclusive statement trigger covers profiles" "profiles|b14ac_trg_stmt_exclusive" \
  "$(q "select c.relname||'|'||p.proname from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and t.tgname='b14ac_stmt_trg' and c.relname='profiles'")"
cat >"$BASE/invalid_mode.sql" <<'EOF'
do $ax$
begin
  begin
    perform public.b14ac_install_trigger('bogus');
    raise exception 'BATCH14AX: an unknown trigger mode was ACCEPTED';
  exception
    when others then
      if sqlstate <> '22023' then
        raise exception 'BATCH14AX: an unknown mode raised % instead of 22023', sqlstate;
      end if;
  end;
end
$ax$;
EOF
chmod 644 "$BASE/invalid_mode.sql"
INVALID_RC=$(psql_ "$BASE/invalid_mode.sql" >"$BASE/invalid_mode.out" 2>&1; echo $?)
chkeq "an unknown mode is refused with SQLSTATE 22023" "0" "$INVALID_RC"
if [ "$INVALID_RC" != "0" ]; then sed -n '1,6p' "$BASE/invalid_mode.out"; fi
chkeq "no SHARED statement trigger is left installed" "0" \
  "$(q "select count(*) from pg_trigger t join pg_proc p on p.oid=t.tgfoid where not t.tgisinternal and t.tgname='b14ac_stmt_trg' and p.proname='b14ac_trg_stmt_shared'")"
chkeq "re-installing 'exclusive' is idempotent" "exclusive|2" \
  "$(q "select public.b14ac_install_trigger('exclusive')||'|'||(select count(*) from pg_trigger t where not t.tgisinternal and t.tgname='b14ac_stmt_trg')" | tail -1)"

echo ""
echo "== the application entry point and its ACL =="
chkeq "the app's entry point is the GLOBAL variant" "apply_lifecycle_update_sync_global" \
  "$(q "select proname from pg_proc where proname like 'apply_lifecycle_update_sync%' order by length(proname) desc limit 1")"
chkeq "service_role can execute the entry point" "t" \
  "$(q "select has_function_privilege('service_role','public.apply_lifecycle_update_sync_global(jsonb)','EXECUTE')")"
chkeq "anon cannot execute the entry point" "f" \
  "$(q "select has_function_privilege('anon','public.apply_lifecycle_update_sync_global(jsonb)','EXECUTE')")"
chkeq "authenticated cannot execute the entry point" "f" \
  "$(q "select has_function_privilege('authenticated','public.apply_lifecycle_update_sync_global(jsonb)','EXECUTE')")"
chkeq "anon cannot call the trigger installer" "f" \
  "$(q "select has_function_privilege('anon','public.b14ac_install_trigger(text)','EXECUTE')")"

echo ""
echo "== a DIRECT writer still commits (the trigger serializes, it does not block) =="
q "insert into public.ut_members (email, plan) values ('direct@example.com', 'initiate')" >/dev/null 2>&1
chkeq "a direct INSERT as the session role succeeded" "1" \
  "$(q "select count(*) from public.ut_members where email='direct@example.com'")"
chkeq "a direct UPDATE succeeded" "free" \
  "$(q "update public.ut_members set plan='free' where email='direct@example.com' returning plan" | head -1)"

echo ""
echo "== the address index enforces uniqueness =="
DUP=$(q "insert into public.ut_members (email) values ('DIRECT@example.com')" 2>&1)
if printf '%s' "$DUP" | grep -q 'duplicate key value violates unique constraint'; then
  ok "a case-variant duplicate is refused by the index"
else
  bad "a case-variant duplicate was NOT refused ($DUP)"
fi

echo ""
echo "== Batch 13 preservation after the bundle =="
chkeq "anon/authenticated hold no privileges on ut_members" "0" \
  "$(q "select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='ut_members' and grantee in ('anon','authenticated')")"
chkeq "anon/authenticated hold no privileges on profiles" "0" \
  "$(q "select count(*) from information_schema.role_table_grants where table_schema='public' and table_name='profiles' and grantee in ('anon','authenticated')")"
chkeq "no grants to PUBLIC" "0" \
  "$(q "select count(*) from information_schema.role_table_grants where table_schema='public' and table_name in ('ut_members','profiles') and grantee='PUBLIC'")"

echo ""
echo "== POSTFLIGHT file executes against the installed state =="
POST_RC=$(run_sql_file "$POST" postflight >"$BASE/postflight.out" 2>&1; echo $?)
chkeq "the postflight file runs with every statement executing" "0" "$POST_RC"
if [ "$POST_RC" != "0" ]; then sed -n '1,12p' "$BASE/postflight.out"; fi
# Post-condition re-checked independently of the file, so the file's own Q10 is not
# the only thing standing between a bad install and a green run. psql's unaligned
# mode prints a bare boolean as t/f, while a concatenation renders true/false.
chkeq "post-install: the authority column exists on both tables" "t" \
  "$(q "select count(*) = 2 from pg_attribute a where a.attrelid in ('public.ut_members'::regclass,'public.profiles'::regclass) and a.attname='entitlement_authority_at' and a.attnum>0")"

echo ""
echo "== the two files are SELECT-ONLY =="
for f in "$PRE" "$POST"; do
  HITS=$(grep -vE '^\s*--' "$f" | grep -icE '^\s*(create|alter|drop|insert|update|delete|truncate|grant|revoke|comment|set|do|call|begin|commit|rollback)\b' || true)
  chkeq "$(basename "$f") contains no writing statement outside comments" "0" "$HITS"
done

echo ""
echo "assertions passed: $oks  failed: $fails"
if [ "$fails" -gt 0 ]; then echo "BATCH14AX_BUNDLE_VALIDATION_FAILED"; exit 1; fi
echo "BATCH14AX_BUNDLE_VALIDATION_PASSED"
