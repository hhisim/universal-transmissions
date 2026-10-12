#!/usr/bin/env bash
#
# batch14ad-wrapper-coverage-harness.sh
#
# Two questions about the synchronization WRAPPER:
#
#   1. LOCK COVERAGE — does the key set include the REPLACEMENT identities a
#      payload installs via entry.set? A call that locates a row through linkage A
#      but sets its linkage to B is *moving* the row to B, so a concurrent caller
#      targeting B must contend with it. If set.* is not in the key set, it does
#      not.
#
#   2. EXECUTION BOUNDARY — is the wrapper reachable only by the intended role,
#      on both wrappers, on initial installation AND on reapplication?
#
# The pre-repair behaviour is reproduced IN THIS HARNESS by a fixture function
# built from the derivation WITHOUT the replacement contribution, so the gap stays
# visible instead of living only in a git revision.
#
# Discipline: every psql call runs ON_ERROR_STOP=1, and q() RETURNS THE REAL SQL
# EXIT STATUS so permission assertions can branch on it.
#
# Usage: bash scripts/batch14ad-wrapper-coverage-harness.sh
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_REVIEWED="$ROOT/supabase/migrations/20261012_apply_lifecycle_update.sql"
SQL_KEYS="$ROOT/supabase/migrations/20261013_lifecycle_linkage_sync.sql"
SQL_WRAPPER="$ROOT/supabase/migrations/20261014_lifecycle_sync_wrapper.sql"
PGBIN=/usr/lib/postgresql/16/bin

BASE=$(mktemp -d /var/tmp/b14ad-XXXXXX)
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
RC_OUT=0

cleanup() {
  local rc=$?
  trap - EXIT INT TERM HUP
  for p in $PIDS; do kill -TERM "$p" 2>/dev/null; done
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  if [ "$rc" -ne 0 ] || [ "${FAIL:-0}" -ne 0 ]; then
    DIAG=/var/tmp/b14ad-diag-$(date +%s)
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
# q <sql> : prints stdout AND returns the real psql exit status. The previous
# helper printed its output via printf and therefore returned printf's status,
# which silently turned every `if q ...` into a test of printf.
q() {
  printf '%s\n' "$1" >"$BASE/.q.sql"; chmod 644 "$BASE/.q.sql"
  QOUT=$(su postgres -c "PGAPPNAME=super psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/.q.sql" 2>&1)
  QRC=$?
  printf '%s' "$QOUT"
  return "$QRC"
}
as_role() { # as_role <role> <sql-body> -> prints output, sets RC_OUT
  # ONE file: `set role` and the call in the same script, so ON_ERROR_STOP
  # definitely governs the failing statement. Splitting them across -c and -f
  # left the exit status unreliable.
  { printf '\\set VERBOSITY verbose\nset role %s;\n' "$1"; printf '%s\n' "$2"; } >"$BASE/.role.sql"
  chmod 644 "$BASE/.role.sql"
  QOUT=$(su postgres -c "PGAPPNAME=role-$1 psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/.role.sql" 2>&1)
  RC_OUT=$?
  printf '%s' "$QOUT"
}
run_worker() { # run_worker <app> <sqlfile> ; sets WPID
  chmod 644 "$2"
  ( su postgres -c "PGAPPNAME=$1 psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $2" \
      >"$BASE/$1.out" 2>&1; echo $? >"$BASE/$1.rc" ) &
  WPID=$!
  PIDS="$PIDS $WPID"
}
wait_rc() { wait "$2" 2>/dev/null; RC_OUT=$(cat "$BASE/$1.rc" 2>/dev/null); [ -n "${RC_OUT:-}" ] || RC_OUT=1; }
waitfor() { local f="$1" n=0; while [ "$n" -lt "$2" ]; do [ -e "$f" ] && return 0; sleep 0.1; n=$((n + 1)); done; [ -e "$f" ]; }
wait_blocked() { # wait_blocked <waiter> <blocker> <key> <ticks>
  # NOTE the masking. hashtextextended can return a NEGATIVE bigint, and the
  # advisory lock's high 32 bits live in pg_locks.classid, which is an UNSIGNED
  # oid. `(key >> 32)` of a negative bigint is negative and would never equal an
  # oid, so the shift result must be masked back to 32 bits. A wrong mask here can
  # only produce a FALSE NEGATIVE (the check fails loudly), never a false pass.
  local n=0
  while [ "$n" -lt "$4" ]; do
    local r
    r=$(q "select count(*) from pg_stat_activity w
            where w.application_name='$1'
              and exists (select 1 from pg_locks l
                           where l.pid=w.pid and l.locktype='advisory' and not l.granted
                             and l.classid::bigint = ((($3)::bigint >> 32) & 4294967295)
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
head1 "setup"
su postgres -c "$PGBIN/initdb -D $DATA -A trust --no-locale -E UTF8" >"$BASE/initdb.log" 2>&1 \
  || { echo "initdb FAILED"; tail -5 "$BASE/initdb.log"; exit 2; }
su postgres -c "$PGBIN/pg_ctl -D $DATA -o '-k $SOCK -c listen_addresses= -c deadlock_timeout=1s' -l $PLOG -w start" >"$BASE/ctl.log" 2>&1 \
  || { echo "start FAILED"; tail -5 "$PLOG"; exit 2; }

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

REV_SHA=$(sha256sum "$SQL_REVIEWED" | awk '{print $1}')
for f in "$SQL_REVIEWED" "$SQL_KEYS" "$SQL_WRAPPER"; do
  b=$(basename "$f" .sql); cp "$f" "$BASE/$b.sql"; chmod 644 "$BASE/$b.sql"
  su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/$b.sql" >"$BASE/$b.out" 2>&1 \
    || { echo "FAILED to apply $b"; cat "$BASE/$b.out"; exit 2; }
done
chkeq "the reviewed RPC is installed" "apply_lifecycle_update" \
  "$(q "select proname from pg_proc where proname='apply_lifecycle_update'")"
chkeq "the reviewed file is unchanged on disk" "$REV_SHA" "$(sha256sum "$SQL_REVIEWED" | awk '{print $1}')"
echo "  fixture: the PRE-REPAIR derivation, built here so the gap stays visible"

# The pre-repair derivation, exactly as the wrapper had it: declared linkage and
# entry.original only. entry.set is NOT consulted.
q "create or replace function public.b14ad_keys_pre_repair(p_targets jsonb)
   returns bigint[] language plpgsql immutable as \$f\$
   declare v_target jsonb; v_entry jsonb; v_val text; v_keys bigint[] := array[]::bigint[];
   begin
     if p_targets is null or jsonb_typeof(p_targets) <> 'array' then return array[]::bigint[]; end if;
     for v_target in select jsonb_array_elements(p_targets) loop
       v_val := nullif(v_target->'linkage'->>'customer_id','');
       if v_val is not null then v_keys := v_keys || public.b14ab_linkage_key('customer', v_val); end if;
       for v_val in select nullif(x,'') from jsonb_array_elements_text(coalesce(v_target->'linkage'->'subscription_ids','[]'::jsonb)) x loop
         if v_val is not null then v_keys := v_keys || public.b14ab_linkage_key('subscription', v_val); end if;
       end loop;
       for v_entry in select jsonb_array_elements(coalesce(v_target->'entries','[]'::jsonb)) loop
         v_val := nullif(v_entry->'original'->>'stripe_customer_id','');
         if v_val is not null then v_keys := v_keys || public.b14ab_linkage_key('customer', v_val); end if;
         v_val := nullif(v_entry->'original'->>'stripe_subscription_id','');
         if v_val is not null then v_keys := v_keys || public.b14ab_linkage_key('subscription', v_val); end if;
       end loop;
     end loop;
     return (select coalesce(array_agg(distinct k order by k), array[]::bigint[]) from unnest(v_keys) k);
   end \$f\$;" >/dev/null
q "create or replace function public.b14ad_apply_pre_repair(p_targets jsonb)
   returns table (target text, outcome text, affected integer, located_pks uuid[])
   language plpgsql as \$f\$
   declare k bigint;
   begin
     foreach k in array public.b14ad_keys_pre_repair(p_targets) loop
       perform pg_advisory_xact_lock(k);
     end loop;
     return query select * from public.apply_lifecycle_update(p_targets);
   end \$f\$;" >/dev/null
chkeq "the pre-repair fixture is installed" "2" \
  "$(q "select count(*) from pg_proc where proname in ('b14ad_keys_pre_repair','b14ad_apply_pre_repair')")"

M1='11111111-1111-1111-1111-111111111111'
M2='22222222-2222-2222-2222-222222222222'
P1='33333333-3333-3333-3333-333333333333'
CUS='cus_1'; SUB='sub_A'; CUS2='cus_2'; SUB2='sub_B'
k_c() { q "select public.b14ab_linkage_key('customer','$1')"; }
k_s() { q "select public.b14ab_linkage_key('subscription','$1')"; }
seed1() { q "truncate public.ut_members, public.profiles;
   insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$M1','a@x','initiate','active','$CUS','$SUB');
   insert into public.profiles(user_id,email,plan,subscription_status,stripe_customer_id,stripe_subscription_id) values ('$P1','a@x','initiate','active','$CUS','$SUB');" >/dev/null; }

# Payloads. The move payload locates the row through cus_1/sub_A and REPLACES the
# linkage with cus_2/sub_B through entry.set.
mv_set() { printf ',"set":{"stripe_customer_id":%s,"stripe_subscription_id":%s}' "$(jv "$1")" "$(jv "$2")"; }
jv() { if [ -z "$1" ]; then printf 'null'; else printf '"%s"' "$1"; fi; }
ent() { printf '{"pk":"%s","original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":"%s","stripe_subscription_id":"%s"}%s}' "$1" "$CUS" "$SUB" "$2"; }
tgt_m() { printf '{"target":"ut_members","linkage":{"customer_id":"%s","subscription_ids":["%s"]},"intent":"update","seen_pks":[%s],"entries":[%s]}' "$CUS" "$SUB" "$1" "$2"; }
tgt_p() { printf '{"target":"profiles","linkage":{"customer_id":"%s","subscription_ids":["%s"]},"intent":"update","seen_pks":[%s],"entries":[%s]}' "$CUS" "$SUB" "$1" "$2"; }
J() { printf '[%s]' "$1"; }

# ---------------------------------------------------------------- A
head1 "A: the key set must include REPLACEMENT identities from entry.set"
MOVE_M=$(J "$(tgt_m "\"$M1\"" "$(ent "$M1" "$(mv_set "$CUS2" "$SUB2")")")")
chkeq "A1 a customer replacement contributes its key" "1" \
  "$(q "select ($(k_c "$CUS2") = any(public.b14ac_linkage_keys_for_payload(\$j\$$MOVE_M\$j\$)))::int")"
chkeq "A2 a subscription replacement contributes its key" "1" \
  "$(q "select ($(k_s "$SUB2") = any(public.b14ac_linkage_keys_for_payload(\$j\$$MOVE_M\$j\$)))::int")"
chkeq "A3 the declared AND original identities are still covered" "1" \
  "$(q "select (($(k_c "$CUS") = any(k)) and ($(k_s "$SUB") = any(k)))::int from public.b14ac_linkage_keys_for_payload(\$j\$$MOVE_M\$j\$) k")"
chkeq "A4 the set is deduplicated and ascending" "1" \
  "$(q "select (k = (select array_agg(distinct x order by x) from unnest(k) x))::int from public.b14ac_linkage_keys_for_payload(\$j\$$MOVE_M\$j\$) k")"
NULLPAY=$(J "$(tgt_m "\"$M1\"" "$(ent "$M1" "$(mv_set "" "")")")")
chkeq "A5 a NULL replacement contributes NO key (declared+original only = 2)" "2" \
  "$(q "select array_length(public.b14ac_linkage_keys_for_payload(\$j\$$NULLPAY\$j\$),1)")"
chkeq "A6 the repaired set has exactly the two replacement keys MORE than the pre-repair set" "2" \
  "$(q "select (array_length(public.b14ac_linkage_keys_for_payload(\$j\$$MOVE_M\$j\$),1)
            - array_length(public.b14ad_keys_pre_repair(\$j\$$MOVE_M\$j\$),1))::int")"
chkeq "A7 the replacement key is absent from the PRE-REPAIR set (the gap)" "0" \
  "$(q "select ($(k_c "$CUS2") = any(public.b14ad_keys_pre_repair(\$j\$$MOVE_M\$j\$)))::int")"
MOVE_P=$(J "$(tgt_p "\"$P1\"" "$(ent "$P1" "$(mv_set "$CUS2" "$SUB2")")")")
chkeq "A9 the same holds on profiles" "1" \
  "$(q "select ($(k_c "$CUS2") = any(public.b14ac_linkage_keys_for_payload(\$j\$$MOVE_P\$j\$)))::int")"
MULTI=$(printf '[%s,%s]' "$(tgt_m "\"$M1\"" "$(ent "$M1" "$(mv_set "$CUS2" "")")")" "$(tgt_p "\"$P1\"" "$(ent "$P1" "$(mv_set "" "$SUB2")")")")
chkeq "A10 multiple targets union their replacement keys" "1" \
  "$(q "select (($(k_c "$CUS2") = any(k)) and ($(k_s "$SUB2") = any(k)))::int from public.b14ac_linkage_keys_for_payload(\$j\$$MULTI\$j\$) k")"

# ---------------------------------------------------------------- B
head1 "B: a concurrent caller targeting the REPLACEMENT must contend"
race_move() { # race_move <label> <fn> <expect blocked|allowed> <tag>
  local label="$1" fn="$2" expect="$3" tag="$4"
  local k2; k2=$(k_c "$CUS2")
  rm -f "$GATE/${tag}_"*
  seed1
  cat >"$BASE/$tag.s1.sql" <<EOF
\\set VERBOSITY verbose
begin;
select * from public.$fn(\$j\$$MOVE_M\$j\$);
\\! touch $GATE/${tag}_relocating
\\! for i in \$(seq 1 300); do [ -f $GATE/${tag}_writer_done ] && break; [ -f $GATE/${tag}_go ] && break; sleep 0.1; done
\\! [ -f $GATE/${tag}_go ] || touch $GATE/${tag}_gate_timeout
\\! if [ -f $GATE/${tag}_writer_done ]; then touch $GATE/${tag}_inside; else touch $GATE/${tag}_absent; fi
commit;
EOF
  cat >"$BASE/$tag.s2.sql" <<EOF
\\set VERBOSITY verbose
begin;
select pg_advisory_xact_lock($k2);
insert into public.ut_members(id,email,plan,subscription_status,stripe_customer_id) values ('$M2','b@x','initiate','active','$CUS2');
commit;
\\! touch $GATE/${tag}_writer_done
EOF
  run_worker "$tag.s1" "$BASE/$tag.s1.sql"; local W1=$WPID
  waitfor "$GATE/${tag}_relocating" 150 || bad "$label: s1 never reached its window"
  run_worker "$tag.s2" "$BASE/$tag.s2.sql"; local W2=$WPID
  if [ "$expect" = "blocked" ]; then
    if wait_blocked "$tag.s2" "$tag.s1" "$k2" 150; then
      ok "$label: the caller targeting the replacement is blocked BY s1 ON the replacement key"
    else
      bad "$label: the caller targeting the replacement was NEVER blocked on it"
    fi
  else
    if waitfor "$GATE/${tag}_writer_done" 150; then
      ok "$label: the caller targeting the replacement committed inside the window (gap reproduced)"
    else
      bad "$label: expected the caller to get in, and it did not"
    fi
  fi
  touch "$GATE/${tag}_go"
  local R1 R2
  wait_rc "$tag.s1" "$W1"; R1=$RC_OUT
  wait_rc "$tag.s2" "$W2"; R2=$RC_OUT
  chkeq "$label: s1 committed cleanly" "0" "$R1"
  chkeq "$label: s2 committed cleanly" "0" "$R2"
  if [ "$expect" = "blocked" ]; then
    chkeq "$label: the replacement caller did NOT commit inside the window" "1" \
      "$([ -f "$GATE/${tag}_absent" ] && echo 1 || echo 0)"
  else
    chkeq "$label: the replacement caller DID commit inside the window" "1" \
      "$([ -f "$GATE/${tag}_inside" ] && echo 1 || echo 0)"
  fi
}
race_move "B1 pre-repair (reproduction)" "b14ad_apply_pre_repair" allowed b1
race_move "B2 repaired wrapper" "apply_lifecycle_update_sync" blocked b2
chkeq "B3 both rows are linked to the replacement customer" "2" \
  "$(q "select count(*) from public.ut_members where stripe_customer_id='$CUS2'")"

# ---------------------------------------------------------------- C
head1 "C: the execution boundary on BOTH wrappers"
chkeq "C1 the per-identity wrapper is SECURITY INVOKER" "f" \
  "$(q "select prosecdef from pg_proc where proname='apply_lifecycle_update_sync'")"
chkeq "C2 the global wrapper is SECURITY INVOKER" "f" \
  "$(q "select prosecdef from pg_proc where proname='apply_lifecycle_update_sync_global'")"
chkeq "C3 both wrappers are owned by postgres" "2" \
  "$(q "select count(*) from pg_proc p join pg_roles r on r.oid=p.proowner
          where p.proname in ('apply_lifecycle_update_sync','apply_lifecycle_update_sync_global') and r.rolname='postgres'")"
acl() { # acl <role> <fn>
  q "select has_function_privilege('$1','public.$2(jsonb)','EXECUTE')::int"
}
chkeq "C4 anon cannot execute the per-identity wrapper" "0" "$(acl anon apply_lifecycle_update_sync)"
chkeq "C5 authenticated cannot execute it" "0" "$(acl authenticated apply_lifecycle_update_sync)"
chkeq "C6 service_role can" "1" "$(acl service_role apply_lifecycle_update_sync)"
chkeq "C7 anon cannot execute the global wrapper" "0" "$(acl anon apply_lifecycle_update_sync_global)"
chkeq "C8 authenticated cannot execute it" "0" "$(acl authenticated apply_lifecycle_update_sync_global)"
chkeq "C9 service_role can" "1" "$(acl service_role apply_lifecycle_update_sync_global)"

PAY=$(J "$(tgt_m "\"$M1\"" "$(ent "$M1" ',"set":{"plan":"free"}')")")
CALL="select * from public.apply_lifecycle_update_sync(\$j\$$PAY\$j\$);"
# as_role is called with output REDIRECTED, never inside $(...): a command
# substitution would run it in a subshell and RC_OUT would be set there.
seed1
as_role anon "$CALL" >"$BASE/c_anon.out" 2>&1; RC=$RC_OUT
OUT=$(cat "$BASE/c_anon.out")
chkeq "C10 an actual call under anon FAILS" "1" "$([ "$RC" -ne 0 ] && echo 1 || echo 0)"
chkeq "C11 the anon failure is a permission denial" "1" \
  "$(printf '%s' "$OUT" | grep -c '42501\|permission denied' || true)"
chkeq "C12 the anon call changed no membership state" "initiate" \
  "$(q "select plan from public.ut_members where id='$M1'")"
seed1
as_role authenticated "$CALL" >"$BASE/c_auth.out" 2>&1; RC=$RC_OUT
OUT=$(cat "$BASE/c_auth.out")
chkeq "C13 an actual call under authenticated FAILS" "1" "$([ "$RC" -ne 0 ] && echo 1 || echo 0)"
chkeq "C13b the authenticated failure is a permission denial" "1" \
  "$(printf '%s' "$OUT" | grep -c '42501\|permission denied' || true)"
chkeq "C14 the authenticated call changed no membership state" "initiate" \
  "$(q "select plan from public.ut_members where id='$M1'")"
seed1
as_role service_role "$CALL" >"$BASE/c_svc.out" 2>&1; RC=$RC_OUT
chkeq "C15 an actual call under service_role SUCCEEDS" "0" "$RC"
chkeq "C16 and it applies the real contract" "free" \
  "$(q "select plan from public.ut_members where id='$M1'")"
# Rollback under the authorized role, through the wrapper.
seed1
RBAD=$(J "$(tgt_m "\"$M1\"" "$(ent "$M1" ',"set":{"plan":"free"}')"),$(tgt_p "\"$M2\"" "$(ent "$P1" ',"set":{"plan":"free"}')")")
as_role service_role "select * from public.apply_lifecycle_update_sync(\$j\$$RBAD\$j\$);" >"$BASE/c_rb.out" 2>&1
OUT=$(cat "$BASE/c_rb.out")
chkeq "C17 a failing authorized call still reports the RPC's own error" "1" \
  "$(printf '%s' "$OUT" | grep -c 'BATCH14 NEWLY_LINKED' || true)"
chkeq "C18 and its rollback is preserved through the wrapper" "initiate" \
  "$(q "select plan from public.ut_members where id='$M1'")"
# Reapplication must leave the same ACLs.
su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/$(basename "$SQL_WRAPPER" .sql).sql" >"$BASE/reapply.out" 2>&1 \
  || { bad "C19 REAPPLICATION FAILED"; cat "$BASE/reapply.out"; }
chkeq "C19 reapplication succeeds" "0" "$([ -s "$BASE/reapply.out" ] && echo 1 || echo 0)"
chkeq "C20 anon still cannot execute after reapplication" "0" "$(acl anon apply_lifecycle_update_sync)"
chkeq "C21 service_role still can after reapplication" "1" "$(acl service_role apply_lifecycle_update_sync)"
chkeq "C22 the wrapper is still SECURITY INVOKER after reapplication" "f" \
  "$(q "select prosecdef from pg_proc where proname='apply_lifecycle_update_sync'")"

# ---------------------------------------------------------------- D
head1 "D: q() must return the real SQL exit status"
q "select 1" >/dev/null; RC=$?
chkeq "D1 q returns 0 for a statement that succeeds" "0" "$RC"
q "select 1/0" >/dev/null 2>&1; RC=$?
chkeq "D2 q returns NON-ZERO for a statement that fails" "1" "$([ "$RC" -ne 0 ] && echo 1 || echo 0)"
if q "select * from public.no_such_function_xyz()" >/dev/null 2>&1; then
  bad "D3 a failing call is not reported as success by q"
else
  ok "D3 a failing call is not reported as success by q"
fi
if q "select 1" >/dev/null 2>&1; then ok "D4 a succeeding call is reported as success by q"; else bad "D4 a succeeding call is reported as failure"; fi

printf '\nassertions passed: %d\nassertions failed: %d\nnotes: %d\n' "$PASS" "$FAIL" "$NOTES"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14AD_HARNESS_FAILED"; exit 1; fi
echo "BATCH14AD_HARNESS_PASSED"
