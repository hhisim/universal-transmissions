#!/usr/bin/env bash
#
# batch14u-rpc-harness.sh — isolated PostgreSQL harness for the atomic lifecycle
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
BARRIER="$BASE/barrier"
mkdir -p "$SOCK" "$DATA" "$BARRIER"
chmod 0777 "$BASE" "$SOCK" "$BARRIER"
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

psql -q -v ON_ERROR_STOP=1 -f "$SQL" >"$BASE/migration.log" 2>&1 \
  || { echo "MIGRATION FAILED"; tail -20 "$BASE/migration.log"; exit 2; }
echo "migration applied (proposed, isolated cluster only)"

# ── assertion plumbing ──────────────────────────────────────────────────────
PASS=0; FAIL=0
chk() {
  if [ "$2" = "$3" ]; then PASS=$((PASS + 1));
  else FAIL=$((FAIL + 1)); echo "  FAIL: $1 (expected '$2', got '$3')"; fi
}
q() { psql -Atq -c "$1" 2>&1; }
rpc() { q "select coalesce(string_agg(target||':'||outcome||':'||affected, ',' order by target),'<no rows>') from public.apply_lifecycle_update(\$j\$$1\$j\$);"; }

LAST_OUT=""; LAST_RC=0
try_rpc() { LAST_OUT=$(psql -Atq -v ON_ERROR_STOP=1 -c "select coalesce(string_agg(target||':'||outcome||':'||affected, ',' order by target),'<no rows>') from public.apply_lifecycle_update(\$j\$$1\$j\$);" 2>&1); LAST_RC=$?; }
want_error() { # want_error "<label>" "<payload>" "<substring>"
  try_rpc "$2"
  if [ $LAST_RC -ne 0 ] && printf '%s' "$LAST_OUT" | grep -q "$3"; then PASS=$((PASS + 1));
  else FAIL=$((FAIL + 1)); echo "  FAIL: $1 (rc=$LAST_RC, out=$(printf '%s' "$LAST_OUT" | head -1))"; fi
}
wait_for() { local f="$1" n=0; until [ -f "$f" ] || [ $n -ge 600 ]; do sleep 0.05; n=$((n + 1)); done; }

M1='11111111-1111-1111-1111-111111111111'
M2='22222222-2222-2222-2222-222222222222'
P1='33333333-3333-3333-3333-333333333333'
P2='44444444-4444-4444-4444-444444444444'
LM='"linkage":{"customer_id":"cus_1","subscription_ids":["sub_A"]}'
LP='"linkage":{"customer_id":"cus_1","subscription_ids":["sub_A"]}'
GM='"plan":"initiate","subscription_status":"active","stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"'
GP='"plan":"initiate","subscription_status":"active","stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"'
REVOKE_SET='{"plan":"guest","subscription_status":"canceled","stripe_subscription_id":null,"current_period_end":null}'

mem_t() { printf '{"target":"ut_members",%s,%s}' "$LM" "$1"; }   # $1 = seen_pks / intent / entries
prof_t() { printf '{"target":"profiles",%s,%s}' "$LP" "$1"; }
e_m() { printf '{"pk":"%s","original":{%s}%s}' "$1" "$GM" "$2"; } # $2 = ,"set":{...}
e_p() { printf '{"pk":"%s","original":{%s}%s}' "$1" "$GP" "$2"; }
u_m() { printf '"seen_pks":[%s],"intent":"update","entries":[%s]' "$1" "$2"; }

seed() {
  psql -q -c "truncate public.ut_members, public.profiles;" >/dev/null
  psql -q -c "insert into public.ut_members (id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M1','a@x','initiate','active','cus_1','sub_A');" >/dev/null
  psql -q -c "insert into public.profiles (user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$P1','a@x','initiate','active','cus_1','sub_A');" >/dev/null
}
mem_state() { q "select coalesce(plan,'<null>')||'/'||coalesce(subscription_status,'<null>')||'/'||coalesce(stripe_customer_id,'<null>')||'/'||coalesce(stripe_subscription_id,'<null>') from public.ut_members where id='$M1';"; }
prof_state() { q "select coalesce(plan,'<null>')||'/'||coalesce(subscription_status,'<null>')||'/'||coalesce(stripe_customer_id,'<null>')||'/'||coalesce(stripe_subscription_id,'<null>') from public.profiles where user_id='$P1';"; }
mem_all() { q "select coalesce(string_agg(coalesce(plan,'<null>'),',' order by id),'<none>') from public.ut_members;"; }

PAY_FULL="[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")"),$(prof_t "$(u_m "\"$P1\"" "$(e_p "$P1" ',"set":{"plan":"free"}')")")]"

echo
echo "=== A. both writes succeed together ==="
seed
chk "A1 both targets updated, one row each" "profiles:updated:1,ut_members:updated:1" "$(rpc "$PAY_FULL")"
chk "A2 ut_members carries the member write" "guest/canceled/cus_1/<null>" "$(mem_state)"
chk "A3 profiles carries the profile write" "free/active/cus_1/sub_A" "$(prof_state)"

echo
echo "=== B. a second-table conflict rolls the first back ==="
seed
BAD="[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")"),$(prof_t "$(u_m "\"$P1\"" "{\"pk\":\"$P1\",\"original\":{\"plan\":\"free\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"},\"set\":{\"plan\":\"free\"}}")")]"
want_error "B1 the call is refused" "$BAD" 'BATCH14 CONFLICT'
chk "B2 the FIRST table was rolled back" "initiate/active/cus_1/sub_A" "$(mem_state)"
chk "B3 the second table is untouched" "initiate/active/cus_1/sub_A" "$(prof_state)"

echo
echo "=== C. null-safe guards ==="
seed
want_error "C1 changed CUSTOMER is refused" "[$(mem_t "$(u_m "\"$M1\"" "{\"pk\":\"$M1\",\"original\":{\"plan\":\"initiate\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_OTHER\",\"stripe_subscription_id\":\"sub_A\"},\"set\":$REVOKE_SET}")")]" 'BATCH14 CONFLICT'
chk "C1b the changed customer is preserved" "initiate/active/cus_1/sub_A" "$(mem_state)"

psql -q -c "update public.ut_members set stripe_subscription_id='sub_B';" >/dev/null
want_error "C2 changed SUBSCRIPTION is refused" "[$(mem_t "\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[\"sub_B\"]},$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")")]" 'BATCH14 CONFLICT'
chk "C2b the changed subscription is preserved" "initiate/active/cus_1/sub_B" "$(mem_state)"

psql -q -c "update public.ut_members set subscription_status='past_due', stripe_subscription_id='sub_A';" >/dev/null
want_error "C3 changed STATUS is refused" "[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")")]" 'BATCH14 CONFLICT'
chk "C3b the changed status is preserved" "initiate/past_due/cus_1/sub_A" "$(mem_state)"

seed
psql -q -c "update public.ut_members set plan='guest', subscription_status='canceled', stripe_subscription_id=null;" >/dev/null
chk "C4 a NULL-vs-NULL guard MATCHES (null-safe)" "ut_members:updated:1" \
  "$(rpc "[$(mem_t "\"linkage\":{\"customer_id\":\"cus_1\",\"subscription_ids\":[]},$(u_m "\"$M1\"" '{"pk":"'$M1'","original":{"plan":"guest","subscription_status":"canceled","stripe_customer_id":"cus_1","stripe_subscription_id":null},"set":{"plan":"initiate","subscription_status":"active","stripe_subscription_id":"sub_A"}}')")]")"
chk "C4b and the write landed" "initiate/active/cus_1/sub_A" "$(mem_state)"

seed
want_error "C5 a NULL guard does NOT match a non-NULL row" "[$(mem_t "$(u_m "\"$M1\"" '{"pk":"'$M1'","original":{"plan":"guest","subscription_status":"canceled","stripe_customer_id":"cus_1","stripe_subscription_id":null},"set":{"plan":"guest"}}')")]" 'BATCH14 CONFLICT'
chk "C5b the row is preserved" "initiate/active/cus_1/sub_A" "$(mem_state)"

seed
psql -q -c "update public.ut_members set plan=null, subscription_status=null;" >/dev/null
chk "C6 NULL plan/status guard MATCHES NULL columns" "ut_members:updated:1" \
  "$(rpc "[$(mem_t "$(u_m "\"$M1\"" '{"pk":"'$M1'","original":{"plan":null,"subscription_status":null,"stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"},"set":{"plan":"initiate","subscription_status":"active"}}')")]")"
chk "C6b and the write landed" "initiate/active/cus_1/sub_A" "$(mem_state)"

seed
want_error "C7 a NULL plan guard does NOT match a non-NULL plan" "[$(mem_t "$(u_m "\"$M1\"" '{"pk":"'$M1'","original":{"plan":null,"subscription_status":null,"stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"},"set":{"plan":"guest"}}')")]" 'BATCH14 CONFLICT'
chk "C7b the row is preserved" "initiate/active/cus_1/sub_A" "$(mem_state)"

echo
echo "=== D. absent, disappeared, newly linked ==="
seed
psql -q -c "delete from public.ut_members;" >/dev/null
want_error "D1 a DISAPPEARED row is named" "[$(mem_t "\"seen_pks\":[\"$M1\"],\"intent\":\"update\",\"entries\":[]")]" 'BATCH14 DISAPPEARED'

seed
want_error "D2 NEWLY_LINKED is detected from absence alone" "[$(mem_t "\"seen_pks\":[],\"intent\":\"update\",\"entries\":[]")]" 'BATCH14 NEWLY_LINKED'
chk "D2b the newly linked row is untouched" "initiate/active/cus_1/sub_A" "$(mem_state)"

psql -q -c "truncate public.ut_members;" >/dev/null
chk "D3 a genuine absence is a no-op, not an error" "ut_members:absent:0" "$(rpc "[$(mem_t "\"seen_pks\":[],\"intent\":\"update\",\"entries\":[]")]")"

echo
echo "=== E. present-but-ineligible is a legitimate no-op ==="
seed
chk "E1 skipped is distinct from absent" "ut_members:skipped:0" "$(rpc "[$(mem_t "\"seen_pks\":[\"$M1\"],\"intent\":\"skip\",\"entries\":[$(e_m "$M1" '')]")]")"
chk "E2 the skipped row is untouched" "initiate/active/cus_1/sub_A" "$(mem_state)"
want_error "E3 skip does not bypass the staleness check" "[$(mem_t "\"seen_pks\":[],\"intent\":\"skip\",\"entries\":[]")]" 'BATCH14 NEWLY_LINKED'

echo
echo "=== V. snapshot coverage and entry validation (added as failing cases first) ==="
seed
want_error "V1 a present update target with EMPTY entries is refused" "[$(mem_t "$(u_m "\"$M1\"" '')")]" 'BATCH14 EMPTY_UPDATE'

seed
psql -q -c "insert into public.ut_members (id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M2','b@x','initiate','active','cus_1','sub_A');" >/dev/null
want_error "V2 an entry that OMITS a located row is refused" "[$(mem_t "$(u_m "\"$M1\",\"$M2\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")")]" 'BATCH14 COVERAGE'
chk "V2b no partial write survived" "initiate,initiate" "$(mem_all)"

seed
want_error "V3 a REPEATED pk is refused" "[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET"),$(e_m "$M1" ",\"set\":$REVOKE_SET")")")]" 'BATCH14 DUPLICATE_PK'
chk "V3b no write survived" "initiate" "$(mem_all)"

seed
want_error "V4 a REPEATED target is refused" "[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")"),$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")")]" 'BATCH14 DUPLICATE_TARGET'
chk "V4b no write survived" "initiate" "$(mem_all)"

seed
want_error "V5 a SKIPPED row whose status moved on is refused" "[$(mem_t "\"seen_pks\":[\"$M1\"],\"intent\":\"skip\",\"entries\":[{\"pk\":\"$M1\",\"original\":{\"plan\":\"initiate\",\"subscription_status\":\"past_due\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"}}]")]" 'BATCH14 CONFLICT'

seed
want_error "V6 a SKIPPED row with no guards at all is refused" "[$(mem_t "\"seen_pks\":[\"$M1\"],\"intent\":\"skip\",\"entries\":[]")]" 'BATCH14 COVERAGE'

seed
want_error "V7 an UPDATE entry with an empty set is refused" "[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ',"set":{}')")")]" 'BATCH14 EMPTY_SET'

seed
want_error "V8 a SKIP entry carrying a set is refused" "[$(mem_t "\"seen_pks\":[\"$M1\"],\"intent\":\"skip\",\"entries\":[$(e_m "$M1" ",\"set\":$REVOKE_SET")]")]" 'BATCH14 SKIP_WITH_SET'

seed
want_error "V9 a second-table validation failure is refused" "[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")"),$(prof_t "$(u_m "\"$P1\"" "$(e_p "$P1" ',"set":{"plan":"free"}'),$(e_p "$P1" ',"set":{"plan":"free"}')")")]" 'BATCH14 DUPLICATE_PK'
chk "V9b the FIRST table was rolled back" "initiate/active/cus_1/sub_A" "$(mem_state)"

echo
echo "=== N. NULL customer guards, and both tables independently ==="
seed
psql -q -c "update public.ut_members set stripe_customer_id=null, stripe_subscription_id=null, plan='guest', subscription_status='canceled';" >/dev/null
chk "N1 an unlinked row is absent for that linkage" "ut_members:absent:0" "$(rpc "[$(mem_t "\"seen_pks\":[],\"intent\":\"update\",\"entries\":[]")]")"

seed
psql -q -c "update public.ut_members set stripe_customer_id=null;" >/dev/null
chk "N2 a NULL CUSTOMER guard matches a NULL customer" "ut_members:updated:1" \
  "$(rpc "[$(mem_t "\"linkage\":{\"customer_id\":null,\"subscription_ids\":[\"sub_A\"]},$(u_m "\"$M1\"" '{"pk":"'$M1'","original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":null,"stripe_subscription_id":"sub_A"},"set":{"plan":"free"}}')")]")"
chk "N2b the write landed" "free/active/<null>/sub_A" "$(mem_state)"

seed
want_error "N3 a NULL customer guard does not match a set customer" "[$(mem_t "$(u_m "\"$M1\"" '{"pk":"'$M1'","original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":null,"stripe_subscription_id":"sub_A"},"set":{"plan":"free"}}')")]" 'BATCH14 CONFLICT'

# profiles-only: there is no ut_members row for that linkage at all
psql -q -c "truncate public.ut_members;" >/dev/null
PAY_PONLY="[$(mem_t "\"seen_pks\":[],\"intent\":\"update\",\"entries\":[]"),$(prof_t "$(u_m "\"$P1\"" "$(e_p "$P1" ',"set":{"plan":"free"}')")")]"
chk "N4 ut_members reports absent while profiles writes" "profiles:updated:1,ut_members:absent:0" "$(rpc "$PAY_PONLY")"
chk "N4b the profiles write landed" "free/active/cus_1/sub_A" "$(prof_state)"

psql -q -c "truncate public.profiles; insert into public.profiles (user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$P1','a@x','initiate','active','cus_1','sub_A'), ('$P2','b@x','initiate','active','cus_1','sub_A');" >/dev/null
want_error "N5 a profiles COVERAGE violation is refused" "[$(prof_t "$(u_m "\"$P1\",\"$P2\"" "$(e_p "$P1" ',"set":{"plan":"free"}')")")]" 'BATCH14 COVERAGE'
psql -q -c "truncate public.profiles; insert into public.profiles (user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$P1','a@x','initiate','active','cus_1','sub_A');" >/dev/null
want_error "N6 a profiles DUPLICATE_PK is refused" "[$(prof_t "$(u_m "\"$P1\"" "$(e_p "$P1" ',"set":{"plan":"free"}'),$(e_p "$P1" ',"set":{"plan":"free"}')")")]" 'BATCH14 DUPLICATE_PK'
want_error "N7 a profiles EMPTY_UPDATE is refused" "[$(prof_t "$(u_m "\"$P1\"" '')")]" 'BATCH14 EMPTY_UPDATE'
want_error "N8 a profiles skip whose guards moved is refused" "[$(prof_t "\"seen_pks\":[\"$P1\"],\"intent\":\"skip\",\"entries\":[{\"pk\":\"$P1\",\"original\":{\"plan\":\"guest\",\"subscription_status\":\"active\",\"stripe_customer_id\":\"cus_1\",\"stripe_subscription_id\":\"sub_A\"}}]")]" 'BATCH14 CONFLICT'

echo
echo "=== CON. two real connections, barriers, BOTH orders ==="
P_FREE="[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ',"set":{"plan":"free"}')")")]"
P_GUEST="[$(mem_t "$(u_m "\"$M1\"" "$(e_m "$M1" ",\"set\":$REVOKE_SET")")")]"

run_order() { # run_order <label> <first-payload> <second-payload> <expected-final-state>
  local label="$1" p1="$2" p2="$3" want="$4"
  rm -f "$BARRIER/one"
  cat > "$BASE/first.sql" <<SQL
begin;
select string_agg(target||':'||outcome||':'||affected, ',' order by target) from public.apply_lifecycle_update(\$j\$$p1\$j\$);
\! touch $BARRIER/one
select pg_sleep(3);
commit;
SQL
  cat > "$BASE/second.sql" <<SQL
select string_agg(target||':'||outcome||':'||affected, ',' order by target) from public.apply_lifecycle_update(\$j\$$p2\$j\$);
SQL
  psql -Atq -v ON_ERROR_STOP=1 -f "$BASE/first.sql" >"$BASE/first.out" 2>&1 &
  local pid=$!
  wait_for "$BARRIER/one"
  psql -Atq -v ON_ERROR_STOP=1 -f "$BASE/second.sql" >"$BASE/second.out" 2>&1; local rc2=$?
  wait "$pid"; local rc1=$?
  chk "$label: the FIRST committer exits 0" "0" "$rc1"
  chk "$label: the FIRST committer reports updated:1" "ut_members:updated:1" "$(head -1 "$BASE/first.out")"
  chk "$label: the SECOND caller exits non-zero" "non-zero" "$([ $rc2 -ne 0 ] && echo non-zero || echo zero)"
  printf '%s' "$(cat "$BASE/second.out")" | grep -q 'BATCH14 CONFLICT' && PASS=$((PASS + 1)) || { FAIL=$((FAIL + 1)); echo "  FAIL: $label: the second caller is refused with CONFLICT (out=$(head -1 "$BASE/second.out"))"; }
  chk "$label: the first committer's state stands" "$want" "$(mem_state)"
}

seed; run_order "CON1 free-first" "$P_FREE" "$P_GUEST" "free/active/cus_1/sub_A"
seed; run_order "CON2 guest-first" "$P_GUEST" "$P_FREE" "guest/canceled/cus_1/<null>"

echo
echo "=== R. absence races with deterministic barriers (KNOWN LIMITS) ==="
ABSENT="[$(mem_t "\"seen_pks\":[],\"intent\":\"update\",\"entries\":[]")]"
race() { # race <label> <barrier-name> <racer-sql> <outfile>
  local label="$1" bname="$2" racer="$3" out="$4"
  rm -f "$BARRIER/$bname"
  cat > "$BASE/race_$bname.sql" <<SQL
begin;
select string_agg(target||':'||outcome||':'||affected, ',' order by target) from public.apply_lifecycle_update(\$j\$$ABSENT\$j\$);
\! touch $BARRIER/$bname
select pg_sleep(3);
commit;
SQL
  psql -Atq -v ON_ERROR_STOP=1 -f "$BASE/race_$bname.sql" >"$out" 2>&1 &
  local pid=$!
  wait_for "$BARRIER/$bname"
  psql -q -c "$racer" >/dev/null
  wait "$pid"; local rc=$?
  chk "$label: the racing caller exits 0" "0" "$rc"
  chk "$label: it reported absent (its snapshot was genuinely empty)" "ut_members:absent:0" "$(head -1 "$out")"
}

psql -q -c "truncate public.ut_members, public.profiles;" >/dev/null
race "R1" "r1" "insert into public.ut_members (id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M1','a@x','initiate','active','cus_1','sub_A');" "$BASE/race1.out"
chk "R1c RACE REPRODUCED: a matching row now exists that the call never saw" "1" "$(q "select count(*) from public.ut_members where stripe_customer_id='cus_1';")"

psql -q -c "truncate public.ut_members, public.profiles; insert into public.ut_members (id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M1','a@x','guest','canceled',null,null);" >/dev/null
race "R2" "r2" "update public.ut_members set stripe_customer_id='cus_1', stripe_subscription_id='sub_A' where id='$M1';" "$BASE/race2.out"
chk "R2c RACE REPRODUCED: an existing row became linked, unseen" "1" "$(q "select count(*) from public.ut_members where stripe_customer_id='cus_1';")"

echo
echo "=== G. replay after success ==="
seed
chk "G0 the first call succeeds" "ut_members:updated:1" "$(rpc "$P_GUEST")"
want_error "G1 an identical replay is REFUSED, not silently accepted" "$P_GUEST" 'BATCH14 CONFLICT'
chk "G2 the post-write state stands" "guest/canceled/cus_1/<null>" "$(mem_state)"
chk "G3 a FRESH snapshot converges (the documented recovery)" "ut_members:updated:1" \
  "$(rpc "[$(mem_t "$(u_m "\"$M1\"" '{"pk":"'$M1'","original":{"plan":"guest","subscription_status":"canceled","stripe_customer_id":"cus_1","stripe_subscription_id":null},"set":{"plan":"initiate","subscription_status":"active","stripe_subscription_id":"sub_A"}}')")]")"

echo
echo "=== H. execution is service-role only ==="
for who in anon authenticated; do
  LAST_OUT=$(psql -Atq -v ON_ERROR_STOP=1 -c "set role $who; select public.apply_lifecycle_update('[]'::jsonb);" 2>&1); LAST_RC=$?
  if [ $LAST_RC -ne 0 ] && printf '%s' "$LAST_OUT" | grep -q 'permission denied'; then PASS=$((PASS + 1));
  else FAIL=$((FAIL + 1)); echo "  FAIL: H $who cannot execute (rc=$LAST_RC, out=$LAST_OUT)"; fi
done
seed
H3=$(psql -Atq -v ON_ERROR_STOP=1 -c "set role service_role; select string_agg(target||':'||outcome||':'||affected, ',' order by target) from public.apply_lifecycle_update(\$j\$$PAY_FULL\$j\$);" 2>&1)
chk "H3 service_role CAN execute it" "profiles:updated:1,ut_members:updated:1" "$H3"

echo
echo "=== I. installation is owned, ACL'd and repeatable ==="
psql -q -v ON_ERROR_STOP=1 -f "$SQL" >"$BASE/migration2.log" 2>&1
chk "I1 reapplying the migration exits 0 (repeatable)" "0" "$?"
chk "I2 the owner is the intended one" "postgres" "$(q "select pg_get_userbyid(proowner) from pg_proc where proname='apply_lifecycle_update';")"
chk "I3 it is SECURITY DEFINER" "t" "$(q "select prosecdef from pg_proc where proname='apply_lifecycle_update';")"
chk "I4 search_path is pinned" "search_path=pg_catalog, public" "$(q "select array_to_string(proconfig,';') from pg_proc where proname='apply_lifecycle_update';")"
chk "I5 service_role has EXECUTE" "t" "$(q "select has_function_privilege('service_role','public.apply_lifecycle_update(jsonb)','EXECUTE');")"
chk "I6 anon has no EXECUTE" "f" "$(q "select has_function_privilege('anon','public.apply_lifecycle_update(jsonb)','EXECUTE');")"
chk "I7 authenticated has no EXECUTE" "f" "$(q "select has_function_privilege('authenticated','public.apply_lifecycle_update(jsonb)','EXECUTE');")"
chk "I8 PUBLIC has no EXECUTE" "0" "$(q "select count(*) from (select (a).grantee as g, (a).privilege_type as p from pg_proc pr, aclexplode(coalesce(pr.proacl, acldefault('f', pr.proowner))) a where pr.proname='apply_lifecycle_update') z where g = 0 and p = 'EXECUTE';")"

echo
echo "=== J. installation is ATOMIC: a failing grant rolls the CREATE back ==="
psql -q -c "drop function public.apply_lifecycle_update(jsonb);" >/dev/null
chk "J1 the function is gone before the test" "" "$(q "select coalesce(to_regprocedure('public.apply_lifecycle_update(jsonb)')::text,'')")"
sed 's/to service_role;/to no_such_role_xyz;/' "$SQL" >"$BASE/broken.sql"
psql -q -v ON_ERROR_STOP=1 -f "$BASE/broken.sql" >"$BASE/broken.out" 2>&1
chk "J2 applying it with a broken final grant exits non-zero" "non-zero" "$([ $? -ne 0 ] && echo non-zero || echo zero)"
chk "J3 the CREATE was rolled back with it (no half-install)" "" "$(q "select coalesce(to_regprocedure('public.apply_lifecycle_update(jsonb)')::text,'')")"
psql -q -v ON_ERROR_STOP=1 -f "$SQL" >"$BASE/migration3.log" 2>&1
chk "J4 reapplying the real migration restores it" "apply_lifecycle_update(jsonb)" "$(q "select coalesce(to_regprocedure('public.apply_lifecycle_update(jsonb)')::text,'')")"
seed
chk "J5 and it still works" "ut_members:updated:1" "$(rpc "$P_GUEST")"

echo
echo "assertions passed: $PASS"
echo "assertions failed: $FAIL"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14U_RPC_HARNESS_FAILED"; exit 1; fi
echo "BATCH14U_RPC_HARNESS_PASSED"
