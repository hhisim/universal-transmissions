#!/usr/bin/env python3
"""
Batch 14b — concurrency evidence against real PostgreSQL 17.

Reproduces the EXACT statement sequence `writeMembershipRow` issues
(SELECT ... LIMIT 2; then INSERT or UPDATE), run on genuinely simultaneous
connections with a barrier between the read and the write so the interleaving
is deterministic rather than hoped for.

Synthetic data only. Reports row counts and stored values, not just whether a
call threw.
"""
import sys
import threading
import psycopg2

DSN = dict(host="/var/tmp/b14sock", port=55434, user="prime", dbname="b14con")

SCHEMA = """
drop table if exists ut_members cascade;
drop table if exists profiles cascade;
create table public.profiles (
  user_id uuid primary key,
  email text,
  plan text not null default 'guest',
  subscription_status text not null default 'inactive',
  stripe_customer_id text
);
create table public.ut_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  plan text default 'guest',
  subscription_status text,
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz
);
"""

INDEX = ("create unique index ut_members_email_lower_key "
         "on public.ut_members (lower(btrim(email)));")

results = []


def conn():
    c = psycopg2.connect(**DSN)
    c.autocommit = True
    return c


def reset(indexed):
    c = conn()
    cur = c.cursor()
    cur.execute(SCHEMA)
    if indexed:
        cur.execute(INDEX)
    c.close()


def app_write(email, plan, protect_paid, barrier, out, key, tx_isolation="read committed",
              stripe_customer_id=None, subscription_status=None, attempt_retry=True):
    """One member write, following the helper's sequence exactly."""
    c = psycopg2.connect(**DSN)
    c.autocommit = False
    c.set_session(isolation_level=tx_isolation)
    cur = c.cursor()
    out[key] = {"events": []}
    try:
        # ── step 1: the read (`.select().eq().limit(2)`) ──
        cur.execute("select id, plan, stripe_customer_id from public.ut_members "
                    "where email = %s limit 2", (email,))
        rows = cur.fetchall()
        out[key]["events"].append("read:%d" % len(rows))

        if len(rows) > 1:
            out[key]["result"] = "duplicate_rows"
            c.rollback()
            return

        barrier.wait()  # both sessions have read; now they race to write

        if rows:
            current_plan = rows[0][1]
            rank = {"initiate": 2, "free": 1}.get(current_plan, 0)
            new_rank = {"initiate": 2, "free": 1}.get(plan, 0)
            if protect_paid and rank > new_rank:
                out[key]["events"].append("guard:refused")
                out[key]["result"] = "downgrade_refused"
                c.rollback()
                return
            cur.execute("update public.ut_members set plan = %s where id = %s",
                        (plan, rows[0][0]))
            out[key]["events"].append("update")
            c.commit()
            out[key]["result"] = "updated"
        else:
            try:
                cur.execute(
                    "insert into public.ut_members (email, plan, stripe_customer_id, subscription_status) "
                    "values (%s, %s, %s, %s)", (email, plan, stripe_customer_id, subscription_status))
                out[key]["events"].append("insert")
                c.commit()
                out[key]["result"] = "inserted"
            except psycopg2.errors.UniqueViolation:
                c.rollback()
                out[key]["events"].append("insert:23505")
                out[key]["result"] = "conflict"
                if attempt_retry:
                    # The retry path: re-read, then update the row that won.
                    cur.execute("select id, plan from public.ut_members "
                                "where email = %s limit 2", (email,))
                    again = cur.fetchall()
                    out[key]["events"].append("retry_read:%d" % len(again))
                    if len(again) == 1:
                        current_plan = again[0][1]
                        rank = {"initiate": 2, "free": 1}.get(current_plan, 0)
                        new_rank = {"initiate": 2, "free": 1}.get(plan, 0)
                        if protect_paid and rank > new_rank:
                            out[key]["events"].append("guard:refused")
                            out[key]["result"] = "conflict_retry_refused"
                            c.rollback()
                            return
                        cur.execute("update public.ut_members set plan = %s where id = %s",
                                    (plan, again[0][0]))
                        c.commit()
                        out[key]["events"].append("retry_update")
                        out[key]["result"] = "conflict_retry_updated"
                    else:
                        out[key]["result"] = "conflict_retry_ambiguous"
    except Exception as e:  # noqa: BLE001
        out[key]["result"] = "error:" + type(e).__name__
        out[key]["detail"] = str(e)[:120]
        c.rollback()
    finally:
        c.close()


def run(label, emails, plans, indexed, protect_paid=True, retry=True):
    reset(indexed)
    out = {}
    barrier = threading.Barrier(len(emails))
    threads = [
        threading.Thread(target=app_write,
                         args=(e, p, protect_paid, barrier, out, i,
                               "read committed", None, None, retry))
        for i, (e, p) in enumerate(zip(emails, plans))
    ]
    for t in threads:
        t.start()
    for t in threads:
        t.join(timeout=30)

    c = conn()
    cur = c.cursor()
    cur.execute("select count(*) from public.ut_members")
    n = cur.fetchone()[0]
    cur.execute("select email, plan from public.ut_members order by email")
    stored = cur.fetchall()
    c.close()

    print("  %-56s rows=%d  stored=%s" % (label, n, stored))
    for i in sorted(out):
        print("      session %d: %-24s %s" % (i, out[i].get("result"), out[i].get("events")))
    results.append((label, n, stored, out))
    return n, stored


print("=" * 100)
print("CONCURRENCY EVIDENCE — PostgreSQL 17.11, real simultaneous connections")
print("=" * 100)

for indexed in (False, True):
    tag = "WITH the proposed index" if indexed else "WITHOUT the index (as deployed)"
    print()
    print("################ %s ################" % tag)

    # 1. two simultaneous first-time writes, identical canonical address
    run("1. identical address, two first-time writes", ["conc@example.invalid"] * 2, ["free", "free"], indexed)

    # 2. case + surrounding-space variants (a caller that bypassed normalisation)
    run("2. case/space variants of one address",
        ["case@example.invalid", "CASE@Example.Invalid", "  case@example.invalid  "],
        ["free", "free", "free"], indexed)

    # 3. concurrent free activation and a paid membership update
    def paid_and_free(indexed):
        reset(indexed)
        out = {}
        barrier = threading.Barrier(2)
        c0 = conn()
        cur = c0.cursor()
        cur.execute("insert into public.ut_members (email, plan, stripe_customer_id) "
                    "values ('paid@example.invalid','initiate','cus_paid')")
        c0.close()
        t1 = threading.Thread(target=app_write, args=("paid@example.invalid", "free", True, barrier, out, 0))
        t2 = threading.Thread(target=app_write, args=("paid@example.invalid", "initiate", False, barrier, out, 1))
        t1.start(); t2.start(); t1.join(20); t2.join(20)
        c = conn(); cur = c.cursor()
        cur.execute("select count(*), max(plan) from public.ut_members")
        n, plan = cur.fetchone()
        c.close()
        print("  %-56s rows=%d  final plan=%s" % ("3. concurrent free activation + paid update", n, plan))
        for i in sorted(out):
            print("      session %d: %-24s %s" % (i, out[i].get("result"), out[i].get("events")))
        results.append(("3. concurrent free + paid", n, plan, out))

    paid_and_free(indexed)

    # 4. retry after a uniqueness conflict
    run("4. two first-time writes with retry on conflict",
        ["retry@example.invalid"] * 2, ["free", "free"], indexed)

print()
print("=" * 100)
print("SUMMARY")
print("=" * 100)
for tag, indexed in (("WITHOUT index", False), ("WITH index", True)):
    pass
print("(per-scenario row counts above)")

c = conn(); cur = c.cursor(); c.close()
sys.exit(0)
