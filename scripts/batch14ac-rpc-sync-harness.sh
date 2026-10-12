#!/usr/bin/env bash
#
# batch14ac-rpc-sync-harness.sh — validate synchronization AGAINST THE REVIEWED
# RPC, on its real two-table schema, in an isolated PostgreSQL cluster.
#
# The reviewed migration (20261012_apply_lifecycle_update.sql) is loaded
# BYTE-IDENTICAL and is never redefined. The synchronization layer lives in a
# separate file (20261014_lifecycle_sync_wrapper.sql) and the key helpers in
# 20261013_lifecycle_linkage_sync.sql.
#
# Design rules this harness follows:
#   * EVERY psql invocation runs with ON_ERROR_STOP=1. A failing statement aborts
#     the script, so a `\!` completion marker can only be written after a
#     successful COMMIT. Worker exit statuses are captured and asserted.
#   * NO timing assumptions. A holder is released only after the harness has
#     OBSERVED a specific waiter blocked BY the expected backend ON the expected
#     advisory key. Waits are bounded; a bound that expires fails the case and
#     dumps diagnostics.
#   * The deadlock case does not assume which transaction becomes the victim: it
#     asserts the named SQLSTATE, that exactly one transaction was aborted, and
#     that the other committed.
#
# Usage: bash scripts/batch14ac-rpc-sync-harness.sh
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_REVIEWED="$ROOT/supabase/migrations/20261012_apply_lifecycle_update.sql"
SQL_KEYS="$ROOT/supabase/migrations/20261013_lifecycle_linkage_sync.sql"
SQL_WRAPPER="$ROOT/supabase/migrations/20261014_lifecycle_sync_wrapper.sql"
PGBIN=/usr/lib/postgresql/16/bin
GATE_TICKS="${GATE_TICKS:-300}"     # 30s bound for a holder waiting for release
BLOCK_TICKS="${BLOCK_TICKS:-150}"   # 15s bound for observing the expected wait

BASE=$(mktemp -d /var/tmp/b14ac-XXXXXX)
DATA="$BASE/data"; SOCK="$BASE/sock"; PLOG="$BASE/pg.log"; GATE="$BASE/gate"
mkdir -p "$SOCK" "$GATE"
chown -R postgres:postgres "$BASE"
chmod 777 "$GATE"
PIDS=""

PASS=0; FAIL=0; NOTES=0
ok()   { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }
chkeq() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi; }
note() { NOTES=$((NOTES + 1)); printf '  ..   %s\n' "$1"; }
head1() { printf '\n=== %s ===\n' "$1"; }

cleanup() {
  local rc=$?
  trap - EXIT INT TERM HUP
  for p in $PIDS; do kill -TERM "$p" 2>/dev/null; done
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  if [ "$rc" -ne 0 ] || [ "${FAIL:-0}" -ne 0 ]; then
    DIAG=/var/tmp/b14ac-diag-$(date +%s)
    mkdir -p "$DIAG"; chmod 755 "$DIAG"
    cp -a "$BASE"/*.out "$BASE"/*.rc "$BASE"/*.sql "$BASE"/pg.log "$DIAG"/ 2>/dev/null
    echo "  diagnostics preserved: $DIAG"
  fi
  find "$BASE" -mindepth 1 -depth -delete 2>/dev/null
  rmdir "$BASE" 2>/dev/null
  exit "$rc"
}
trap cleanup EXIT INT TERM HUP

# ---------------------------------------------------------------- plumbing
q() { # q <sql> ; prints stdout, sets QRC. Always ON_ERROR_STOP=1.
  printf '%s\n' "$1" >"$BASE/.q.sql"; chmod 644 "$BASE/.q.sql"
  QOUT=$(su postgres -c "PGAPPNAME=super psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/.q.sql" 2>&1)
  QRC=$?
  printf '%s' "$QOUT"
}
run_worker() { # run_worker <app> <sqlfile> ; sets WPID
  chmod 644 "$2"
  ( su postgres -c "PGAPPNAME=$1 psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $2" \
      >"$BASE/$1.out" 2>&1; echo $? >"$BASE/$1.rc" ) &
  WPID=$!
  PIDS="$PIDS $WPID"
}
wait_rc() { # wait_rc <app> <shellpid> -> sets RC_OUT (never call inside $())
  # `wait` only works for a child of the CURRENT shell. Calling this from a
  # command substitution would put it in a subshell where the job is not a
  # child, so `wait` returns immediately and the status file may not exist yet.
  wait "$2" 2>/dev/null
  RC_OUT=$(cat "$BASE/$1.rc" 2>/dev/null)
  [ -n "${RC_OUT:-}" ] || RC_OUT=1
}
waitfor() { local f="$1" n=0; while [ "$n" -lt "$2" ]; do [ -e "$f" ] && return 0; sleep 0.1; n=$((n + 1)); done; [ -e "$f" ]; }
pidof_app() { q "select coalesce(max(pid),0) from pg_stat_activity where application_name='$1'"; }
keyof() { q "select public.b14ab_linkage_key('$1','$2')"; }

# Evidence-driven gate: has <waiter> an UNGRANTED advisory lock on <key> while
# being blocked BY <blocker>? This is the condition for releasing the holder.
wait_blocked() { # wait_blocked <waiter> <blocker> <key> <ticks>
  local n=0
  while [ "$n" -lt "$4" ]; do
    local r
    r=$(q "select count(*) from pg_stat_activity w
            where w.application_name='$1'
              and exists (select 1 from pg_locks l
                           where l.pid=w.pid and l.locktype='advisory' and not l.granted
                             and l.classid::bigint = (($3)::bigint >> 32)
                             and l.objid::bigint   = (($3)::bigint & 4294967295))
              and exists (select 1 from unnest(pg_blocking_pids(w.pid)) bp
                            join pg_stat_activity b on b.pid=bp
                           where b.application_name='$2')")
    [ "$(printf '%s' "$r" | tr -d ' ')" = "1" ] && return 0
    sleep 0.1; n=$((n + 1))
  done
  return 1
}

# ---------------------------------------------------------------- setup
head1 "setup: cluster, real schema, UNCHANGED reviewed RPC"
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses= -c deadlock_timeout=1s' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }
chkeq "no TCP listener" "0" "$(q "select count(*) from pg_settings where name='listen_addresses' and setting<>''")"

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
create role service_role nologin;
grant usage on schema public to anon, authenticated, service_role;
EOF
chmod 644 "$BASE/schema.sql"
su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/schema.sql" >"$BASE/schema.out" 2>&1 \
  || { echo "schema FAILED"; cat "$BASE/schema.out"; exit 2; }
echo "  schema + roles ready"

# The reviewed migration, applied byte-identically.
REV_SHA_BEFORE=$(sha256sum "$SQL_REVIEWED" | awk '{print $1}')
cp "$SQL_REVIEWED" "$BASE/reviewed.sql"; chmod 644 "$BASE/reviewed.sql"
su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/reviewed.sql" >"$BASE/reviewed.out" 2>&1 \
  || { echo "REVIEWED MIGRATION FAILED"; tail -20 "$BASE/reviewed.out"; exit 2; }
chkeq "the reviewed RPC is installed" "apply_lifecycle_update" \
  "$(q "select proname from pg_proc where proname='apply_lifecycle_update'")"
chkeq "the reviewed file was not modified by applying it" "$REV_SHA_BEFORE" "$(sha256sum "$SQL_REVIEWED" | awk '{print $1}')"

for f in "$SQL_KEYS" "$SQL_WRAPPER"; do
  b=$(basename "$f" .sql)
  cp "$f" "$BASE/$b.sql"; chmod 644 "$BASE/$b.sql"
  su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/$b.sql" >"$BASE/$b.out" 2>&1 \
    || { echo "FAILED to apply $b"; cat "$BASE/$b.out"; exit 2; }
done
chkeq "the key helpers are present (the wrapper's declared dependency)" "1" \
  "$(q "select count(*) from pg_proc where proname='b14ab_linkage_key'")"
chkeq "the synchronized entry point is present" "apply_lifecycle_update_sync" \
  "$(q "select proname from pg_proc where proname='apply_lifecycle_update_sync'")"

# ---------------------------------------------------------------- fixtures
M1='11111111-1111-1111-1111-111111111111'
M2='22222222-2222-2222-2222-222222222222'
M3='55555555-5555-5555-5555-555555555555'
P1='33333333-3333-3333-3333-333333333333'
P2='44444444-4444-4444-4444-444444444444'
P3='66666666-6666-6666-6666-666666666666'
CUS='cus_1'; SUB='sub_A'

# Entry builders mirroring the reviewed contract exactly: the entry's snapshot
# key is "original" (four guard fields), and coverage must be exact. A guard for
# a NULL column must be JSON null — an empty STRING is not distinct from NULL in
# the RPC's `is not distinct from` comparison, so "" would fail the guard.
jv() { if [ -z "$1" ]; then printf 'null'; else printf '"%s"' "$1"; fi; }
e() { printf '{"pk":"%s","original":{"plan":"%s","subscription_status":"%s","stripe_customer_id":%s,"stripe_subscription_id":%s}%s}' \
        "$1" "${4:-initiate}" "${5:-active}" "$(jv "$2")" "$(jv "$3")" "$6"; }
seen() { local IFS=,; printf '%s' "$*"; }
target_m() { printf '{"target":"ut_members","linkage":{"customer_id":"%s","subscription_ids":["%s"]},"intent":"update","seen_pks":[%s],"entries":[%s]}' "$CUS" "$SUB" "$1" "$2"; }
target_p() { printf '{"target":"profiles","linkage":{"customer_id":"%s","subscription_ids":["%s"]},"intent":"update","seen_pks":[%s],"entries":[%s]}' "$CUS" "$SUB" "$1" "$2"; }
run_payload() { # run_payload <fn> <targets-json> -> outcome string or ERROR text
  { printf '\\set VERBOSITY verbose\n'
    printf "select coalesce(string_agg(target || ':' || outcome || ':' || affected, ',' order by target), '<none>') from public.%s(\$json\$%s\$json\$);\n" "$1" "$2"
  } >"$BASE/.p.sql"
  chmod 644 "$BASE/.p.sql"
  su postgres -c "PGAPPNAME=super psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/.p.sql" 2>&1
}
seed() { q "truncate public.ut_members, public.profiles;
           insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id)
             values ('$M1','a@x','initiate','active','$CUS','$SUB');
           insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id)
             values ('$P1','a@x','initiate','active','$CUS','$SUB');" >/dev/null; }
mem_state() { q "select coalesce(plan,'<null>')||'/'||coalesce(subscription_status,'<null>')||'/'||coalesce(stripe_customer_id,'<null>')||'/'||coalesce(stripe_subscription_id,'<null>') from public.ut_members where id='$M1'"; }
prof_state() { q "select coalesce(plan,'<null>')||'/'||coalesce(subscription_status,'<null>')||'/'||coalesce(stripe_customer_id,'<null>')||'/'||coalesce(stripe_subscription_id,'<null>') from public.profiles where user_id='$P1'"; }

# ---------------------------------------------------------------- E
head1 "E: SQL errors fail the experiment; markers follow a successful COMMIT"
cat >"$BASE/e_ok.sql" <<EOF
\\set VERBOSITY verbose
begin;
select count(*) from public.ut_members;
commit;
\\! touch $GATE/e_ok_done
EOF
cat >"$BASE/e_bad.sql" <<EOF
\\set VERBOSITY verbose
begin;
select count(*) from public.ut_members;
select 1/0;
commit;
\\! touch $GATE/e_bad_done
EOF
rm -f "$GATE"/e_*
chmod 644 "$BASE"/e_*.sql
run_worker e_ok "$BASE/e_ok.sql"; E1=$WPID
run_worker e_bad "$BASE/e_bad.sql"; E2=$WPID
R_OK=""; R_BAD=""
wait_rc e_ok "$E1";  R_OK=$RC_OUT
wait_rc e_bad "$E2"; R_BAD=$RC_OUT
chkeq "E1 a clean script exits 0" "0" "$R_OK"
chkeq "E2 a failing statement exits NON-ZERO under ON_ERROR_STOP" "3" "$R_BAD"
chkeq "E3 the failure names the SQLSTATE (22012 division by zero)" "1" \
  "$(grep -c '22012' "$BASE/e_bad.out" || true)"
chkeq "E4 the failing script's marker was NOT written (COMMIT never ran)" "0" \
  "$([ -f "$GATE/e_bad_done" ] && echo 1 || echo 0)"
chkeq "E5 the successful script's marker WAS written after its COMMIT" "1" \
  "$([ -f "$GATE/e_ok_done" ] && echo 1 || echo 0)"

# ---------------------------------------------------------------- G + B
# A single race driver. <label> <entrypoint> <writer_sql> <expect_blocked>
seed_relink() { # seed_relink <m|p> — a linked row AND a separate unlinked row
  if [ "$1" = "m" ]; then
    q "truncate public.ut_members, public.profiles;
       insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M1','a@x','initiate','active','$CUS','$SUB');
       insert into public.ut_members(id,email) values ('$M3','unlinked@x');
       insert into public.profiles(user_id,email) values ('$P1','a@x');" >/dev/null
  else
    q "truncate public.ut_members, public.profiles;
       insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$P1','a@x','initiate','active','$CUS','$SUB');
       insert into public.profiles(user_id,email) values ('$P3','unlinked@x');
       insert into public.ut_members(id,email) values ('$M1','a@x');" >/dev/null
  fi
}

race2() { # race2 <label> <fn> <writer_sql> <blocked|allowed> <tag> <m|p> <std|relink> [cooperate]
  local label="$1" fn="$2" writer="$3" expect="$4" tag="$5" tbl="$6" mode="$7" coop="${8:-yes}"
  local pk tgt
  if [ "$tbl" = "m" ]; then pk="$M1"; tgt="target_m"; else pk="$P1"; tgt="target_p"; fi
  # The expected key depends on the entrypoint: the per-identity wrapper contends
  # on the linkage key, the trigger-aligned one contends on the GLOBAL key the
  # trigger also takes. Checking the wrong key is exactly how a barrier check
  # becomes vacuous.
  local k
  case "$fn" in
    *global*) k=$(q "select public.b14ab_linkage_global_key()") ;;
    *)        k=$(keyof customer "$CUS") ;;
  esac
  rm -f "$GATE/${tag}_"*
  if [ "$mode" = "relink" ]; then seed_relink "$tbl"; else seed; fi
  # s1: the RPC (or its synchronized wrapper) for THIS table, held open across
  # the window. Its snapshot covers exactly the row it located.
  cat >"$BASE/$tag.s1.sql" <<EOF
\\set VERBOSITY verbose
begin;
select * from public.$fn(\$json\$[$($tgt "\"$pk\"" "$(e "$pk" "$CUS" "$SUB" "" '' ',"set":{"plan":"free"}')")]\$json\$);
\\! touch $GATE/${tag}_relocating
\\! for i in \$(seq 1 $GATE_TICKS); do [ -f $GATE/${tag}_writer_done ] && break; [ -f $GATE/${tag}_go ] && break; sleep 0.1; done
\\! [ -f $GATE/${tag}_go ] || touch $GATE/${tag}_gate_timeout
\\! if [ -f $GATE/${tag}_writer_done ]; then touch $GATE/${tag}_inside; else touch $GATE/${tag}_absent; fi
commit;
\\! touch $GATE/${tag}_committed
EOF
  # s2: the competing writer. When told to cooperate it takes the SAME key first;
  # with a trigger installed it need not, because the trigger takes it for it.
  local pre=""
  [ "$expect" = "blocked" ] && [ "$coop" = "yes" ] && pre="select pg_advisory_xact_lock($k);"
  cat >"$BASE/$tag.s2.sql" <<EOF
\\set VERBOSITY verbose
begin;
$pre
$writer
commit;
\\! touch $GATE/${tag}_writer_done
EOF
  chmod 644 "$BASE/$tag.s1.sql" "$BASE/$tag.s2.sql"
  run_worker "$tag.s1" "$BASE/$tag.s1.sql"; local W1=$WPID
  waitfor "$GATE/${tag}_relocating" "$BLOCK_TICKS" || bad "$label: s1 never reached its window"
  run_worker "$tag.s2" "$BASE/$tag.s2.sql"; local W2=$WPID
  # GATE. The holder is released ONLY once the expected outcome has been
  # established by observation, never on a timer:
  #   blocked — the specific waiter is blocked BY the expected backend ON the
  #             expected advisory key;
  #   allowed — the competing writer has actually committed (its marker follows
  #             its COMMIT), so the window is known to have overlapped it.
  if [ "$expect" = "blocked" ]; then
    if wait_blocked "$tag.s2" "$tag.s1" "$k" "$BLOCK_TICKS"; then
      ok "$label: the writer is blocked BY $tag.s1 ON the expected key (observed)"
    else
      bad "$label: the writer was never observed blocked by the expected backend on the expected key"
    fi
  else
    if waitfor "$GATE/${tag}_writer_done" "$BLOCK_TICKS"; then
      ok "$label: the competing writer committed while the RPC held its window"
    else
      bad "$label: the competing writer never got in — the baseline did not reproduce"
    fi
  fi
  touch "$GATE/${tag}_go"
  local R1 R2
  wait_rc "$tag.s1" "$W1"; R1=$RC_OUT
  wait_rc "$tag.s2" "$W2"; R2=$RC_OUT
  # The gate-timeout marker is only an invariant failure on the BLOCKED path: it
  # means the holder burned its whole bound because it was never released. On the
  # baseline path the holder legitimately breaks on the writer's marker before the
  # gate opens, which is the race being reproduced.
  if [ "$expect" = "blocked" ]; then
    chkeq "$label: no gate timeout" "0" "$([ -f "$GATE/${tag}_gate_timeout" ] && echo 1 || echo 0)"
  fi
  chkeq "$label: s1 committed cleanly" "0" "$R1"
  chkeq "$label: s2 committed cleanly" "0" "$R2"
  if [ "$expect" = "blocked" ]; then
    chkeq "$label: the writer did NOT commit inside the window" "1" "$([ -f "$GATE/${tag}_absent" ] && echo 1 || echo 0)"
  else
    chkeq "$label: the writer DID commit inside the window (race reproduced)" "1" "$([ -f "$GATE/${tag}_inside" ] && echo 1 || echo 0)"
  fi
  # The competing writer must have actually DONE something — otherwise the case
  # passes vacuously against an UPDATE that matched no rows.
  if [ "$mode" = "relink" ]; then
    if [ "$tbl" = "m" ]; then
      chkeq "$label: the unlinked row really was relinked to the linkage" "$CUS" \
        "$(q "select coalesce(stripe_customer_id,'<null>') from public.ut_members where id='$M3'")"
    else
      chkeq "$label: the unlinked row really was relinked to the linkage" "$CUS" \
        "$(q "select coalesce(stripe_customer_id,'<null>') from public.profiles where user_id='$P3'")"
    fi
  else
    if [ "$tbl" = "m" ]; then
      chkeq "$label: the competing INSERT really landed" "1" \
        "$(q "select count(*) from public.ut_members where stripe_customer_id='$CUS' and id<>'$M1'")"
    else
      chkeq "$label: the competing INSERT really landed" "1" \
        "$(q "select count(*) from public.profiles where stripe_customer_id='$CUS' and user_id<>'$P1'")"
    fi
  fi
  echo "    s1: $(tr '\n' ' ' <"$BASE/$tag.s1.out" | tr -s ' ' | cut -c1-80)"
  echo "    s2: $(tr '\n' ' ' <"$BASE/$tag.s2.out" | tr -s ' ' | cut -c1-80)"
}

head1 "B1: INSERT race on ut_members — baseline (reviewed RPC) vs wrapper"
race2 "B1 baseline" "apply_lifecycle_update" \
  "insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id) values ('$M2','new@x','initiate','active','$CUS');" \
  "allowed" "b1base" m std
race2 "B1 wrapper" "apply_lifecycle_update_sync" \
  "insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id) values ('$M2','new@x','initiate','active','$CUS');" \
  "blocked" "b1sync" m std

head1 "B2: relink race on ut_members — baseline vs wrapper"
race2 "B2 baseline" "apply_lifecycle_update" \
  "update public.ut_members set stripe_customer_id='$CUS', plan='initiate', subscription_status='active' where id='$M3';" \
  "allowed" "b2base" m relink
race2 "B2 wrapper" "apply_lifecycle_update_sync" \
  "update public.ut_members set stripe_customer_id='$CUS', plan='initiate', subscription_status='active' where id='$M3';" \
  "blocked" "b2sync" m relink

head1 "B3: INSERT race on profiles — baseline vs wrapper"
race2 "B3 baseline" "apply_lifecycle_update" \
  "insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id) values ('$P2','new@x','initiate','active','$CUS');" \
  "allowed" "b3base" p std
race2 "B3 wrapper" "apply_lifecycle_update_sync" \
  "insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id) values ('$P2','new@x','initiate','active','$CUS');" \
  "blocked" "b3sync" p std

head1 "B4: relink race on profiles — baseline vs wrapper"
race2 "B4 baseline" "apply_lifecycle_update" \
  "update public.profiles set stripe_customer_id='$CUS', plan='initiate', subscription_status='active' where user_id='$P3';" \
  "allowed" "b4base" p relink
race2 "B4 wrapper" "apply_lifecycle_update_sync" \
  "update public.profiles set stripe_customer_id='$CUS', plan='initiate', subscription_status='active' where user_id='$P3';" \
  "blocked" "b4sync" p relink

# ---------------------------------------------------------------- W2
head1 "W2: writer-first fixture — seen_pks holds EVERY pre-existing matching row"
q "truncate public.ut_members, public.profiles;
   insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values
     ('$M1','a@x','initiate','active','$CUS','$SUB'),
     ('$M2','b@x','initiate','active','$CUS','$SUB');
   insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values
     ('$P1','a@x','initiate','active','$CUS','$SUB');" >/dev/null
SEEN2="\"$M1\",\"$M2\""
ENT2="$(e "$M1" "$CUS" "$SUB" "" '' ',"set":{"plan":"free"}'),$(e "$M2" "$CUS" "$SUB" "" '' ',"set":{"plan":"free"}')"
chkeq "W1 the fixture really has two pre-existing matching rows" "2" \
  "$(q "select count(*) from public.ut_members where stripe_customer_id='$CUS'")"
chkeq "W2 with BOTH in seen_pks the call is accepted (fixture baseline)" "ut_members:updated:2" \
  "$(run_payload apply_lifecycle_update_sync "[$(target_m "$SEEN2" "$ENT2")]" | tr -d ' ')"
# Now ONE new matching row appears, and the caller's snapshot still lists only
# the original two. Rejection must depend on the newcomer.
q "insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id) values ('$M3','new@x','initiate','active','$CUS');" >/dev/null
OUT=$(run_payload apply_lifecycle_update_sync "[$(target_m "$SEEN2" "$ENT2")]")
chkeq "W3 the call is now REJECTED as NEWLY_LINKED" "1" \
  "$(printf '%s' "$OUT" | grep -c 'BATCH14 NEWLY_LINKED' || true)"
chkeq "W4 and the rejection names the offending row via located/seen" "1" \
  "$(printf '%s' "$OUT" | grep -c "$M3" || true)"
chkeq "W5 the rejected call wrote nothing (the newcomer keeps its own values)" "initiate" \
  "$(q "select plan from public.ut_members where id='$M3'")"
# Control: add the newcomer to seen_pks AND bring the guards up to the state the
# accepted call left — the call must proceed, so W3's rejection depended on the
# NEW row specifically, not on coverage.
SEEN3="$SEEN2,\"$M3\""
ENT3="$(e "$M1" "$CUS" "$SUB" "free" "active" ',"set":{"plan":"guest"}'),$(e "$M2" "$CUS" "$SUB" "free" "active" ',"set":{"plan":"guest"}'),$(e "$M3" "$CUS" "" "initiate" "active" ',"set":{"plan":"free"}')"
chkeq "W6 the control (new row in seen_pks, guards current) is ACCEPTED" "ut_members:updated:3" \
  "$(run_payload apply_lifecycle_update_sync "[$(target_m "$SEEN3" "$ENT3")]" | tr -d ' ')"
# Genuinely absent linkage: no matching row at all, with other rows present.
chkeq "W7 genuinely absent linkage (no seed row matches) returns absent" "ut_members:absent:0" \
  "$(run_payload apply_lifecycle_update_sync "[{\"target\":\"ut_members\",\"linkage\":{\"customer_id\":\"cus_NONE\",\"subscription_ids\":[\"sub_NONE\"]},\"intent\":\"update\",\"seen_pks\":[],\"entries\":[]}]" | tr -d ' ')"

# ---------------------------------------------------------------- RB
head1 "RB: atomic rollback survives the wrapper"
q "truncate public.ut_members, public.profiles;
   insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M1','a@x','initiate','active','$CUS','$SUB');
   insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$P1','a@x','initiate','active','$CUS','$SUB');" >/dev/null
# Second target declares a snapshot that no longer matches its located set.
RBPAY="[$(target_m "\"$M1\"" "$(e "$M1" "$CUS" "$SUB" "" '' ',"set":{"plan":"free"}')"),$(target_p "\"$P2\"" "$(e "$P1" "$CUS" "$SUB" "" '' ',"set":{"plan":"free"}')")]"
RBOUT=$(run_payload apply_lifecycle_update_sync "$RBPAY")
chkeq "RB1 the whole call fails on the second target" "1" \
  "$(printf '%s' "$RBOUT" | grep -c 'BATCH14 NEWLY_LINKED' || true)"
chkeq "RB2 the FIRST target's write was rolled back with it" "initiate" \
  "$(q "select plan from public.ut_members where id='$M1'")"
chkeq "RB3 and the second target is untouched" "initiate" \
  "$(q "select plan from public.profiles where user_id='$P1'")"

# ---------------------------------------------------------------- D3
head1 "D3: the trigger candidate covers DIRECT writers (both tables)"
# The trigger takes the GLOBAL key, so the RPC path must take the SAME global key
# for the two to contend. apply_lifecycle_update_sync (per-identity) does NOT, and
# does not compose with the trigger — that was measured, not assumed.
q "select public.b14ac_install_trigger('shared')" >/dev/null
chkeq "D3 setup: the shared statement trigger is installed" "shared" "$(q "select public.b14ac_install_trigger('shared')")"
race2 "D3a ut_members" "apply_lifecycle_update_sync_global" \
  "insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id) values ('$M2','raw@x','initiate','active','$CUS');" \
  "blocked" "d3a" m std no
race2 "D3b profiles" "apply_lifecycle_update_sync_global" \
  "insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id) values ('$P2','raw@x','initiate','active','$CUS');" \
  "blocked" "d3b" p std no
# Non-composition, asserted rather than glossed: the PER-IDENTITY wrapper does not
# hold the global key the trigger uses, so a direct writer is NOT blocked by it.
race2 "D3c non-composition" "apply_lifecycle_update_sync" \
  "insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id) values ('$M2','raw@x','initiate','active','$CUS');" \
  "allowed" "d3c" m std no
q "select public.b14ac_install_trigger('none')" >/dev/null

# ---------------------------------------------------------------- U
head1 "U: the shared-lock upgrade case"
upgrade_case() { # upgrade_case <shared|exclusive> <tag>
  local mode="$1" tag="u_$1"
  local g; g=$(q "select public.b14ab_linkage_global_key()")
  q "select public.b14ac_install_trigger('$mode')" >/dev/null
  rm -f "$GATE/${tag}_"*
  q "truncate public.ut_members, public.profiles;
     insert into public.ut_members(id,email) values ('$M1','a@x'),('$M2','b@x');
     insert into public.profiles(user_id,email) values ('$P1','a@x');" >/dev/null
  # Each transaction does membership DML on a DISJOINT row (taking the trigger's
  # key), then asks for the EXCLUSIVE key before committing.
  for n in 1 2; do
    local row; [ "$n" = "1" ] && row="$M1" || row="$M2"
    cat >"$BASE/$tag.$n.sql" <<EOF
\\set VERBOSITY verbose
begin;
update public.ut_members set plan='u$n' where id='$row';
\\! touch $GATE/${tag}_${n}_dml
\\! for i in \$(seq 1 100); do [ -f $GATE/${tag}_$((3 - n))_dml ] && break; sleep 0.1; done
select public.b14ab_acquire_global_lock(false);
commit;
\\! touch $GATE/${tag}_${n}_done
EOF
    chmod 644 "$BASE/$tag.$n.sql"
  done
  run_worker "$tag.1" "$BASE/$tag.1.sql"; local W1=$WPID
  run_worker "$tag.2" "$BASE/$tag.2.sql"; local W2=$WPID
  waitfor "$GATE/${tag}_1_dml" "$BLOCK_TICKS" >/dev/null
  waitfor "$GATE/${tag}_2_dml" "$BLOCK_TICKS" >/dev/null || note "$mode: the second DML did not reach its gate (expected in the exclusive variant)"
  local R1 R2
  wait_rc "$tag.1" "$W1"; R1=$RC_OUT
  wait_rc "$tag.2" "$W2"; R2=$RC_OUT
  local D1 D2
  D1=$(grep -c '40P01' "$BASE/$tag.1.out" || true)
  D2=$(grep -c '40P01' "$BASE/$tag.2.out" || true)
  local victims=$((D1 + D2))
  echo "    $mode: deadlock in t1=$D1 t2=$D2 | rc1=$R1 rc2=$R2 | funds ${g:0:12}..."
  if [ "$mode" = "shared" ]; then
    chkeq "U1 shared variant: EXACTLY ONE transaction is a deadlock victim" "1" "$victims"
    chkeq "U2 shared variant: the victim reports SQLSTATE 40P01" "1" "$([ "$D1" = "1" ] || [ "$D2" = "1" ] && echo 1 || echo 0)"
    local SURV=$(( $( [ -f "$GATE/${tag}_1_done" ] && echo 1 || echo 0 ) + $( [ -f "$GATE/${tag}_2_done" ] && echo 1 || echo 0 ) ))
    note "U3 shared variant: victim is $( [ "$D1" = "1" ] && echo 't1' || echo 't2' ) (not assumed in advance)"
    chkeq "U4 shared variant: EXACTLY ONE transaction survived and committed" "1" "$SURV"
    chkeq "U5 shared variant: the survivor's own write is present" "1" \
      "$(q "select count(*) from public.ut_members where plan in ('u1','u2')")"
  else
    chkeq "U6 exclusive variant: NO deadlock" "0" "$victims"
    chkeq "U7 exclusive variant: both transactions committed" "0" "$((R1 + R2))"
    chkeq "U8 exclusive variant: both rows carry their own write" "u1,u2" \
      "$(q "select string_agg(plan, ',' order by plan) from public.ut_members")"
  fi
  q "select public.b14ac_install_trigger('none')" >/dev/null
}
upgrade_case shared
upgrade_case exclusive

printf '\nassertions passed: %d\nassertions failed: %d\nnotes: %d\n' "$PASS" "$FAIL" "$NOTES"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14AC_HARNESS_FAILED"; exit 1; fi
echo "BATCH14AC_HARNESS_PASSED"
