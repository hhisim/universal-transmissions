#!/usr/bin/env python3
"""
Batch 14c — existing-row UPDATE race on real PostgreSQL 17.

Correspondence to the committed helper (`writeMembershipRow`):
  read   ->  select id, plan from ut_members where email = $1 limit 2
  guard  ->  refuse if protectPaidPlan and rank(old) > rank(new)
  write  ->  update ut_members set plan = $new where id = $id [and plan = $old]

The only difference from the TypeScript is that the guard and the CAS are
expressed in Python here; the SQL issued is identical. Limitation: this is the
helper's statement sequence executed on real connections, not the compiled
TypeScript running inside two Vercel invocations.
"""
import threading
import psycopg2

DSN = dict(host="/var/tmp/b14sock", port=55434, user="prime", dbname="b14con")
RANK = {"initiate": 2, "free": 1}


def conn():
    c = psycopg2.connect(**DSN)
    c.autocommit = True
    return c


def setup(plan="free"):
    c = conn(); cur = c.cursor()
    cur.execute("drop table if exists ut_members cascade")
    cur.execute("""create table ut_members (
        id uuid primary key default gen_random_uuid(),
        email text not null, plan text, subscription_status text,
        stripe_customer_id text)""")
    cur.execute("create unique index ut_members_email_lower_key on ut_members (lower(btrim(email)))")
    cur.execute("insert into ut_members (email, plan, subscription_status) values (%s,%s,'active')", ("race@example.invalid", plan))
    c.close()


def writer(new_plan, protect, barrier, out, key, cas, delay=0.0):
    import time
    c = psycopg2.connect(**DSN); c.autocommit = False
    c.set_session(isolation_level="read committed")
    cur = c.cursor()
    try:
        cur.execute("select id, plan from ut_members where email = %s limit 2", ("race@example.invalid",))
        rows = cur.fetchall()
        old = rows[0][1]
        out[key] = {"read": old, "events": ["read:%s" % old]}

        if protect and RANK.get(old, 0) > RANK.get(new_plan, 0):
            out[key]["result"] = "guard_refused"
            c.rollback(); return

        barrier.wait()           # both sessions have read the OLD value
        if delay:
            time.sleep(delay)

        if cas:
            cur.execute("update ut_members set plan = %s where id = %s and plan = %s",
                        (new_plan, rows[0][0], old))
        else:
            cur.execute("update ut_members set plan = %s where id = %s", (new_plan, rows[0][0]))

        n = cur.rowcount
        out[key]["events"].append("update:rowcount=%d" % n)
        c.commit()
        out[key]["result"] = "updated" if n else "cas_conflict"
    except Exception as e:  # noqa: BLE001
        out[key]["result"] = "error:" + type(e).__name__
        c.rollback()
    finally:
        c.close()


def scenario(label, first, second, cas):
    """`first`/`second` are (plan, protect, delay)."""
    setup("free")
    out = {}
    barrier = threading.Barrier(2)
    ts = [threading.Thread(target=writer, args=(p, pr, barrier, out, i, cas, d))
          for i, (p, pr, d) in enumerate([first, second])]
    for t in ts: t.start()
    for t in ts: t.join(25)
    c = conn(); cur = c.cursor()
    cur.execute("select plan, count(*) over () from ut_members")
    plan_row = cur.fetchone()
    cur.execute("select count(*) from ut_members")
    n = cur.fetchone()[0]
    c.close()
    print("  %-58s rows=%d final=%s" % (label, n, plan_row[0]))
    for i in sorted(out):
        print("      session %d (wants %-8s) %-14s %s" % (i, [first, second][i][0], out[i].get("result"), out[i].get("events")))
    return plan_row[0]


print("=" * 100)
print("EXISTING-ROW UPDATE RACE — PostgreSQL 17, both writes target plan only")
print("=" * 100)

print()
print("### WITHOUT compare-and-set (the Batch 14/14b helper) ###")
print("--- order A: activation commits, then the paid upgrade ---")
a1 = scenario("A: activation(free) first, upgrade(initiate) second",
              ("free", True, 0.0), ("initiate", False, 0.4), cas=False)
print("--- order B: paid upgrade commits, then the activation ---")
b1 = scenario("B: upgrade(initiate) first, activation(free) second",
              ("initiate", False, 0.0), ("free", True, 0.4), cas=False)

print()
print("### WITH compare-and-set (the Batch 14c helper) ###")
print("--- order A ---")
a2 = scenario("A: activation(free) first, upgrade(initiate) second",
              ("free", True, 0.0), ("initiate", False, 0.4), cas=True)
print("--- order B ---")
b2 = scenario("B: upgrade(initiate) first, activation(free) second",
              ("initiate", False, 0.0), ("free", True, 0.4), cas=True)

print()
print("--- two protected writes after both read the old value ---")
p1 = scenario("both protected, activation vs activation", ("free", True, 0.0), ("free", True, 0.4), cas=False)
p2 = scenario("both protected, activation vs activation (CAS)", ("free", True, 0.0), ("free", True, 0.4), cas=True)

print()
print("=" * 100)
print("READBACK — what the shared reader would report for each final state")
print("=" * 100)
for label, final in [("without CAS, order A", a1), ("without CAS, order B", b1),
                     ("with CAS, order A", a2), ("with CAS, order B", b2)]:
    print("  %-24s stored plan=%-9s -> effective plan=%s" % (label, final, final))
print()
print("  WITHOUT CAS, order B ends at 'free' for a member who had just PAID:")
print("  the activation evaluated a stale read and clobbered the upgrade (lost update).")
print("  WITH CAS the second writer reports a conflict instead of overwriting.")
