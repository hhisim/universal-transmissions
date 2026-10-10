#!/usr/bin/env python3
"""Direct test of the column-revocation path.

The migration's dynamic block is unreachable in practice: step 2 revokes the
table-level privileges first, and a table-level REVOKE removes the same-named
column grants, so the loop finds nothing even when column grants were seeded
(measured: "column-level revocations performed: 0" with 8 grants seeded).
A branch that never runs cannot be validated by running the migration.

So this file tests the statement the block generates, directly, against seeded
column grants — and contrasts it with the form the block previously used.

Measured difference between the two forms:

  revoke all privileges (email) on table profiles from anon;
      column-precise: removes every privilege on that column and nothing else.

  revoke select, insert, update, references (email) on table profiles from anon;
      the column list binds to REFERENCES only, so SELECT/INSERT/UPDATE are
      revoked at TABLE level — which cascades to their grants on EVERY column.
      It removes more than it reads as removing, and its correctness in the
      migration depended entirely on that cascade.
"""
import os, subprocess, sys

DB = os.environ.get("B13_DB", "b13test")

def psql_base():
    cmd = ["sudo", "-u", "postgres", "psql"]
    for flag, key in (("-h", "B13_PGHOST"), ("-p", "B13_PGPORT")):
        v = os.environ.get(key)
        if v:
            cmd += [flag, v]
    return cmd

def sql(q, tuples_only=True):
    extra = ["-t", "-A"] if tuples_only else []
    p = subprocess.run(psql_base() + ["-d", DB, "-v", "ON_ERROR_STOP=0", "-c", q] + extra,
                       capture_output=True, text=True, timeout=120)
    out = ((p.stdout or "") + (p.stderr or "")).strip()
    return out, ("ERROR" in out)

def col_privs(role, table, column):
    out, err = sql("""select coalesce(string_agg(p.priv, ',' order by p.priv), '(none)')
        from (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(priv)
        where has_column_privilege('%s', 'public.%s', '%s', p.priv);""" % (role, table, column))
    return out if not err else "ERROR"

def any_col(role, table):
    out, err = sql("""select string_agg(p.priv, ',')
        from (values ('SELECT'),('INSERT'),('UPDATE'),('REFERENCES')) p(priv)
        where has_any_column_privilege('%s', 'public.%s', p.priv);""" % (role, table))
    return out if not err and out else "(none)"

results = []
def check(tid, desc, ok, detail=""):
    results.append((tid, desc, ok))
    print("  %-4s %-64s %s   %s" % (tid, desc, "PASS" if ok else "FAIL", detail))

print("=" * 106)
print("DIRECT TEST OF THE COLUMN-REVOCATION PATH")
print("=" * 106)

reset = """revoke all privileges on table public.profiles from anon, authenticated;
           revoke all privileges on table public.ut_members from anon, authenticated;"""

# ---------- the corrected form -------------------------------------------
print()
print("  --- statement the corrected block generates ---")
print("      revoke all privileges (email) on table public.profiles from anon;")
sql(reset + """
    grant select (email), insert (email), update (email), references (email)
      on table public.profiles to anon;
    grant select (plan) on table public.profiles to authenticated;""")
print("      seeded: anon -> profiles.email S,I,U,R ; authenticated -> profiles.plan SELECT")

check("C1", "seeded column grants are visible to has_column_privilege",
      col_privs("anon", "profiles", "email") == "INSERT,REFERENCES,SELECT,UPDATE",
      col_privs("anon", "profiles", "email"))
check("C2", "has_any_column_privilege sees them too",
      any_col("anon", "profiles") != "(none)", any_col("anon", "profiles"))

out, err = sql("revoke all privileges (email) on table public.profiles from anon;")
check("C3", "corrected column statement executes", not err, out.splitlines()[-1][:40])
check("C4", "it removes all four column privileges on that column",
      col_privs("anon", "profiles", "email") == "(none)", col_privs("anon", "profiles", "email"))
check("C5", "it is column-precise: another role's column grant is untouched",
      col_privs("authenticated", "profiles", "plan") == "SELECT",
      col_privs("authenticated", "profiles", "plan"))

# ---------- the previous form --------------------------------------------
print()
print("  --- statement the PREVIOUS block generated ---")
print("      revoke select, insert, update, references (email) on table public.profiles from anon;")
sql(reset + """
    grant select (plan) on table public.profiles to anon;
    grant references (email) on table public.profiles to anon;""")
print("      seeded: anon -> profiles.plan SELECT ; profiles.email REFERENCES")

out, err = sql("revoke select, insert, update, references (email) on table public.profiles from anon;")
check("C6", "the previous form executes", not err, out.splitlines()[-1][:40])
check("C7", "the SELECT it names is revoked TABLE-WIDE, so plan SELECT does not survive",
      col_privs("anon", "profiles", "plan") == "(none)", col_privs("anon", "profiles", "plan"))
check("C8", "it does revoke the REFERENCES column it names",
      col_privs("anon", "profiles", "email") == "(none)", col_privs("anon", "profiles", "email"))

# ---------- the grammar point, isolated ----------------------------------
print()
print("  --- the grammar point, isolated ---")
print("      revoke references (email) on table public.profiles from anon;")
sql(reset + "grant select (plan) on table public.profiles to anon;")
print("      seeded: anon -> profiles.plan SELECT")
out, err = sql("revoke references (email) on table public.profiles from anon;")
check("C9", "a column list does NOT reach a privilege it is not attached to",
      col_privs("anon", "profiles", "plan") == "SELECT",
      "plan SELECT = " + col_privs("anon", "profiles", "plan"))

print()
print("  Reading: C5 shows the corrected form is column-precise. C7 shows the old")
print("  form is not — its SELECT/INSERT/UPDATE entries act at table level and cascade")
print("  across every column, so it removes MORE than the column list suggests.")
print("  C9 isolates the grammar rule: the column list binds only to the privilege it")
print("  follows. The corrected form is therefore adopted for precision and so that")
print("  the block's behaviour does not depend on cascade semantics.")

print()
passed = sum(1 for r in results if r[2])
failed = [r for r in results if not r[2]]
print("  PASS %d   FAIL %d" % (passed, len(failed)))
for tid, desc, _ in failed:
    print("    FAILED %s %s" % (tid, desc))
print("\nB13_COLUMN_REVOKE_%s" % ("PASSED" if not failed else "FAILED"))
sys.exit(0 if not failed else 1)
