#!/usr/bin/env bash
#
# batch14ab-sync-harness.sh — ISOLATED PostgreSQL harness for the linkage
# synchronization PROTOTYPE.
#
# Private cluster, private unix socket, no TCP listener, synthetic rows, torn
# down at the end INCLUDING its data directory. Failure diagnostics are copied
# out before teardown.
#
# It measures, rather than assumes:
#   K  the key protocol: customer-only, subscription-only, mixed, multiple
#      subscription ids, old/new linkage changes, dedup, order invariance.
#   L  locks are acquired BEFORE relocation and before any row lock.
#   R  the R1/R2 absence races, baseline (no sync) versus prototype (keys).
#   W  writer-first rejection controls (a row that appeared after the caller's
#      snapshot is reported, not written).
#   D  a DIRECT SQL writer that ignores the protocol is NOT constrained by it.
#   T  the trigger proposal's LOCK ORDER: does a writer blocking on the
#      advisory key already hold a row lock? Deadlocks are reported, not hidden.
#
# Usage: bash scripts/batch14ab-sync-harness.sh
#
set -u

SQLPROTO="$(cd "$(dirname "$0")/.." && pwd)/supabase/migrations/20261013_lifecycle_linkage_sync.sql"
PGBIN=/usr/lib/postgresql/16/bin
SETTLE="${SETTLE:-2}"          # seconds to let a statement reach its wait state
WINDOW="${WINDOW:-80}"         # 0.1s ticks a racing transaction holds its window

BASE=$(mktemp -d /var/tmp/b14ab-XXXXXX)
DATA="$BASE/data"; SOCK="$BASE/sock"; PLOG="$BASE/pg.log"; GATE="$BASE/gate"
mkdir -p "$SOCK" "$GATE"
chown -R postgres:postgres "$BASE"     # AFTER creating every subdirectory
chmod 777 "$GATE"
WORKERS=""

PASS=0; FAIL=0; NOTES=0
ok()   { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }
chkeq() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi; }
note() { NOTES=$((NOTES + 1)); printf '  ..   %s\n' "$1"; }
head1() { printf '\n=== %s ===\n' "$1"; }

cleanup() {
  local rc=$?
  trap - EXIT INT TERM HUP
  [ -n "${WORKERS:-}" ] && for p in $WORKERS; do kill -TERM "$p" 2>/dev/null; done
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  # Preserve diagnostics on failure BEFORE removing anything.
  if [ "$rc" -ne 0 ] || [ "${FAIL:-0}" -ne 0 ]; then
    DIAG=/var/tmp/b14ab-diag-$(date +%s)
    mkdir -p "$DIAG"; chmod 755 "$DIAG"
    cp -a "$BASE"/*.out "$BASE"/*.sql "$BASE"/pg.log "$DIAG"/ 2>/dev/null
    echo "  diagnostics preserved: $DIAG"
  fi
  # Handle the data directory safely: it is removed, not left behind.
  find "$BASE" -mindepth 1 -depth -delete 2>/dev/null
  rmdir "$BASE" 2>/dev/null
  exit "$rc"
}
trap cleanup EXIT INT TERM HUP

q() { su postgres -c "PGAPPNAME=super psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=0 -c \"$(printf '%s' "$1" | sed 's/"/\\"/g')\"" 2>&1 | tr -d '\r'; }
qw() { su postgres -c "PGAPPNAME=$1 psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=0 -c \"$(printf '%s' "$2" | sed 's/"/\\"/g')\"" 2>&1 | tr -d '\r'; }

start_worker() { # start_worker <name> <sqlfile> ; sets WPID
  ( PGAPPNAME="$1" su postgres -c "PGAPPNAME=$1 psql -h $SOCK -d postgres -X -q -f $2" >"$BASE/$1.out" 2>&1 ) &
  WPID=$!
  WORKERS="$WORKERS $WPID"
}
waitfor() { # waitfor <file> <ticks>
  local f="$1" n=0
  while [ "$n" -lt "$2" ]; do [ -e "$f" ] && return 0; sleep 0.1; n=$((n + 1)); done
  [ -e "$f" ]
}
waitq() { # waitq <sql> <expected> <ticks>
  local n=0
  while [ "$n" -lt "$3" ]; do
    [ "$(q "$1" | tr -d ' ')" = "$2" ] && return 0
    sleep 0.1; n=$((n + 1))
  done
  [ "$(q "$1" | tr -d ' ')" = "$2" ]
}
pidof_app() { q "select coalesce(max(pid),0) from pg_stat_activity where application_name='$1'"; }

# ---------------------------------------------------------------- set up
head1 "setup: private cluster"
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses= -c deadlock_timeout=1s' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "cluster start FAILED"; tail -5 "$PLOG"; exit 2; }
echo "  $(q 'select version()' | cut -c1-40)"
chkeq "no TCP listener" "" "$(q "select coalesce(string_agg(setting,';'),'') from pg_settings where name='listen_addresses' and setting<>''")"

cp "$SQLPROTO" "$BASE/proto.sql"
su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/proto.sql" >"$BASE/proto.out" 2>&1 \
  || { echo "prototype SQL FAILED"; cat "$BASE/proto.out"; exit 2; }
echo "  prototype applied (NOT a production migration)"

q "create table public.ut_members (
     id bigint primary key,
     email text not null,
     customer_id text,
     subscription_id text,
     plan text,
     subscription_status text)" >/dev/null
q "insert into public.ut_members values (9001,'known@x','cus_1','sub_A','guest','canceled')" >/dev/null
echo "  schema + seed rows ready"

# ---------------------------------------------------------------- K
head1 "K: the key protocol"
chkeq "K1 customer-only yields exactly one key" "t" \
  "$(q "select public.b14ab_linkage_keys('cus_1',null,'cus_1',null) = array[public.b14ab_linkage_key('customer','cus_1')]")"
chkeq "K2 subscription-only yields exactly one key" "t" \
  "$(q "select public.b14ab_linkage_keys(null,'sub_A',null,'sub_A') = array[public.b14ab_linkage_key('subscription','sub_A')]")"
chkeq "K3 mixed linkage yields BOTH keys, ascending" "t" \
  "$(q "select public.b14ab_linkage_keys(null,null,'cus_1','sub_A') = (select array_agg(k order by k) from (select public.b14ab_linkage_key('customer','cus_1') k union select public.b14ab_linkage_key('subscription','sub_A') k) t)")"
chkeq "K4 multiple subscription ids: old AND new are covered" "t" \
  "$(q "select public.b14ab_linkage_keys(null,'sub_A',null,'sub_B') = (select array_agg(k order by k) from (select public.b14ab_linkage_key('subscription','sub_A') k union select public.b14ab_linkage_key('subscription','sub_B') k) t)")"
chkeq "K5 old/new customer change covers both sides" "t" \
  "$(q "select public.b14ab_linkage_keys('cus_1',null,'cus_2',null) = (select array_agg(k order by k) from (select public.b14ab_linkage_key('customer','cus_1') k union select public.b14ab_linkage_key('customer','cus_2') k) t)")"
chkeq "K6 repeated identities deduplicate" "2" \
  "$(q "select array_length(public.b14ab_linkage_keys('cus_1','sub_A','cus_1','sub_A'),1)")"
chkeq "K7 key set is invariant under old/new swap" \
  "$(q "select public.b14ab_linkage_keys('cus_1',null,'cus_2',null)")" \
  "$(q "select public.b14ab_linkage_keys('cus_2',null,'cus_1',null)")"
chkeq "K8 empty identities yield an empty set" "0" \
  "$(q "select coalesce(array_length(public.b14ab_linkage_keys(null,null,null,null),1),0)")"
chkeq "K9 customer and subscription keys never collide" "t" \
  "$(q "select public.b14ab_linkage_key('customer','X') <> public.b14ab_linkage_key('subscription','X')")"

# ---------------------------------------------------------------- L
head1 "L: locks are acquired BEFORE relocation, before any row lock"
rm -f "$GATE"/l_*
cat >"$BASE/l_holder.sql" <<EOF
begin;
select pg_advisory_xact_lock(public.b14ab_linkage_key('customer','cus_1'));
\\! touch $GATE/l_held
\\! for i in \$(seq 1 100); do [ -f $GATE/l_go ] && break; sleep 0.1; done
commit;
EOF
cat >"$BASE/l_rpc.sql" <<EOF
select outcome from public.b14ab_lifecycle_apply('cus_1',null,'cus_1',null,array[9001]::bigint[],'initiate','active');
EOF
start_worker l_holder "$BASE/l_holder.sql"; LH=$WPID
waitfor "$GATE/l_held" 100 || bad "L: the key holder never reported holding the key"
ok "L1 an independent session holds the cus_1 key"
start_worker l_rpc "$BASE/l_rpc.sql"; LR=$WPID
sleep "$SETTLE"
LPID=$(pidof_app l_rpc)
chkeq "L2 the RPC is BLOCKED on an advisory lock" "1" \
  "$(q "select count(*) from pg_locks where pid=$LPID and locktype='advisory' and not granted")"
chkeq "L3 while blocked it holds NO tuple/transaction lock (so no row lock yet)" "0" \
  "$(q "select count(*) from pg_locks where pid=$LPID and locktype in ('tuple','transactionid')")"
chkeq "L4 and it has not written the row" "guest|canceled" \
  "$(q "select plan||'|'||subscription_status from public.ut_members where id=9001")"
touch "$GATE/l_go"
waitq "select count(*) from pg_stat_activity where application_name in ('l_holder','l_rpc') and state='active'" "0" 200
wait $LH 2>/dev/null; wait $LR 2>/dev/null
chkeq "L5 after release the RPC proceeds and applies the write" "initiate|active" \
  "$(q "select plan||'|'||subscription_status from public.ut_members where id=9001")"
# reset
q "update public.ut_members set plan='guest', subscription_status='canceled' where id=9001" >/dev/null

# ---------------------------------------------------------------- R
# R1: a matching INSERT that tries to commit between relocation and commit.
race() { # race <label> <fn> <writer_sql> <expect> [seed_sql]
  local label="$1" fn="$2" writer="$3" expect="$4" seed="${5:-}"
  local tag="$label"
  rm -f "$GATE/${tag}_"*
  q "delete from public.ut_members where id in (9101,9201)" >/dev/null
  [ -n "$seed" ] && q "$seed" >/dev/null
  # s1 records INSIDE-vs-ABSENT at the instant its window closes. Checking from
  # the harness after the fact would race the writer's own completion, which
  # happens milliseconds after s1 commits.
  cat >"$BASE/$tag.s1.sql" <<EOF
begin;
select outcome from public.$fn(null,null,'cus_1',null,array[9001]::bigint[],'initiate','active');
\\! touch $GATE/${tag}_relocated
\\! for i in \$(seq 1 $WINDOW); do [ -f $GATE/${tag}_writer_done ] && break; sleep 0.1; done
\\! if [ -f $GATE/${tag}_writer_done ]; then touch $GATE/${tag}_inside; else touch $GATE/${tag}_absent; fi
\\! touch $GATE/${tag}_window_closed
commit;
EOF
  cat >"$BASE/$tag.s2.sql" <<EOF
begin;
select pg_advisory_xact_lock(public.b14ab_linkage_key('customer','cus_1'));
$writer
commit;
\\! touch $GATE/${tag}_writer_done
EOF
  start_worker "$tag.s1" "$BASE/$tag.s1.sql"; local W1=$WPID
  waitfor "$GATE/${tag}_relocated" 200 || bad "$label: the RPC never reached its window"
  start_worker "$tag.s2" "$BASE/$tag.s2.sql"; local W2=$WPID
  waitfor "$GATE/${tag}_window_closed" 400 >/dev/null
  if [ -f "$GATE/${tag}_inside" ]; then
    if [ "$expect" = "blocked" ]; then bad "$label: the competing writer COMMITTED inside the window"
    else ok "$label: the competing writer committed inside the window (race reproduced)"; fi
  elif [ -f "$GATE/${tag}_absent" ]; then
    if [ "$expect" = "blocked" ]; then ok "$label: the competing writer did NOT commit inside the window"
    else bad "$label: the competing writer was blocked but was expected to commit"; fi
  else
    bad "$label: the window closed without recording an observation"
  fi
  if [ "$expect" = "blocked" ]; then
    if waitfor "$GATE/${tag}_writer_done" 300; then
      ok "$label: the writer completed only AFTER the RPC committed (blocked, not failed)"
    else
      bad "$label: the writer never completed at all"
    fi
  fi
  wait $W1 2>/dev/null; wait $W2 2>/dev/null
  echo "    s1: $(tr '\n' ' ' <"$BASE/$tag.s1.out" | tr -s ' ' | cut -c1-90)"
  echo "    s2: $(tr '\n' ' ' <"$BASE/$tag.s2.out" | tr -s ' ' | cut -c1-90)"
}

head1 "R1: matching INSERT between relocation and commit"
race "r1_base" "b14ab_lifecycle_apply_nosync" \
  "insert into public.ut_members values (9101,'new@x','cus_1',null,'initiate','active');" "allowed"
race "r1_sync" "b14ab_lifecycle_apply" \
  "insert into public.ut_members values (9101,'new@x','cus_1',null,'initiate','active');" "blocked"
chkeq "R1 sync: the inserted row survives and was not clobbered" "new@x|initiate" \
  "$(q "select email||'|'||plan from public.ut_members where id=9101")"

head1 "R2: existing-row relink between relocation and commit"
R2SEED="insert into public.ut_members values (9201,'unlinked@x',null,null,'guest','canceled')"
race "r2_base" "b14ab_lifecycle_apply_nosync" \
  "update public.ut_members set customer_id='cus_1', plan='initiate', subscription_status='active' where id=9201;" "allowed" "$R2SEED"
race "r2_sync" "b14ab_lifecycle_apply" \
  "update public.ut_members set customer_id='cus_1', plan='initiate', subscription_status='active' where id=9201;" "blocked" "$R2SEED"
chkeq "R2 sync: the relinked row survives with the writer's values" "cus_1|initiate|active" \
  "$(q "select coalesce(customer_id,'~')||'|'||plan||'|'||subscription_status from public.ut_members where id=9201")"

# ---------------------------------------------------------------- W
head1 "W: writer-first rejection controls"
q "delete from public.ut_members where id in (9101,9201)" >/dev/null
qw w_writer "begin; select pg_advisory_xact_lock(public.b14ab_linkage_key('customer','cus_1')); insert into public.ut_members values (9101,'new@x','cus_1',null,'initiate','active'); commit;" >/dev/null
chkeq "W1 a row exists that the caller's snapshot did not contain" "1" \
  "$(q "select count(*) from public.ut_members where id=9101")"
chkeq "W2 the prototype reports newly_linked rather than writing" "newly_linked" \
  "$(q "select outcome from public.b14ab_lifecycle_apply(null,null,'cus_1',null,array[]::bigint[],'guest','canceled')")"
chkeq "W3 and the competing writer's committed state is preserved" "initiate|active" \
  "$(q "select plan||'|'||subscription_status from public.ut_members where id=9101")"

# ---------------------------------------------------------------- D
head1 "D: a direct SQL writer that ignores the protocol"
q "delete from public.ut_members where id in (9101,9201)" >/dev/null
rm -f "$GATE/d_"*
cat >"$BASE/d.s1.sql" <<EOF
begin;
select outcome from public.b14ab_lifecycle_apply(null,null,'cus_1',null,array[9001]::bigint[],'initiate','active');
\\! touch $GATE/d_relocated
\\! for i in \$(seq 1 $WINDOW); do [ -f $GATE/d_writer_done ] && break; sleep 0.1; done
\\! if [ -f $GATE/d_writer_done ]; then touch $GATE/d_inside; else touch $GATE/d_absent; fi
\\! touch $GATE/d_window_closed
commit;
EOF
cat >"$BASE/d.s2.sql" <<EOF
begin;
insert into public.ut_members values (9101,'raw@x','cus_1',null,'initiate','active');
commit;
\\! touch $GATE/d_writer_done
EOF
start_worker d.s1 "$BASE/d.s1.sql"; D1=$WPID
waitfor "$GATE/d_relocated" 200 >/dev/null
start_worker d.s2 "$BASE/d.s2.sql"; D2=$WPID
waitfor "$GATE/d_window_closed" 400 >/dev/null
if [ -f "$GATE/d_inside" ]; then
  ok "D1 a writer that takes no key is NOT constrained (the protocol is cooperative)"
elif [ -f "$GATE/d_absent" ]; then
  bad "D1 the direct writer did not complete inside the window (unexpected)"
else
  bad "D1 the window closed without recording an observation"
fi
wait $D1 2>/dev/null; wait $D2 2>/dev/null

# ---------------------------------------------------------------- T
head1 "T: the trigger proposal's lock ordering"
trig_test() { # trig_test <row|stmt> <yes|no: deadlock expected>
  local kind="$1"
  local expect_deadlock="$2"
  local tag="t_$kind"
  q "select public.b14ab_install_trigger('$kind')" >/dev/null
  q "delete from public.ut_members where id=9301" >/dev/null
  q "insert into public.ut_members values (9301,'trig@x',null,null,'guest','canceled')" >/dev/null
  rm -f "$GATE/${tag}_"*
  # S1 stands in for the RPC's ORDER: advisory key first, row lock second.
  cat >"$BASE/$tag.s1.sql" <<EOF
begin;
select public.b14ab_acquire_global_lock(false);
\\! touch $GATE/${tag}_key
\\! for i in \$(seq 1 150); do [ -f $GATE/${tag}_go ] && break; sleep 0.1; done
select id from public.ut_members where id=9301 for update;
select 'S1-ACQUIRED' as s1_marker;
commit;
EOF
  # S2 is a DIRECT SQL writer: no advisory lock of its own, only the trigger.
  cat >"$BASE/$tag.s2.sql" <<EOF
begin;
update public.ut_members set plan='trig' where id=9301;
select 'S2-ACQUIRED' as s2_marker;
commit;
\\! touch $GATE/${tag}_s2done
EOF
  start_worker "$tag.s1" "$BASE/$tag.s1.sql"; local W1=$WPID
  waitfor "$GATE/${tag}_key" 200 || bad "T-$kind: S1 never took the global key"
  start_worker "$tag.s2" "$BASE/$tag.s2.sql"; local W2=$WPID
  sleep "$SETTLE"
  local S2PID; S2PID=$(pidof_app "$tag.s2")
  local waits; waits=$(q "select count(*) from pg_locks where pid=$S2PID and locktype='advisory' and not granted")
  chkeq "T-$kind: the direct writer is waiting on the advisory key" "1" "$waits"
  touch "$GATE/${tag}_go"
  wait $W1 2>/dev/null; wait $W2 2>/dev/null
  local dead="none"
  grep -q "40P01\|deadlock detected" "$BASE/$tag.s1.out" && dead="S1"
  grep -q "40P01\|deadlock detected" "$BASE/$tag.s2.out" && dead="${dead}+S2"
  echo "    $kind: deadlock -> $dead"
  if [ "$dead" != "none" ]; then
    if [ "$expect_deadlock" = "yes" ]; then
      ok "T-$kind: a DEADLOCK was detected ($dead) — the writer held the row and then sought the key"
    else
      bad "T-$kind: an UNEXPECTED deadlock ($dead)"
    fi
  else
    if [ "$expect_deadlock" = "no" ]; then
      ok "T-$kind: NO deadlock — the key is taken before any row lock"
    else
      bad "T-$kind: a deadlock was expected and none occurred"
    fi
  fi
  chkeq "T-$kind: the row ends in the writer's committed state" "trig" \
    "$(q "select plan from public.ut_members where id=9301")"
  echo "    s1: $(tr '\n' ' ' <"$BASE/$tag.s1.out" | tr -s ' ' | cut -c1-110)"
  echo "    s2: $(tr '\n' ' ' <"$BASE/$tag.s2.out" | tr -s ' ' | cut -c1-110)"
}

# D2: does a TRIGGER constrain the direct writer that D1 showed the cooperative
# protocol cannot? Measured with the statement-level variant installed.
trig_direct_writer() { # trig_direct_writer <row|stmt>
  local kind="$1"
  local tag="d2_$kind"
  q "select public.b14ab_install_trigger('$kind')" >/dev/null
  q "delete from public.ut_members where id in (9101,9201)" >/dev/null
  rm -f "$GATE/${tag}_"*
  cat >"$BASE/$tag.s1.sql" <<EOF
begin;
select public.b14ab_acquire_global_lock(false);
\\! touch $GATE/${tag}_relocated
\\! for i in \$(seq 1 $WINDOW); do [ -f $GATE/${tag}_writer_done ] && break; sleep 0.1; done
\\! if [ -f $GATE/${tag}_writer_done ]; then touch $GATE/${tag}_inside; else touch $GATE/${tag}_absent; fi
\\! touch $GATE/${tag}_window_closed
commit;
EOF
  cat >"$BASE/$tag.s2.sql" <<EOF
begin;
insert into public.ut_members values (9101,'raw@x','cus_2',null,'initiate','active');
commit;
\\! touch $GATE/${tag}_writer_done
EOF
  start_worker "$tag.s1" "$BASE/$tag.s1.sql"; local W1=$WPID
  waitfor "$GATE/${tag}_relocated" 200 >/dev/null
  start_worker "$tag.s2" "$BASE/$tag.s2.sql"; local W2=$WPID
  waitfor "$GATE/${tag}_window_closed" 400 >/dev/null
  if [ -f "$GATE/${tag}_absent" ]; then
    ok "D2-$kind: with the $kind trigger installed the direct writer IS blocked"
  elif [ -f "$GATE/${tag}_inside" ]; then
    bad "D2-$kind: with the $kind trigger installed the direct writer still committed inside the window"
  else
    bad "D2-$kind: the window closed without recording an observation"
  fi
  wait $W1 2>/dev/null; wait $W2 2>/dev/null
}

echo
echo "  (note: pg_locks shows a 'tuple' lock only for SELECT ... FOR UPDATE. A"
echo "   plain UPDATE's row lock is not visible there, so the DEADLOCK itself is"
echo "   the evidence for the row trigger's ordering, not a lock count.)"
echo
trig_test row yes
echo
trig_test stmt no
echo
trig_direct_writer stmt
echo
trig_direct_writer row
q "select public.b14ab_install_trigger('none')" >/dev/null

printf '\nassertions passed: %d\nassertions failed: %d\nnotes: %d\n' "$PASS" "$FAIL" "$NOTES"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14AB_SYNC_HARNESS_FAILED"; exit 1; fi
echo "BATCH14AB_SYNC_HARNESS_PASSED"
