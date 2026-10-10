#!/usr/bin/env python3
"""Compatibility test: does withdrawing privileges on public.profiles break the
foreign key from public.conversations, or any write a real client performs?

PostgreSQL documents that referential-integrity checks bypass row security; the
open question this settles empirically is whether they also survive the
referencing role losing all privileges on the referenced table.
"""
import re, subprocess, sys

DB = "b13test"
A = "11111111-1111-1111-1111-111111111111"
B = "22222222-2222-2222-2222-222222222222"

def psql(sql):
    p = subprocess.run(["sudo", "-u", "postgres", "psql", "-d", DB, "-t", "-A",
                        "-v", "ON_ERROR_STOP=0", "-c", sql],
                       capture_output=True, text=True, timeout=120)
    return ((p.stdout or "") + (p.stderr or "")).strip(), ("ERROR" in ((p.stdout or "") + (p.stderr or "")))

def as_role(role, sub, sql):
    pre = "set request.jwt.claim.role='%s'; set request.jwt.claim.sub='%s';" % (role, sub or "")
    return psql("%s set role %s; %s" % (pre, role, sql))

TAG = re.compile(r"^(INSERT|UPDATE|DELETE)\s+(?:0\s+)?(\d+)$")

results = []
def check(tid, desc, ok, detail=""):
    results.append((tid, desc, ok))
    print("  %-4s %-62s %s   %s" % (tid, desc, "PASS" if ok else "FAIL", detail))

print("=" * 104)
print("FOREIGN-KEY / COMPATIBILITY PROBES  (public.conversations -> public.profiles)")
print("=" * 104)

INS = ("begin; insert into public.conversations(id,user_id,tradition,mode) "
       "values(gen_random_uuid(),'%s','hermetic','standard'); rollback;")

# A real client writing its own conversation row must keep working.
out, err = as_role("authenticated", A, INS % A)
ok = (not err) and any(TAG.match(l.strip()) and TAG.match(l.strip()).group(2) != "0"
                       for l in out.splitlines() if TAG.match(l.strip()))
check("F1", "authenticated CAN still insert its own conversation row", ok,
      next((l.strip() for l in out.splitlines() if TAG.match(l.strip())), out.splitlines()[-1][:60]))

# Writing a row for somebody else must stay blocked by the ownership policy.
out, err = as_role("authenticated", A, INS % B)
ok = err or not any(TAG.match(l.strip()) and TAG.match(l.strip()).group(2) != "0"
                    for l in out.splitlines() if TAG.match(l.strip()))
check("F2", "authenticated still CANNOT insert a row for another user", ok, "blocked" if ok else "WROTE")

# A non-existent user_id must still be rejected by the FK itself.
out, err = as_role("authenticated", A,
                   INS % "99999999-9999-9999-9999-999999999999")
check("F3", "FK still rejects a non-existent profile", err,
      next((l for l in out.splitlines() if "ERROR" in l), "no error")[:70])

# service_role path used by the server
out, err = as_role("service_role", None, INS % A)
ok = (not err) and any(TAG.match(l.strip()) for l in out.splitlines() if TAG.match(l.strip()))
check("F4", "service_role CAN insert a conversation row", ok, "ok" if ok else out.splitlines()[-1][:60])

# deleting a profile must still cascade to its conversations
out, err = psql("""begin;
  insert into public.profiles(user_id,email,plan) values
    ('33333333-3333-3333-3333-333333333333','cascade@example.invalid','free');
  insert into public.conversations(id,user_id,tradition,mode) values
    (gen_random_uuid(),'33333333-3333-3333-3333-333333333333','hermetic','standard');
  delete from public.profiles where user_id='33333333-3333-3333-3333-333333333333';
  select 'remaining='||count(*) from public.conversations
    where user_id='33333333-3333-3333-3333-333333333333';
rollback;""")
check("F5", "ON DELETE CASCADE from profiles still fires", "remaining=0" in out,
      next((l for l in out.splitlines() if l.startswith("remaining=")), out.splitlines()[-1][:60]))

print()
passed = sum(1 for r in results if r[2])
failed = [r for r in results if not r[2]]
print("  PASS %d   FAIL %d" % (passed, len(failed)))
for tid, desc, _ in failed:
    print("    FAILED:", tid, desc)
print("\nB13_COMPAT_%s" % ("PASSED" if not failed else "FAILED"))
sys.exit(0 if not failed else 1)
