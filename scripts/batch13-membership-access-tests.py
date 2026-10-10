#!/usr/bin/env python3
"""Batch 13 membership-access test harness.

Every probe runs AS the target database role, with Supabase's JWT claims
simulated through request.jwt.claim.* so auth.uid()/auth.role() behave as they do
under PostgREST.

DATABASE-ROLE SIMULATION, not a real authenticated integration test: no Supabase
JWT is minted and PostgREST is not in the path. What it exercises is RLS
semantics and effective privileges.

Safety conventions
  * READ: both "permission denied" and "0 rows" are safe. A read is unsafe only
    if it returns rows the caller should not see. Denial is a strictly stronger
    outcome than an RLS filter, so it is accepted.
  * WRITE: safe means the write did not take effect — an error, or a command tag
    of INSERT/UPDATE/DELETE 0.
  * TRUNCATE ignores RLS entirely, so it is probed live as well as through
    has_table_privilege(). On a table referenced by a foreign key, a plain
    TRUNCATE is refused for a reason unrelated to privileges, so the profiles
    probes use CASCADE and report the actual error text: a privilege denial must
    never be confused with an FK refusal, or the probe would pass spuriously.
  * Destructive probes always run inside a transaction that is rolled back.

Synthetic rows only.
"""
import re, subprocess, sys

DB = "b13test"
A = "11111111-1111-1111-1111-111111111111"
A_MAIL = "member-a@example.invalid"
B_MAIL = "member-b@example.invalid"

def psql(sql):
    p = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", DB, "-t", "-A",
                        "-v", "ON_ERROR_STOP=0", "-c", sql],
                       capture_output=True, text=True, timeout=120)
    out = ((p.stdout or "") + (p.stderr or "")).strip()
    return out, ("ERROR" in out)

def as_role(role, sub, sql):
    pre = "set request.jwt.claim.role = '%s'; set request.jwt.claim.sub = '%s';" % (role, sub or "")
    return psql("%s set role %s; %s" % (pre, role, sql))

def lines(out):
    return [l for l in out.splitlines()
            if l.strip() and not l.startswith("SET") and l.strip() != "ROLLBACK"]

def scalar(out):
    ls = lines(out)
    return ls[-1].strip() if ls else ""

def errline(out):
    return next((l.strip() for l in lines(out) if "ERROR" in l), "")

TAG = re.compile(r"^(INSERT|UPDATE|DELETE)\s+(?:0\s+)?(\d+)$")

def write_probe(role, sub, sql):
    """True = the write SUCCEEDED (unsafe)."""
    out, err = as_role(role, sub, sql)
    if err:
        return False, "blocked: " + errline(out)[:60]
    for l in lines(out):
        m = TAG.match(l.strip())
        if m:
            return int(m.group(2)) > 0, "%s -> affected=%s" % (l.strip(), m.group(2))
    return False, "no command tag (blocked)"

def read_count(role, sub, table):
    out, err = as_role(role, sub, "select count(*) from public.%s;" % table)
    if err:
        return None, "denied"
    return int(scalar(out) or 0), "ok"

def truncate_probe(role, sub, table="ut_members", cascade=False):
    """True = TRUNCATE succeeded (unsafe; RLS does not restrict TRUNCATE).

    Returns (succeeded, reason). `reason` separates a privilege denial from a
    foreign-key refusal, so a pass can never be caused by the FK instead of the
    privilege.
    """
    stmt = "truncate public.%s%s;" % (table, " cascade" if cascade else "")
    sql = ("set request.jwt.claim.role='%s'; set request.jwt.claim.sub='%s'; "
           "begin; set role %s; %s "
           "select 'TRUNCATE_SUCCEEDED_MARKER'; rollback;" % (role, sub or "", role, stmt))
    out, _ = psql(sql)
    if "TRUNCATE_SUCCEEDED_MARKER" in out:
        return True, "TRUNCATE SUCCEEDED"
    e = errline(out)
    if "permission denied" in e:
        return False, "privilege denied"
    if "foreign key constraint" in e:
        return False, "FK refusal (not a privilege check)"
    return False, (e[:60] or "unknown")

results = []
def check(tid, desc, ok, detail=""):
    results.append((tid, desc, ok, detail))
    print("  %-4s %-58s %s   %s" % (tid, desc, "PASS" if ok else "FAIL", detail))

PRIVS = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE", "REFERENCES", "TRIGGER"]

def effective_grants():
    vals = ",".join("('%s')" % p for p in PRIVS)
    out, _ = psql("""select r.rolname||'|'||t.tablename||'|'||p.priv
        from (values ('anon'),('authenticated'),('service_role')) r(rolname)
        cross join (values ('profiles'),('ut_members')) t(tablename)
        cross join (values %s) p(priv)
        where has_table_privilege(r.rolname, 'public.'||t.tablename, p.priv)
        order by 1""" % vals)
    return [l for l in lines(out) if "|" in l]

print("=" * 108)
print("EFFECTIVE PRIVILEGES  (role|table|privilege)  via has_table_privilege()")
print("=" * 108)
g = effective_grants()
for l in g:
    print("   " + l)
if not g:
    print("   (none held by anon / authenticated / service_role)")

pub, _ = psql("""select 'PUBLIC|'||t.tablename||'|'||p.priv
    from (values ('profiles'),('ut_members')) t(tablename)
    cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE'),('TRUNCATE')) p(priv)
    where has_table_privilege('public', 'public.'||t.tablename, p.priv)
    order by 1""")
pub_lines = [l for l in lines(pub) if "|" in l]
print("   PUBLIC grants: " + (", ".join(pub_lines) if pub_lines else "none"))

print()
print("=" * 108)
print("PROBES  (PASS = the TARGET policy holds: no direct anon/authenticated access)")
print("=" * 108)

print("  -- anonymous --")
n, m = read_count("anon", "", "ut_members")
check("T1", "anon cannot read ut_members (denied or empty)", m == "denied" or n == 0,
      "rows=%s (%s)" % (n, m))
n, m = read_count("anon", "", "profiles")
check("T2", "anon cannot read profiles (denied or empty)", m == "denied" or n == 0,
      "rows=%s (%s)" % (n, m))
ok, d = write_probe("anon", "", "insert into public.ut_members(email,plan) values('%s','initiate');" % A_MAIL)
check("T3", "anon INSERT ut_members blocked", not ok, d)
ok, d = write_probe("anon", "", "update public.ut_members set plan='initiate';")
check("T4", "anon UPDATE ut_members blocked", not ok, d)
ok, d = write_probe("anon", "", "delete from public.ut_members;")
check("T5", "anon DELETE ut_members blocked", not ok, d)
tr, why = truncate_probe("anon", "", "ut_members")
check("T6", "anon TRUNCATE ut_members blocked", not tr, why)
ok, d = write_probe("anon", "", "update public.profiles set plan='initiate';")
check("T7", "anon UPDATE profiles blocked", not ok, d)
tr, why = truncate_probe("anon", "", "profiles", cascade=True)
check("T8", "anon TRUNCATE profiles blocked (privilege, not FK)", not tr, why)

print("  -- authenticated: user A against user B --")
n, m = read_count("authenticated", A, "ut_members")
check("T9", "A cannot enumerate ut_members", m == "denied" or (n is not None and n <= 1),
      "rows=%s (%s)" % (n, m))
out, err = as_role("authenticated", A,
                   "select count(*) from public.ut_members where email='%s';" % B_MAIL)
check("T10", "A CANNOT read B's membership row", err or scalar(out) == "0",
      "B-visible=%s" % ("denied" if err else scalar(out)))
out, err = as_role("authenticated", A,
                   "select coalesce(string_agg(stripe_customer_id,','),'none') from public.ut_members;")
check("T11", "A CANNOT read any stored billing identifier", err or "cus_SYNTH" not in out,
      ("denied" if err else scalar(out))[:60])
ok, d = write_probe("authenticated", A,
                    "update public.ut_members set plan='initiate' where email='%s';" % A_MAIL)
check("T12", "A CANNOT grant itself initiate", not ok, d)
ok, d = write_probe("authenticated", A,
                    "update public.ut_members set stripe_customer_id='cus_ATTACKER' where email='%s';" % A_MAIL)
check("T13", "A CANNOT change a billing identifier", not ok, d)
ok, d = write_probe("authenticated", A,
                    "update public.ut_members set plan='initiate' where email='%s';" % B_MAIL)
check("T14", "A CANNOT modify B's record", not ok, d)
ok, d = write_probe("authenticated", A, "delete from public.ut_members;")
check("T15", "A DELETE ut_members blocked", not ok, d)
ok, d = write_probe("authenticated", A,
                    "insert into public.ut_members(email,plan) values('%s','initiate');" % A_MAIL)
check("T16", "A INSERT ut_members blocked", not ok, d)
tr, why = truncate_probe("authenticated", A, "ut_members")
check("T17", "A TRUNCATE ut_members blocked", not tr, why)
tr, why = truncate_probe("authenticated", A, "profiles", cascade=True)
check("T18", "A TRUNCATE profiles blocked (privilege, not FK)", not tr, why)
n, m = read_count("authenticated", A, "profiles")
check("T19", "A cannot read profiles (denied or empty)", m == "denied" or n == 0,
      "rows=%s (%s)" % (n, m))

print("  -- service_role must be unaffected --")
n, m = read_count("service_role", None, "ut_members")
check("T20", "service_role SELECT ut_members works", n == 2, "rows=%s (%s)" % (n, m))
n, m = read_count("service_role", None, "profiles")
check("T21", "service_role SELECT profiles works", n == 2, "rows=%s (%s)" % (n, m))
ok, d = write_probe("service_role", None,
                    "begin; insert into public.ut_members(email,plan) values('svc@example.invalid','free'); "
                    "update public.ut_members set plan='initiate' where email='svc@example.invalid'; "
                    "delete from public.ut_members where email='svc@example.invalid'; rollback;")
check("T22", "service_role INSERT/UPDATE/DELETE ut_members works", ok, d)
ok, d = write_probe("service_role", None,
                    "begin; insert into public.profiles(user_id,email,plan) values"
                    "(gen_random_uuid(),'svc@example.invalid','free'); "
                    "update public.profiles set plan='initiate' where email='svc@example.invalid'; "
                    "delete from public.profiles where email='svc@example.invalid'; rollback;")
check("T23", "service_role INSERT/UPDATE/DELETE profiles works", ok, d)
out, err = as_role("service_role", None,
                   "select coalesce(string_agg(plan,',' order by email),'none') from public.ut_members;")
check("T24", "service_role SELECT plan (plan-status / member routes)", not err, scalar(out)[:60])

print()
print("=" * 108)
print("EFFECTIVE-PRIVILEGE ASSERTIONS")
print("=" * 108)
g = effective_grants()
anon_auth = [l for l in g if l.split("|")[0] in ("anon", "authenticated")]
check("G1", "anon/authenticated hold NO privilege on either table", anon_auth == [],
      ("%d still present: " % len(anon_auth)) + "; ".join(anon_auth[:4]) if anon_auth else "none")
svc = sorted(set(l.split("|")[2] for l in g if l.split("|")[0] == "service_role"))
check("G2", "service_role retains all 7 privileges on both tables",
      len([l for l in g if l.startswith("service_role")]) == 14,
      "service_role: " + ",".join(svc))
check("G3", "no PUBLIC grant on either table", pub_lines == [],
      "; ".join(pub_lines) if pub_lines else "none")

print()
passed = sum(1 for r in results if r[2])
failed = [r for r in results if not r[2]]
print("  PASS %d   FAIL %d" % (passed, len(failed)))
if failed:
    print("\n  FAILING PROBES:")
    for tid, desc, _, d in failed:
        print("    %-4s %s   [%s]" % (tid, desc, d))
print("\nB13_TESTS_%s" % ("PASSED" if not failed else "FAILED"))
sys.exit(0 if not failed else 1)
