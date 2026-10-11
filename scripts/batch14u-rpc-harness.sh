#!/usr/bin/env bash
#
# batch14u-rpc-harness.sh — isolated PostgreSQL harness for the Batch 14u atomic
# write contract (supabase/migrations/20261012_apply_lifecycle_update.sql).
#
# Creates a PRIVATE cluster on a PRIVATE unix socket with NO TCP listener,
# applies the proposed migration, exercises it, and stops the cluster. It never
# touches a production database.
#
# Requires: a local PostgreSQL installation, and a `postgres` OS user (PostgreSQL
# refuses to run as root).
#
# Usage:  bash scripts/batch14u-rpc-harness.sh [path/to/migration.sql]
# Exit:   0 when every assertion passes, 1 otherwise.
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL="${1:-$ROOT/supabase/migrations/20261012_apply_lifecycle_update.sql}"

# Locate the server binaries: PATH first, then the Debian layout.
PGBIN=""
for d in /usr/lib/postgresql/*/bin /usr/local/pgsql/bin; do
  [ -x "$d/pg_ctl" ] && PGBIN="$d" && break
done
if [ -z "$PGBIN" ]; then
  command -v pg_ctl >/dev/null 2>&1 && PGBIN="$(dirname "$(command -v pg_ctl)")"
fi
if [ -z "$PGBIN" ] || [ ! -x "$PGBIN/pg_ctl" ]; then
  echo "batch14u-rpc-harness: no PostgreSQL server binaries found" >&2
  exit 2
fi

if [ ! -f "$SQL" ]; then
  echo "batch14u-rpc-harness: migration not found at $SQL" >&2
  exit 2
fi

BASE="/var/tmp/b14u-pg-$$"
SOCK="$BASE/sock"
DATA="$BASE/data"
mkdir -p "$SOCK" "$DATA"
chmod 0777 "$BASE" "$SOCK"
chown -R postgres:postgres "$BASE" 2>/dev/null || true

cleanup() {
  [ -n "${STARTED:-}" ] && su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate -w stop" >/dev/null 2>&1
}
trap cleanup EXIT

$PGBIN/postgres --version | head -1
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses=' -l $BASE/pg.log -w start" >/dev/null 2>&1 \
  || { echo "start FAILED"; tail -5 "$BASE/pg.log"; exit 2; }
STARTED=1

export PGHOST="$SOCK" PGUSER=postgres PGDATABASE=postgres
psql -q -c "select version();" >/dev/null || exit 2

# ── environment: the deployed table shapes, and the Supabase roles ───────────
psql -q -v ON_ERROR_STOP=1 <<'ENVSETUP' || exit 2
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
ENVSETUP

# ── apply the PROPOSED migration ────────────────────────────────────────────
psql -q -v ON_ERROR_STOP=1 -f "$SQL" >"$BASE/migration.log" 2>&1 \
  || { echo "MIGRATION FAILED"; tail -20 "$BASE/migration.log"; exit 2; }
echo "migration applied (proposed, isolated cluster only)"

# ── assertion plumbing ──────────────────────────────────────────────────────
PASS=0; FAIL=0
chk() { # chk "<label>" "<expected>" "<actual>"
  if [ "$2" = "$3" ]; then PASS=$((PASS + 1));
  else FAIL=$((FAIL + 1)); echo "  FAIL: $1 (expected '$2', got '$3')"; fi
}
q() { psql -Atq -c "$1" 2>&1; }
rpc() { q "select coalesce(string_agg(target||':'||outcome||':'||affected, ',' order by target),'<no rows>') from public.apply_lifecycle_update(\$j\$$1\$j\$);"; }

LAST_OUT=""; LAST_RC=0
try_rpc() { LAST_OUT=$(psql -Atq -v ON_ERROR_STOP=1 -c "select coalesce(string_agg(target||':'||outcome||':'||affected, ',' order by target),'<no rows>') from public.apply_lifecycle_update(\$j\$$1\$j\$);" 2>&1); LAST_RC=$?; }
expect_error() { # expect_error "<label>" "<sql>" "<substring>"
  LAST_OUT=$(psql -Atq -v ON_ERROR_STOP=1 -c "$2" 2>&1); LAST_RC=$?
  if [ $LAST_RC -ne 0 ] && printf '%s' "$LAST_OUT" | grep -q "$3"; then PASS=$((PASS + 1));
  else FAIL=$((FAIL + 1)); echo "  FAIL: $1 (rc=$LAST_RC, out=$LAST_OUT)"; fi
}

M1='11111111-1111-1111-1111-111111111111'
P1='22222222-2222-2222-2222-222222222222'

MEM_ORIG='"original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"}'
PROF_ORIG='"original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"}'
mem_entry() { printf '{"pk":"%s",%s,"set":%s}' "$M1" "$MEM_ORIG" "$1"; }
prof_entry() { printf '{"pk":"%s",%s,"set":%s}' "$P1" "$PROF_ORIG" "$1"; }
mem_target() { printf '{"target":"ut_members","linkage":{"customer_id":"cus_1","subscription_ids":["sub_A"]},"seen_pks":%s,"intent":"%s","entries":%s}' "$2" "$3" "$1"; }
prof_target() { printf '{"target":"profiles","linkage":{"customer_id":"cus_1","subscription_ids":["sub_A"]},"seen_pks":%s,"intent":"%s","entries":%s}' "$2" "$3" "$1"; }

seed() {
  psql -q -c "truncate public.ut_members, public.profiles;" >/dev/null
  psql -q -c "insert into public.ut_members (id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M1','a@x','initiate','active','cus_1','sub_A');" >/dev/null
  psql -q -c "insert into public.profiles (user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$P1','a@x','initiate','active','cus_1','sub_A');" >/dev/null
}
mem_state() { q "select coalesce(plan,'<null>')||'/'||coalesce(subscription_status,'<null>')||'/'||coalesce(stripe_customer_id,'<null>')||'/'||coalesce(stripe_subscription_id,'<null>') from public.ut_members;"; }
prof_state() { q "select coalesce(plan,'<null>')||'/'||coalesce(subscription_status,'<null>')||'/'||coalesce(stripe_customer_id,'<null>')||'/'||coalesce(stripe_subscription_id,'<null>') from public.profiles;"; }

REVOKE_SET='{"plan":"guest","subscription_status":"canceled","stripe_subscription_id":null,"current_period_end":null}'
GRANT_SET='{"plan":"initiate","subscription_status":"active","stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"}'

PAY_FULL="[$(mem_target "[$(mem_entry "$REVOKE_SET")]" "[\"$M1\"]" update),$(prof_target "[$(prof_entry '{"plan":"free"}')]" "[\"$P1\"]" update)]"

echo
echo "=== A. both writes succeed together ==="
seed
echo -n "  A1 "; chk "A1 both targets updated, one row each" "profiles:updated:1,ut_members:updated:1" "$(rpc "$PAY_FULL")"
chk "A2 ut_members carries the member write" "guest/canceled/cus_1/<null>" "$(mem_state)"
chk "A3 profiles carries the profile write" "free/active/cus_1/sub_A" "$(prof_state)"

echo
echo "=== B. a second-table conflict rolls the first back ==="
seed
# The ut_members entry is perfectly writable; the profiles entry's guard is stale
# (it claims the row's plan is 'free' when the row reads 'initiate').
BAD_PROF_ENTRY='{"pk":"'$P1'","original":{"plan":"free","subscription_status":"active","stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"},"set":{"plan":"free"}}'
BAD_PROF="[$(mem_target "[$(mem_entry "$REVOKE_SET")]" "[\"$M1\"]" update),$(prof_target "[$BAD_PROF_ENTRY]" "[\"$P1\"]" update)]"
try_rpc "$BAD_PROF"
chk "B1 the call is refused" "1" "$([ $LAST_RC -ne 0 ] && echo 1 || echo 0)"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: B2 names the conflict (out=$LAST_OUT)"; }
chk "B3 the FIRST table was rolled back" "initiate/active/cus_1/sub_A" "$(mem_state)"
chk "B4 the second table is untouched" "initiate/active/cus_1/sub_A" "$(prof_state)"

echo
echo "=== C. null-safe guards ==="
seed
C1="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_OTHER\",\"stripe_subscription_id\":\"sub_A\"},\"set\":$REVOKE_SET}]}]"
try_rpc "$C1"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: C1 changed CUSTOMER is refused (out=$LAST_OUT)"; }
chk "C1b the changed customer is preserved" "initiate/active/cus_1/sub_A" "$(mem_state)"

psql -q -c "update public.ut_members set stripe_subscription_id='sub_B', stripe_customer_id='cus_1';" >/dev/null
C2="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_B\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"},\"set\":$REVOKE_SET}]}]"
try_rpc "$C2"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: C2 changed SUBSCRIPTION is refused (out=$LAST_OUT)"; }
chk "C2b the changed subscription is preserved" "initiate/active/cus_1/sub_B" "$(mem_state)"

psql -q -c "update public.ut_members set subscription_status='past_due', stripe_subscription_id='sub_A';" >/dev/null
C3="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"},\"set\":$REVOKE_SET}]}]"
try_rpc "$C3"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: C3 changed STATUS is refused (out=$LAST_OUT)"; }
chk "C3b the changed status is preserved" "initiate/past_due/cus_1/sub_A" "$(mem_state)"

# C4: a NULL snapshot value matches a NULL row (IS NOT DISTINCT FROM, not '=')
seed
psql -q -c "update public.ut_members set plan='guest', subscription_status='canceled', stripe_subscription_id=null;" >/dev/null
C4="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"guest\",\"subscription_status\":\"canceled\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":null},\"set\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_subscription_id\":\"sub_A\"}}]}]"
chk "C4 a NULL-vs-NULL guard MATCHES (null-safe)" "ut_members:updated:1" "$(rpc "$C4")"
chk "C4b and the write landed" "initiate/active/cus_1/sub_A" "$(mem_state)"

# C5: the same NULL guard must NOT match a row that now holds a value
seed
C5="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"guest\",\"subscription_status\":\"canceled\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":null},\"set\":{\"plan\":\"guest\"}}]}]"
try_rpc "$C5"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: C5 a NULL guard does NOT match a non-NULL row (out=$LAST_OUT)"; }
chk "C5b the row is preserved" "initiate/active/cus_1/sub_A" "$(mem_state)"

# C6: a NULL snapshot value in EVERY guard column, on a row that is NULL in all
# of them. Without IS NOT DISTINCT FROM this matches nothing.
seed
psql -q -c "update public.ut_members set plan=null, subscription_status=null;" >/dev/null
C6="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":null,\"subscription_status\":null,\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"},\"set\":{\"plan\":\"initiate\",\"subscription_status\":\"active\"}}]}]"
chk "C6 NULL plan/status guard MATCHES NULL columns" "ut_members:updated:1" "$(rpc "$C6")"
chk "C6b and the write landed" "initiate/active/cus_1/sub_A" "$(mem_state)"

# C7: the same NULL guards must not match once the columns hold values
seed
C7="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":null,\"subscription_status\":null,\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"},\"set\":{\"plan\":\"guest\"}}]}]"
try_rpc "$C7"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: C7 a NULL plan guard does NOT match a non-NULL plan (out=$LAST_OUT)"; }
chk "C7b the row is preserved" "initiate/active/cus_1/sub_A" "$(mem_state)"

echo
echo "=== D. absent, disappeared, newly linked ==="
seed
D1="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[]}]"
psql -q -c "delete from public.ut_members;" >/dev/null
try_rpc "$D1"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 DISAPPEARED' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: D1 a DISAPPEARED row is named (out=$LAST_OUT)"; }

seed
D2="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[],\"intent\":\"update\",\"entries\":[]}]"
try_rpc "$D2"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 NEWLY_LINKED' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: D2 NEWLY_LINKED is detected from absence alone (out=$LAST_OUT)"; }
chk "D2b the newly linked row is untouched" "initiate/active/cus_1/sub_A" "$(mem_state)"

psql -q -c "truncate public.ut_members;" >/dev/null
chk "D3 a genuine absence is a no-op, not an error" "ut_members:absent:0" "$(rpc "$D2")"

echo
echo "=== E. present-but-ineligible is a legitimate no-op ==="
seed
E1="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"skip\",\"entries\":[]}]"
chk "E1 skipped is distinct from absent" "ut_members:skipped:0" "$(rpc "$E1")"
chk "E2 the skipped row is untouched" "initiate/active/cus_1/sub_A" "$(mem_state)"
E3="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[],\"intent\":\"skip\",\"entries\":[]}]"
try_rpc "$E3"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 NEWLY_LINKED' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: E3 skip does not bypass the staleness check (out=$LAST_OUT)"; }

echo
echo "=== F. concurrent calls, both orders ==="
seed
STALE="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"},\"set\":{\"plan\":\"guest\",\"subscription_status\":\"canceled\",\"stripe_subscription_id\":null}}]}]"
FRESH="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"},\"set\":{\"plan\":\"free\",\"subscription_status\":\"active\"}}]}]"

# order 1: FRESH holds the row lock, STALE waits and then loses
( psql -Atq -c "select public.apply_lifecycle_update(\$j\$$FRESH\$j\$); select pg_sleep(3);" >"$BASE/f1.out" 2>&1 ) &
F1PID=$!
sleep 1
T0=$(date +%s)
try_rpc "$STALE"
T1=$(date +%s)
wait $F1PID
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: F1 order FRESH-then-STALE: the stale call loses (out=$LAST_OUT)"; }
chk "F1b the newer state is preserved" "free/active/cus_1/sub_A" "$(mem_state)"
chk "F1c the stale call waited on the row lock (>=2s)" "1" "$([ $((T1 - T0)) -ge 2 ] && echo 1 || echo 0)"

# order 2: STALE commits first (it is current at that moment), then the other loses
seed
try_rpc "$STALE"
chk "F2 the first call succeeds while its snapshot is current" "ut_members:updated:1" "$LAST_OUT"
try_rpc "$FRESH"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: F2b order STALE-then-other: the stale-snapshot call loses (out=$LAST_OUT)"; }
chk "F2c the committed newer state is preserved" "guest/canceled/cus_1/<null>" "$(mem_state)"

echo
echo "=== G. replay after success ==="
seed
chk "G0 the first call succeeds" "ut_members:updated:1" "$(rpc "$STALE")"
try_rpc "$STALE"
printf '%s' "$LAST_OUT" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: G1 an identical replay is REFUSED, not silently accepted (out=$LAST_OUT)"; }
chk "G2 the post-write state stands" "guest/canceled/cus_1/<null>" "$(mem_state)"
G3="[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_A\"]},\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"guest\",\"subscription_status\":\"canceled\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":null},\"set\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"}}]}]"
chk "G3 a FRESH snapshot converges (the documented recovery)" "ut_members:updated:1" "$(rpc "$G3")"

echo
echo "=== H. execution is service-role only ==="
for who in anon authenticated; do
  LAST_OUT=$(psql -Atq -v ON_ERROR_STOP=1 -c "set role $who; select public.apply_lifecycle_update('[]'::jsonb);" 2>&1); LAST_RC=$?
  if [ $LAST_RC -ne 0 ] && printf '%s' "$LAST_OUT" | grep -q 'permission denied'; then PASS=$((PASS + 1));
  else FAIL=$((FAIL + 1)); echo "  FAIL: H $who cannot execute (rc=$LAST_RC, out=$LAST_OUT)"; fi
done
H3=$(psql -Atq -v ON_ERROR_STOP=1 -c "set role service_role; select string_agg(target||':'||outcome||':'||affected, ',' order by target) from public.apply_lifecycle_update(\$j\$$PAY_FULL\$j\$);" 2>&1)
chk "H3 service_role CAN execute it" "profiles:updated:1,ut_members:updated:1" "$H3"
G=$(q "select count(*) from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apply_lifecycle_update' and p.prosecdef")
chk "H4 it is SECURITY DEFINER" "1" "$G"
SP=$(q "select array_to_string(p.proconfig,';') from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname='apply_lifecycle_update'")
chk "H5 search_path is pinned" "search_path=pg_catalog, public" "$SP"

echo
echo "assertions passed: $PASS"
echo "assertions failed: $FAIL"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14U_RPC_HARNESS_FAILED"; exit 1; fi
echo "BATCH14U_RPC_HARNESS_PASSED"
