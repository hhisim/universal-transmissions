#!/usr/bin/env bash
#
# batch14ad-key-mutations.sh — prove the REPLACEMENT-key contribution in the
# wrapper's key derivation is load-bearing.
#
# The tracked wrapper file is NEVER modified. Each mutation is applied to a
# DISPOSABLE COPY, in patch form, and applied to the private cluster; the named
# assertion must then FAIL. The tracked file's sha256 is verified before and
# after the whole run.
#
#   MU-REPL-C     remove only the customer replacement contribution -> A1 fails
#   MU-REPL-S     remove only the subscription replacement contribution -> A2 fails
#   MU-REPL-BOTH  remove the whole entry.set block -> both fail
#
# Usage: bash scripts/batch14ad-key-mutations.sh
#
set -u

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SQL_REVIEWED="$ROOT/supabase/migrations/20261012_apply_lifecycle_update.sql"
SQL_KEYS="$ROOT/supabase/migrations/20261013_lifecycle_linkage_sync.sql"
SQL_WRAPPER="$ROOT/supabase/migrations/20261014_lifecycle_sync_wrapper.sql"
PGBIN=/usr/lib/postgresql/16/bin

BASE=$(mktemp -d /var/tmp/b14admut-XXXXXX)
DATA="$BASE/data"; SOCK="$BASE/sock"; PLOG="$BASE/pg.log"
mkdir -p "$SOCK"
chown -R postgres:postgres "$BASE"
CHILD=""

cleanup() {
  local rc=$?
  trap - EXIT INT TERM HUP
  [ -n "$CHILD" ] && kill -TERM "$CHILD" 2>/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $DATA -m immediate stop" >/dev/null 2>&1
  if [ "${FAIL:-0}" -ne 0 ] || [ "$rc" -ne 0 ]; then
    DIAG=/var/tmp/b14admut-diag-$(date +%s); mkdir -p "$DIAG"; chmod 755 "$DIAG"
    cp -a "$BASE"/*.out "$BASE"/*.sql "$BASE"/pg.log "$DIAG"/ 2>/dev/null
    echo "  diagnostics preserved: $DIAG"
  fi
  find "$BASE" -mindepth 1 -depth -delete 2>/dev/null
  rmdir "$BASE" 2>/dev/null
  exit "$rc"
}
trap cleanup EXIT INT TERM HUP

ORIG=$(sha256sum "$SQL_WRAPPER" | awk '{print $1}')
echo "tracked wrapper sha256 BEFORE: $ORIG"
PASS=0; FAIL=0
ok()   { PASS=$((PASS + 1)); printf '  ok   %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  FAIL %s\n' "$1"; }
chkeq() { if [ "$2" = "$3" ]; then ok "$1"; else bad "$1 (expected '$2', got '$3')"; fi; }

q() {
  printf '%s\n' "$1" >"$BASE/.q.sql"; chmod 644 "$BASE/.q.sql"
  QOUT=$(su postgres -c "PGAPPNAME=super psql -h $SOCK -d postgres -X -q -A -t -v ON_ERROR_STOP=1 -f $BASE/.q.sql" 2>&1)
  QRC=$?; printf '%s' "$QOUT"; return "$QRC"
}
apply_sql() { # apply_sql <file>
  chmod 644 "$1"
  su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $1" >"$BASE/apply.out" 2>&1
}

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
cp "$SQL_REVIEWED" "$BASE/reviewed.sql"
cp "$SQL_KEYS" "$BASE/keys.sql"
apply_sql "$BASE/schema.sql" || { echo "schema failed"; exit 2; }
apply_sql "$BASE/reviewed.sql" || { echo "reviewed RPC failed"; cat "$BASE/apply.out"; exit 2; }
apply_sql "$BASE/keys.sql" || { echo "keys failed"; cat "$BASE/apply.out"; exit 2; }

M1='11111111-1111-1111-1111-111111111111'
PAY='[{"target":"ut_members","linkage":{"customer_id":"cus_1","subscription_ids":["sub_A"]},"intent":"update","seen_pks":["'"$M1"'"],"entries":[{"pk":"'"$M1"'","original":{"plan":"initiate","subscription_status":"active","stripe_customer_id":"cus_1","stripe_subscription_id":"sub_A"},"set":{"stripe_customer_id":"cus_2","stripe_subscription_id":"sub_B"}}]}]'
A1="select (public.b14ab_linkage_key('customer','cus_2') = any(public.b14ac_linkage_keys_for_payload(\$j\$$PAY\$j\$)))::int"
A2="select (public.b14ab_linkage_key('subscription','sub_B') = any(public.b14ac_linkage_keys_for_payload(\$j\$$PAY\$j\$)))::int"

echo
echo "=== control: the tracked wrapper, unmutated ==="
cp "$SQL_WRAPPER" "$BASE/w.sql"
apply_sql "$BASE/w.sql" || { echo "wrapper apply FAILED"; cat "$BASE/apply.out"; exit 2; }
chkeq "control A1 the customer replacement key IS present" "1" "$(q "$A1")"
chkeq "control A2 the subscription replacement key IS present" "1" "$(q "$A2")"

mutate() { # mutate <mode> -> writes $BASE/mut.sql
  python3 - "$SQL_WRAPPER" "$BASE/mut.sql" "$1" <<'PY'
import sys, pathlib
src, dst, mode = sys.argv[1], sys.argv[2], sys.argv[3]
s = pathlib.Path(src).read_text()
CUST = """        v_val := nullif(v_entry->'set'->>'stripe_customer_id', '');
        if v_val is not null then
          v_keys := v_keys || public.b14ab_linkage_key('customer', v_val);
        end if;
"""
SUBS = """        v_val := nullif(v_entry->'set'->>'stripe_subscription_id', '');
        if v_val is not null then
          v_keys := v_keys || public.b14ab_linkage_key('subscription', v_val);
        end if;
"""
if mode == "both":
    start = s.index("      if v_entry ? 'set' then")
    end = s.index("      end if;\n    end loop;", start) + len("      end if;\n")
    s = s[:start] + s[end:]
else:
    block = CUST if mode == "cust" else SUBS
    if s.count(block) != 1:
        raise SystemExit("anchor not unique: %d" % s.count(block))
    s = s.replace(block, "", 1)
pathlib.Path(dst).write_text(s)
PY
}

check_mutation() { # check_mutation <mode> <label> <expect-customer-fail yes|no> <expect-subs-fail yes|no>
  local mode="$1" label="$2" want_c="$3" want_s="$4"
  cp "$SQL_WRAPPER" "$BASE/pre.sql"; chmod 644 "$BASE/pre.sql"
  if ! mutate "$mode"; then bad "$label: could not apply the mutation"; return; fi
  chmod 644 "$BASE/mut.sql"
  if [ "$(sha256sum "$BASE/mut.sql" | awk '{print $1}')" = "$ORIG" ]; then
    bad "$label: the mutation did not change the file"; return
  fi
  echo "  mutated COPY sha256: $(sha256sum "$BASE/mut.sql" | awk '{print $1}')"
  su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/pre.sql" >/dev/null 2>&1
  apply_sql "$BASE/mut.sql" || { bad "$label: the mutated wrapper failed to apply"; cat "$BASE/apply.out"; return; }
  local vc vs
  vc=$(q "$A1"); vs=$(q "$A2")
  if [ "$want_c" = "fail" ]; then
    chkeq "$label: A1 (customer replacement key) now FAILS" "0" "$vc"
  else
    chkeq "$label: A1 still passes" "1" "$vc"
  fi
  if [ "$want_s" = "fail" ]; then
    chkeq "$label: A2 (subscription replacement key) now FAILS" "0" "$vs"
  else
    chkeq "$label: A2 still passes" "1" "$vs"
  fi
  # restore the unmutated wrapper for the next case
  su postgres -c "psql -h $SOCK -d postgres -X -q -v ON_ERROR_STOP=1 -f $BASE/pre.sql" >/dev/null 2>&1
}

echo
echo "=== MU-REPL-C: remove the CUSTOMER replacement contribution ==="
check_mutation cust "MU-REPL-C" fail pass
echo "=== MU-REPL-S: remove the SUBSCRIPTION replacement contribution ==="
check_mutation subs "MU-REPL-S" pass fail
echo "=== MU-REPL-BOTH: remove the whole entry.set block ==="
check_mutation both "MU-REPL-BOTH" fail fail

AFTER=$(sha256sum "$SQL_WRAPPER" | awk '{print $1}')
echo
echo "tracked wrapper sha256 AFTER:  $AFTER"
chkeq "the tracked wrapper is BYTE-IDENTICAL (never written to)" "$ORIG" "$AFTER"

printf '\nassertions passed: %d\nassertions failed: %d\n' "$PASS" "$FAIL"
if [ "$FAIL" -ne 0 ]; then echo; echo "BATCH14AD_KEY_MUTATIONS_FAILED"; exit 1; fi
echo "BATCH14AD_KEY_MUTATIONS_PASSED"
