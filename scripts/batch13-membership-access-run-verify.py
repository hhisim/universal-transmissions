#!/usr/bin/env python3
"""Execute EVERY statement in batch13-membership-access-verify-production.sql
individually, capturing each statement's own exit status and full output.

A success marker is not a substitute for every statement executing, and psql's
exit status for a multi-statement file reflects only the whole file. This splits
the file into its statements and runs each one on its own.

Read-only: the verification file contains nothing but SELECTs.
"""
import os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
VERIFY = os.path.join(HERE, "batch13-membership-access-verify-production.sql")
DB = os.environ.get("B13_DB", "b13test")

def psql_base():
    cmd = ["sudo", "-u", "postgres", "psql"]
    for flag, key in (("-h", "B13_PGHOST"), ("-p", "B13_PGPORT")):
        v = os.environ.get(key)
        if v:
            cmd += [flag, v]
    return cmd

def run(stmt):
    p = subprocess.run(psql_base() + ["-d", DB, "-v", "ON_ERROR_STOP=1", "-c", stmt],
                       capture_output=True, text=True, timeout=180)
    return p.returncode, (p.stdout or ""), (p.stderr or "")

def strip_comments(sql):
    return "\n".join(l for l in sql.splitlines() if not l.strip().startswith("--")).strip()

text = open(VERIFY, encoding="utf-8").read()
parts = re.split(r"^--\s+(V[0-9]+b?)\s*-+\s*$", text, flags=re.M)
# parts = [header, label1, body1, label2, body2, ...]

print("=" * 100)
print("EXECUTING EVERY VERIFICATION STATEMENT INDIVIDUALLY")
print("  file :", os.path.basename(VERIFY))
print("  db   :", DB, "host=", os.environ.get("B13_PGHOST", "(default)"),
      "port=", os.environ.get("B13_PGPORT", "(default)"))
print("=" * 100)

results = []
pairs = list(zip(parts[1::2], parts[2::2]))
if not pairs:
    print("NO STATEMENTS PARSED — the file's marker format changed")
    sys.exit(2)

for label, body in pairs:
    sql = strip_comments(body)
    stmts = [s.strip() for s in sql.split(";") if s.strip()]
    if not stmts:
        print("\n--- %s : NO STATEMENT FOUND ---" % label)
        results.append((label, False, "no statement parsed"))
        continue
    for idx, stmt in enumerate(stmts, 1):
        tag = label if len(stmts) == 1 else "%s.%d" % (label, idx)
        code, out, err = run(stmt)
        ok = (code == 0)
        results.append((tag, ok, err.strip()[:200]))
        print("\n--- %s : psql exit %d ---" % (tag, code))
        print(out.rstrip() if out.strip() else "(no rows)")
        if err.strip():
            print("STDERR:", err.strip())

passed = sum(1 for _, ok, _ in results if ok)
failed = [r for r in results if not r[2 - 1]]
print()
print("=" * 100)
print("  statements executed: %d   succeeded: %d   failed: %d" % (len(results), passed, len(results) - passed))
bad = [r for r in results if not r[1]]
for tag, _, msg in bad:
    print("    FAILED %s  %s" % (tag, msg))
print("\nB13_PROD_VERIFY_SQL_%s" % ("EXECUTED_OK" if not bad else "HAD_FAILURES"))
sys.exit(0 if not bad else 1)
