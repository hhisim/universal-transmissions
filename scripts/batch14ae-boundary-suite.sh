#!/usr/bin/env bash
#
# batch14ae-boundary-suite.sh — the EXECUTION BOUNDARY suite for both wrappers.
#
# Usage: bash scripts/batch14ae-boundary-suite.sh [path/to/wrapper.sql]
#
# Runs on its own private cluster. Exit 0 = every boundary assertion holds.
# Exit 1 = at least one named assertion failed (which is also what the
# disposable-copy PUBLIC-restoration mutations rely on to be DETECTED).
#
# The role matrix covers BOTH wrappers, for anon / authenticated / service_role,
# initially AND after reapplication, and asserts three separate things that are
# easy to conflate:
#
#   (a) the WRAPPER's own ACL,
#   (b) the actual call outcome,
#   (c) the DENIAL POINT — which function the permission error names.
#
# (c) matters because an INVOKER wrapper that is exposed to PUBLIC but whose base
# RPC is still restricted still produces 42501. A suite that only checked "the
# call fails" would call that a pass while the wrapper was wide open.
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_REVIEWED="$ROOT/supabase/migrations/20261012_apply_lifecycle_update.sql"
SQL_KEYS="$ROOT/supabase/migrations/20261013_lifecycle_linkage_sync.sql"
SQL_WRAPPER="${1:-$ROOT/supabase/migrations/20261014_lifecycle_sync_wrapper.sql}"
PGBIN=/usr/lib/postgresql/16/bin

BASE=$(mktemp -d /var/tmp/b14ae-XXXXXX)
DATA="$BASE/data"; SOCK="$BASE/sock"; PLOG="$BASE/pg.log"
mkdir -p "$SOCK"
chown -R postgres:postgres "$BASE"

PASS=0; FAIL=0; FAILED_NAMES=""
ok()  { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad() { FAIL=$((FAIL + 1)); FAILED_NAMES="$FAILED_NAMES $1"; printf '  FAIL %s\n' "$1"; }
chkeq() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi; }

cleanup() {
  local rc=$?
  trap - EXIT INT TERM HUP
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  find "$BASE" -mindepth 1 -depth -delete 2>/dev/null
  rmdir "$BASE" 2>/dev/null
  exit "$rc"
}
trap cleanup EXIT INT TERM HUP

q() {
  printf '%s\n' "$1" >"$BASE/.q.sql"; chmod 644 "$BASE/.q.sql"
  QOUT=$(su postgres -c "PGAPPNAME=super psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/.q.sql" 2>&1)
  QRC=$?; printf '%s' "$QOUT"; return "$QRC"
}
apply_sql() { chmod 644 "$1"; su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $1" >"$BASE/apply.out" 2>&1; }
as_role() { # as_role <role> <sql-body> -> stdout; sets RC_OUT
  { printf '\\set VERBOSITY verbose\nset role %s;\n' "$1"; printf '%s\n' "$2"; } >"$BASE/.role.sql"
  chmod 644 "$BASE/.role.sql"
  QOUT=$(su postgres -c "PGAPPNAME=role-$1 psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/.role.sql" 2>&1)
  RC_OUT=$?; printf '%s' "$QOUT"
}
acl() { q "select has_function_privilege('$1','public.$2(jsonb)','EXECUTE')::int"; }

su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >/dev/null 2>&1 || { echo "initdb failed"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses=' -l $PLOG -w start" >/dev/null 2>&1 || { echo "start failed"; exit 2; }

cat >"$BASE/schema.sql" <<'EOF'
create table public.ut_members (
  id uuid primary key default gen_random_uuid(),
  email text not null, plan text default 'guest',
  subscription_status text default 'inactive',
  stripe_customer_id text, stripe_subscription_id text, current_period_end timestamptz);
create table public.profiles (
  user_id uuid primary key, email text,
  plan text default 'guest', subscription_status text default 'inactive',
  stripe_customer_id text, stripe_subscription_id text, current_period_end timestamptz);
create role anon nologin; create role authenticated nologin; create role service_role nologin;
grant usage on schema public to anon, authenticated, service_role;
EOF
cp "$SQL_REVIEWED" "$BASE/reviewed.sql"; cp "$SQL_KEYS" "$BASE/keys.sql"
cp "$SQL_WRAPPER" "$BASE/wrapper.sql"
apply_sql "$BASE/schema.sql"   || { echo "schema failed"; exit 2; }
apply_sql "$BASE/reviewed.sql" || { echo "reviewed RPC failed"; cat "$BASE/apply.out"; exit 2; }
apply_sql "$BASE/keys.sql"     || { echo "keys failed"; cat "$BASE/apply.out"; exit 2; }
apply_sql "$BASE/wrapper.sql"  || { echo "WRAPPER FAILED TO APPLY"; cat "$BASE/apply.out"; exit 2; }

M1='11111111-1111-1111-1111-111111111111'
M2='22222222-2222-2222-2222-222222222222'
P1='33333333-3333-3333-3333-333333333333'
CUS='cus_1'; SUB='sub_A'
seed() {
  q "truncate public.ut_members, public.profiles;
     insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id)
       values ('$M1','a@x','initiate','active','$CUS','$SUB');
     insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id)
       values ('$P1','a@x','initiate','active','$CUS','$SUB');" >/dev/null
}
jv() { if [ -z "$1" ]; then printf 'null'; else printf '"%s"' "$1"; fi; }
ent() { printf '{"pk":"%s","original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":"%s","stripe_subscription_id":"%s"}%s}' "$1" "$CUS" "$SUB" "$2"; }
tgtm() { printf '{"target":"ut_members","linkage":{"customer_id":"%s","subscription_ids":["%s"]},"intent":"update","seen_pks":[%s],"entries":[%s]}' "$CUS" "$SUB" "$1" "$2"; }
tgtp() { printf '{"target":"profiles","linkage":{"customer_id":"%s","subscription_ids":["%s"]},"intent":"update","seen_pks":[%s],"entries":[%s]}' "$CUS" "$SUB" "$1" "$2"; }
GOOD=$(printf '[%s]' "$(tgtm "\"$M1\"" "$(ent "$M1" ',"set":{"plan":"free"}')")")
BAD=$(printf '[%s,%s]' "$(tgtm "\"$M1\"" "$(ent "$M1" ',"set":{"plan":"free"}')")" "$(tgtp "\"$M2\"" "$(ent "$P1" ',"set":{"plan":"free"}')")")

# The three assertions that must hold for one (wrapper, role) cell.
cell() { # cell <wrapper> <role> <expect-acl> <expect-call> ; expect-call = ok|denied-wrapper|denied-base
  local w="$1" r="$2" xacl="$3" xcall="$4"
  chkeq "ACL: $r has EXECUTE on $w = $xacl" "$xacl" "$(acl "$r" "$w")"
  seed
  as_role "$r" "select * from public.$w(\$j\$$GOOD\$j\$);" >"$BASE/.cell.out" 2>&1
  local rc=$RC_OUT txt; txt=$(cat "$BASE/.cell.out")
  case "$xcall" in
    ok)
      chkeq "CALL: $r -> $w succeeds" "0" "$rc"
      chkeq "CALL: $r -> $w applied the write" "free" "$(q "select plan from public.ut_members where id='$M1'")"
      ;;
    denied-wrapper)
      if [ "$rc" -eq 0 ]; then bad "CALL: $r -> $w was expected to be DENIED and was not"
      else ok "CALL: $r -> $w is refused"; fi
      # Name WHERE the denial landed. "The call failed" is not the assertion:
      # a restricted BASE RPC produces the same 42501 downstream, so the point of
      # denial is what distinguishes a restricted wrapper from an open one.
      local pt
      if printf '%s' "$txt" | grep -q "permission denied for function $w"; then pt="wrapper"
      elif printf '%s' "$txt" | grep -q 'permission denied for function apply_lifecycle_update'; then pt="base"
      else pt="other"; fi
      chkeq "DENIAL POINT: $r -> $w denial names the WRAPPER (landed at: $pt)" "wrapper" "$pt"
      chkeq "STATE: $r -> $w changed no membership state" "initiate" \
        "$(q "select plan from public.ut_members where id='$M1'")"
      ;;
    denied-base)
      if [ "$rc" -eq 0 ]; then bad "CALL: $r -> $w was expected to be DENIED and was not"
      else ok "CALL: $r -> $w is refused (downstream of the wrapper)"; fi
      chkeq "DENIAL POINT: $r -> $w is denied AT THE BASE RPC" "1" \
        "$(printf '%s' "$txt" | grep -c 'permission denied for function apply_lifecycle_update' || true)"
      chkeq "STATE: $r -> $w changed no membership state" "initiate" \
        "$(q "select plan from public.ut_members where id='$M1'")"
      ;;
  esac
}

echo "=== ACTUAL denied calls under anon and authenticated must not be evidence-by-themselves ==="
for w in apply_lifecycle_update_sync apply_lifecycle_update_sync_global; do
  cell "$w" anon         0 denied-wrapper
  cell "$w" authenticated 0 denied-wrapper
  cell "$w" service_role  1 ok
done

echo
echo "=== authorized rollback through BOTH wrappers ==="
for w in apply_lifecycle_update_sync apply_lifecycle_update_sync_global; do
  seed
  as_role service_role "select * from public.$w(\$j\$$BAD\$j\$);" >"$BASE/.rb.out" 2>&1
  txt=$(cat "$BASE/.rb.out")
  chkeq "ROLLBACK: $w reports the RPC's own error" "1" \
    "$(printf '%s' "$txt" | grep -c 'BATCH14 NEWLY_LINKED' || true)"
  chkeq "ROLLBACK: $w rolled the first target back" "initiate" \
    "$(q "select plan from public.ut_members where id='$M1'")"
done

echo
echo "=== the same matrix AFTER reapplication ==="
apply_sql "$BASE/wrapper.sql" || { echo "REAPPLICATION FAILED"; cat "$BASE/apply.out"; exit 2; }
chkeq "REAPPLY: the wrapper is still SECURITY INVOKER" "f" \
  "$(q "select bool_or(prosecdef) from pg_proc where proname in ('apply_lifecycle_update_sync','apply_lifecycle_update_sync_global')")"
chkeq "REAPPLY: both wrappers still owned by postgres" "2" \
  "$(q "select count(*) from pg_proc p join pg_roles r on r.oid=p.proowner
          where p.proname in ('apply_lifecycle_update_sync','apply_lifecycle_update_sync_global') and r.rolname='postgres'")"
for w in apply_lifecycle_update_sync apply_lifecycle_update_sync_global; do
  cell "$w" anon          0 denied-wrapper
  cell "$w" authenticated 0 denied-wrapper
  cell "$w" service_role  1 ok
done

echo
echo "assertions passed: $PASS"
echo "assertions failed: $FAIL"
echo "failed assertions:$FAILED_NAMES"
if [ "$FAIL" -ne 0 ]; then
  echo "BATCH14AE_BOUNDARY_SUITE_FAILED"
  echo "BATCH14AE_FAILED_NAMES:$FAILED_NAMES"
  exit 1
fi
echo "BATCH14AE_BOUNDARY_SUITE_PASSED"
