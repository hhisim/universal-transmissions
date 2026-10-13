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
# Version-parameterised: run with PGBIN=/usr/lib/postgresql/17/bin to validate the
# MAINTAIN branch of every privilege list on the version production actually runs.
PGBIN=${PGBIN:-/usr/lib/postgresql/16/bin}
PG_MAJOR=$(basename "$(dirname "$PGBIN")")
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
# The postflight's verdict contract: run the file UNALIGNED so its last line is
# the verdict value and nothing else, then read that line. A red gate, a NULL
# verdict and a file that never reached its verdict are three distinct failures.
verdict_of() {  # verdict_of <path> <tag>  -> prints the value, or null/missing/error:N
  cp "$1" "$BASE/$2.verdict.sql"; chmod 644 "$BASE/$2.verdict.sql"
  : >"$BASE/$2.verdict.out"
  su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/$2.verdict.sql" \
    >"$BASE/$2.verdict.out" 2>&1
  local rc=$?
  if [ "$rc" != "0" ]; then echo "error:$rc"; return; fi
  local lines last
  lines=$(grep -c '[^[:space:]]' "$BASE/$2.verdict.out" || true)
  last=$(tail -1 "$BASE/$2.verdict.out")
  if [ "$lines" = "0" ]; then echo "missing"; return; fi
  if [ -z "$last" ]; then echo "null"; return; fi
  echo "$last"
}
# Direct writes AS THE APPLICATION ROLE. A superuser session proves nothing about
# service_role: it bypasses RLS and holds every privilege by definition.
svc() {  # svc <sql>  -> runs it after `set role service_role`
  su postgres -c "psql -h $SOCK -d $DB -X -q -A -t -v ON_ERROR_STOP=1 -c \"set role service_role; $1\"" 2>&1
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
echo "== VERSION-DEPENDENT PRIVILEGE LIST (preflight P16, on PostgreSQL $PG_MAJOR) =="
# The preflight's LAST statement is P16, so the unaligned last line of its output
# reports the version branch that this server actually takes.
P16=$(verdict_of "$PRE" preflight)
P16_IS17=$(printf '%s' "$P16" | cut -d'|' -f1)
P16_PRIVS=$(printf '%s' "$P16" | cut -d'|' -f3)
P16_CNT_OK=$(printf '%s' "$P16" | cut -d'|' -f4)
P16_MAINTAIN_OK=$(printf '%s' "$P16" | cut -d'|' -f5)
chkeq "P16: the privilege list length matches the server version" "$([ "$PG_MAJOR" = "17" ] && echo 8 || echo 7)" "$P16_PRIVS"
chkeq "P16: the version branch is self-consistent (count and MAINTAIN agree)" "t|t" "$P16_CNT_OK|$P16_MAINTAIN_OK"
chkeq "P16: server_is_17_or_later agrees with the binary in use" "$([ "$PG_MAJOR" = "17" ] && echo t || echo f)" "$P16_IS17"
if [ "$PG_MAJOR" = "16" ]; then
  # Make the guard provably load-bearing rather than stylistic: on 16 the
  # unconditional form raises, which is exactly what the CASE prevents.
  MAINTAIN_RAW=$(q "select has_table_privilege('anon', 'public.ut_members', 'MAINTAIN')" 2>&1)
  if printf '%s' "$MAINTAIN_RAW" | grep -q 'unrecognized privilege'; then
    ok "P16 negative: naming MAINTAIN unconditionally on PostgreSQL 16 raises, so the CASE guard is load-bearing"
  else
    bad "naming MAINTAIN on PostgreSQL 16 did not raise as expected (got: $MAINTAIN_RAW)"
  fi
fi

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
echo "== DIRECT writes as service_role (the role the application writes with) =="
echo "== the trigger serializes them; it must not block them =="
SVC_INS=$(svc "insert into public.ut_members (email, plan) values ('svc-writer@example.com', 'initiate')" >/dev/null 2>&1; echo $?)
chkeq "a direct INSERT as service_role succeeds" "0" "$SVC_INS"
chkeq "  ...and the row is present" "1" \
  "$(q "select count(*) from public.ut_members where email='svc-writer@example.com'")"
chkeq "a direct UPDATE as service_role succeeds" "free" \
  "$(svc "update public.ut_members set plan='free' where email='svc-writer@example.com' returning plan" | tail -1)"
chkeq "  ...and the update is persisted" "free" \
  "$(q "select plan from public.ut_members where email='svc-writer@example.com'")"
# The trigger is only coverage if the writing role can reach its function: a
# missing EXECUTE would make every direct write fail with 42501 instead.
chkeq "service_role may execute the trigger function" "t" \
  "$(q "select has_function_privilege('service_role', 'public.b14ac_trg_stmt_exclusive()', 'EXECUTE')")"

echo ""
echo "== the address index enforces uniqueness on the service_role path =="
DUP=$(svc "insert into public.ut_members (email) values ('SVC-WRITER@example.com')" 2>&1)
if printf '%s' "$DUP" | grep -q 'duplicate key value violates unique constraint'; then
  ok "a case-variant duplicate as service_role is refused by the index"
else
  bad "a case-variant duplicate as service_role was NOT refused ($DUP)"
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

echo ""
echo "== THE MANDATORY VERDICT (Q90) =="
# The contract: the verdict is the LAST statement of the file, so the last
# unaligned line of its output IS the verdict. It must read exactly `t`. A FALSE
# gate, a NULL gate and a file that never reached its gate are distinct failures —
# none of them may pass by default.
VERDICT=$(verdict_of "$POST" postflight)
chkeq "the postflight's verdict is exactly true" "t" "$VERDICT"
case "$VERDICT" in
  t)       ok "the verdict is present, non-NULL and true" ;;
  f)       bad "the verdict is FALSE — a mandatory gate did not hold" ;;
  null)    bad "the verdict is NULL — a mandatory gate produced no value" ;;
  missing) bad "the verdict is MISSING — the file produced no final value" ;;
  *)       bad "the verdict is not a boolean (got '$VERDICT')" ;;
esac
if [ "$VERDICT" != "t" ]; then
  echo "  -- verdict components (diagnostic; a false gate must say WHICH condition failed) --"
  cp "$REPO/scripts/batch14ax-verdict-components.sql" "$BASE/components.sql"
  # The inline copy that follows is SUPERSEDED by the shared diagnostic file
  # (scripts/batch14ax-verdict-components.sql), which the gate harness also uses so
  # the two can never drift. It is kept only as a no-op heredoc.
  : <<'EOF'
with c as (
  select 1 as n, 'authority column + type' as component,
    (select count(*) = 2 from pg_attribute a
      where a.attrelid in ('public.ut_members'::regclass, 'public.profiles'::regclass)
        and a.attname = 'entitlement_authority_at' and a.attnum > 0
        and format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone') as holds
  union all select 2, 'address index structure',
    (select count(*) = 1 from pg_index i join pg_class ic on ic.oid = i.indexrelid
       join pg_class t2 on t2.oid = i.indrelid join pg_namespace n on n.oid = ic.relnamespace
      where n.nspname = 'public' and ic.relname = 'ut_members_email_lower_key'
        and t2.relname = 'ut_members' and i.indisunique and i.indisvalid and i.indisready and i.indislive
        and i.indnkeyatts = 1 and i.indnatts = 1 and i.indpred is null
        and replace(pg_get_expr(i.indexprs, i.indrelid), ' ', '') in ('lower(btrim(email))','lower(btrim((email)::text))'))
  union all select 3, 'four exact signatures',
    (select count(*) = 4 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and (p.proname, pg_get_function_identity_arguments(p.oid)) in (
              ('apply_lifecycle_update','p_targets jsonb'),
              ('apply_lifecycle_update_sync','p_targets jsonb'),
              ('apply_lifecycle_update_sync_global','p_targets jsonb'),
              ('b14ac_install_trigger','p_mode text')))
  union all select 4, 'mode + search_path + owner + ACLs',
    (select count(*) = 3 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and p.proname in ('apply_lifecycle_update','apply_lifecycle_update_sync','apply_lifecycle_update_sync_global')
        and pg_get_userbyid(p.proowner) = 'postgres'
        and replace(array_to_string(p.proconfig, ','), ' ', '') = 'search_path=pg_catalog,public'
        and p.prosecdef = (p.proname = 'apply_lifecycle_update')
        and has_function_privilege('service_role', p.oid, 'EXECUTE')
        and not has_function_privilege('anon', p.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
        and not (p.proacl is null or exists (select 1 from aclexplode(p.proacl) x
                    where x.grantee = 0 and x.privilege_type = 'EXECUTE')))
  union all select 5, 'installer present + restricted',
    (select count(*) = 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'b14ac_install_trigger'
        and pg_get_function_identity_arguments(p.oid) = 'p_mode text'
        and pg_get_userbyid(p.proowner) = 'postgres'
        and not has_function_privilege('anon', p.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  union all select 6, 'enabled BEFORE STATEMENT triggers on both tables',
    (select count(*) = 2 from pg_trigger t join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace join pg_proc p on p.oid = t.tgfoid
      where n.nspname = 'public' and c.relname in ('ut_members','profiles')
        and not t.tgisinternal and t.tgname = 'b14ac_stmt_trg'
        and t.tgenabled = 'O' and (t.tgtype & 1) = 0 and (t.tgtype & 2) = 2
        and (t.tgtype & 4) = 4 and (t.tgtype & 16) = 16
        and p.proname = 'b14ac_trg_stmt_exclusive')
  union all select 7, 'effective table access withdrawn',
    (select count(*) = 0 from (values ('anon'),('authenticated')) r(role_name)
       cross join (values ('ut_members'),('profiles')) t(tablename)
       cross join (select unnest(case when current_setting('server_version_num')::int >= 170000
            then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'],'MAINTAIN')
            else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'] end) as priv) p
      where has_table_privilege(r.role_name, 'public.' || t.tablename, p.priv))
  union all select 8, 'effective column access withdrawn',
    (select count(*) = 0 from (values ('anon'),('authenticated')) r(role_name)
       cross join (select attrelid, attname from pg_attribute
                    where attrelid in ('public.ut_members'::regclass,'public.profiles'::regclass)
                      and attnum > 0 and not attisdropped) a
       cross join (select unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) as priv) p
      where has_column_privilege(r.role_name, a.attrelid, a.attname, p.priv))
  union all select 9, 'no PUBLIC grant (tables, columns, guarded functions)',
    ((select count(*) = 0 from information_schema.role_table_grants
       where table_schema = 'public' and table_name in ('ut_members','profiles') and grantee = 'PUBLIC')
     and (select count(*) = 0 from information_schema.column_privileges
       where table_schema = 'public' and table_name in ('ut_members','profiles') and grantee = 'PUBLIC')
     and (select count(*) = 0 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
       where n.nspname = 'public'
         and p.proname in ('apply_lifecycle_update','apply_lifecycle_update_sync',
                           'apply_lifecycle_update_sync_global','b14ac_install_trigger')
         and (p.proacl is null or exists (select 1 from aclexplode(p.proacl) x
                    where x.grantee = 0 and x.privilege_type = 'EXECUTE'))))
  union all select 10, 'RLS on both + policy not visible to anon/authenticated',
    ((select count(*) = 2 from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname in ('ut_members','profiles') and c.relrowsecurity)
     and (select count(*) = 0 from pg_policies
       where schemaname = 'public' and policyname = 'allow_authenticated_read')
     and (select count(*) = 0 from pg_policies
       where schemaname = 'public' and tablename in ('ut_members','profiles')
         and (roles::text[] && array['anon','authenticated','public'])))
)
select n as component_no, component, holds
from c where not holds order by n;
EOF
  chmod 644 "$BASE/components.sql"
  psql_ "$BASE/components.sql" 2>&1 | sed 's/^/  /'
fi
# Structural guard: nothing may follow the verdict, or 'the last line' stops being
# the verdict and the check above would read some later statement's output instead.
LAST_STMT=$(grep -v '^[[:space:]]*--' "$POST" | grep -v '^[[:space:]]*$' | tail -1)
case "$LAST_STMT" in
  *"as verdict;"*) ok "Q90 is the last statement in the postflight (nothing follows it)" ;;
  *) bad "the postflight's last statement is not the verdict: $LAST_STMT" ;;
esac
# Independent re-checks, so the file's own gate is not the only thing standing
# between a bad install and a green run. psql's unaligned mode prints a bare
# boolean as t/f, while a concatenation renders true/false.
chkeq "independent re-check: the authority column exists on both tables" "t" \
  "$(q "select count(*) = 2 from pg_attribute a where a.attrelid in ('public.ut_members'::regclass,'public.profiles'::regclass) and a.attname='entitlement_authority_at' and a.attnum>0")"
chkeq "independent re-check: the exclusive trigger is ENABLED on both tables" "2" \
  "$(q "select count(*) from pg_trigger t where not t.tgisinternal and t.tgname='b14ac_stmt_trg' and t.tgenabled='O'")"
chkeq "independent re-check: the trigger is a BEFORE STATEMENT trigger for INSERT and UPDATE" "2" \
  "$(q "select count(*) from pg_trigger t where not t.tgisinternal and t.tgname='b14ac_stmt_trg' and (t.tgtype & 1)=0 and (t.tgtype & 2)=2 and (t.tgtype & 4)=4 and (t.tgtype & 16)=16")"

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
