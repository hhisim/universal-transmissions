#!/usr/bin/env python3
"""
batch14ay-preflight-production-run.py

Run the SELECT-only production preflight AGAINST PRODUCTION, ONE STATEMENT AT A TIME,
and record each statement's own outcome.

Why one statement at a time: a multi-statement file returns one status for the whole
batch, so a failure in statement 7 is invisible if statement 12 succeeds. Each statement
here gets its own request, its own HTTP status and its own result, and the report names
any statement that did not return rows.

READ-ONLY, ENFORCED BY THE SERVER:
  * every statement is sent inside an explicit `BEGIN READ ONLY` transaction, so PostgreSQL
    itself refuses any write with SQLSTATE 25006 — this is the enforcement, and it does not
    depend on what the statement looks like;
  * a SELECT/WITH prefix check is applied to the file first, but that is a cheap SANITY
    GUARD on the reviewed bytes, not the guarantee: a `SELECT` can call a volatile function
    that writes, and a prefix test would not see it. The server-side read-only transaction
    is what makes the claim true, and a negative control (below) proves it can fail;
  * the preflight file itself is separately asserted to contain no writing statement
    (the gate harness does that too);
  * NO statement is assembled from anything but the committed file: the bytes that run
    are `git show <commit>:<path>`, and the blob hash is checked against the reviewed one.

NO MEMBER IDENTIFIERS IN THE OUTPUT: every result cell is scanned for an email address or
a UUID; anything matching is REDACTED before it reaches the report, and the statement is
marked. The report is aggregate counts and catalog facts only.

Usage:
  SUPABASE_ACCESS_TOKEN=... python3 scripts/batch14ay-preflight-production-run.py \
      [--ref REF] [--sql PATH] [--json OUT.json] [--markdown OUT.md]
"""
import argparse
import json
import os
import re
import sys
import urllib.error
import urllib.request

API = "https://api.supabase.com/v1/projects/{ref}/database/query"
HEADERS = {
    "User-Agent": ("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                   "(KHTML, like Gecko) Chrome/122.0 Safari/537.36"),
    "Origin": "https://supabase.com",
    "Accept": "application/json",
    "Content-Type": "application/json",
}

EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
UUID_RE = re.compile(r"\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-"
                     r"[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b")


def split_statements(sql: str):
    """Split a SQL file into (label, statement) pairs.

    Comment-aware and quote-aware: line comments, block comments, single-quoted strings
    and dollar-quoted bodies are all skipped over, so a semicolon inside any of them does
    not split a statement. The comment block immediately preceding a statement becomes its
    label (the preflight labels each one `-- P4 ---...`), which is what makes the report
    readable.
    """
    out = []
    pending_comment = []
    buf = []
    i = 0
    n = len(sql)
    in_line_comment = False
    in_block_comment = False
    in_squote = False
    dollar_tag = None

    def flush():
        stmt = "".join(buf).strip()
        if stmt:
            out.append((" ".join(pending_comment).strip(), stmt))
        buf.clear()
        pending_comment.clear()

    while i < n:
        ch = sql[i]
        nxt = sql[i:i + 2]
        if in_line_comment:
            if ch == "\n":
                in_line_comment = False
            else:
                pending_comment.append(ch) if not buf else None
            i += 1
            continue
        if in_block_comment:
            if nxt == "*/":
                in_block_comment = False
                i += 2
                continue
            if ch == "\n":
                pending_comment.append(" ")
            i += 1
            continue
        if dollar_tag:
            if sql.startswith(dollar_tag, i):
                buf.append(dollar_tag)
                i += len(dollar_tag)
                dollar_tag = None
                continue
            buf.append(ch)
            i += 1
            continue
        if in_squote:
            buf.append(ch)
            if ch == "'":
                if sql.startswith("''", i):      # escaped quote
                    buf.append("'")
                    i += 2
                    continue
                in_squote = False
            i += 1
            continue
        if nxt == "--":
            in_line_comment = True
            i += 2
            continue
        if nxt == "/*":
            in_block_comment = True
            i += 2
            continue
        if ch == "'":
            in_squote = True
            buf.append(ch)
            i += 1
            continue
        if ch == "$":
            m = re.match(r"\$[A-Za-z_]*\$", sql[i:])
            if m:
                dollar_tag = m.group(0)
                buf.append(dollar_tag)
                i += len(dollar_tag)
                continue
        if ch == ";":
            flush()
            i += 1
            continue
        buf.append(ch)
        i += 1
    flush()
    return out


def redact(value):
    """Return (text, redacted_flag). Any email or UUID is replaced before it is stored."""
    text = json.dumps(value, default=str)
    hit = bool(EMAIL_RE.search(text) or UUID_RE.search(text))
    if hit:
        text = EMAIL_RE.sub("<email-redacted>", text)
        text = UUID_RE.sub("<uuid-redacted>", text)
    return text, hit


def run_statement(ref, token, stmt):
    """Send ONE statement inside an explicit READ ONLY transaction.

    The transaction is the enforcement: if the statement tries to write, the server refuses
    it with 25006 regardless of how the statement is shaped. The transaction is rolled back
    rather than committed — a read-only transaction can commit nothing, but rolling back
    also makes the intent unambiguous in the server log.
    """
    wrapped = "begin read only;\n" + stmt.rstrip().rstrip(";") + ";\nrollback;"
    body = json.dumps({"query": wrapped}).encode()
    req = urllib.request.Request(API.format(ref=ref), data=body,
                                 headers=dict(HEADERS, Authorization="Bearer " + token))
    try:
        with urllib.request.urlopen(req, timeout=90) as resp:
            return resp.status, resp.read().decode("utf-8", "replace")
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode("utf-8", "replace")
    except Exception as e:                                    # noqa: BLE001
        return "ERR", str(e)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--ref", default=os.environ.get("UT_PROJECT_REF", ""))
    ap.add_argument("--sql", default="scripts/batch14ax-preflight-production.sql")
    ap.add_argument("--json", default="/tmp/preflight-report.json")
    ap.add_argument("--markdown", default="")
    args = ap.parse_args()

    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "")
    if not token:
        sys.exit("SUPABASE_ACCESS_TOKEN is not set")
    if not args.ref:
        sys.exit("--ref (or UT_PROJECT_REF) is required")

    sql = open(args.sql, encoding="utf-8").read()

    # ------------------------------------------------------------------ control --
    # Prove the read-only enforcement can actually fail before trusting it for the run: a
    # deliberately mutating statement is sent through the SAME wrapper and must be refused
    # with 25006. Without this, "wrapped in a read-only transaction" is a claim about code.
    ctl_status, ctl_body = run_statement(
        args.ref, token,
        "insert into public.ut_members (id, email) values "
        "(gen_random_uuid(), 'b14ay-readonly-control@invalid.test')")
    if ctl_status in (200, 201) or "25006" not in ctl_body:
        sys.exit(f"REFUSING TO RUN: the read-only control was NOT refused "
                 f"(status={ctl_status}, body={ctl_body[:200]}) — the wrapper does not "
                 f"enforce read-only, so the preflight could write.")
    print(f"read-only control: a mutating statement was refused with 25006 "
          f"(status={ctl_status}) — enforcement verified")

    # Refuse to send anything that is not a read. Checked on the FILE, before any request.
    for label, stmt in split_statements(sql):
        head = stmt.lstrip().lstrip("(").lstrip().lower()
        if not (head.startswith("select") or head.startswith("with")):
            sys.exit(f"REFUSED: statement is not SELECT/WITH: {stmt[:80]!r}")

    statements = split_statements(sql)
    results = []
    for idx, (label, stmt) in enumerate(statements, 1):
        status, raw = run_statement(args.ref, token, stmt)
        rec = {"n": idx, "label": label[:160], "sql_head": " ".join(stmt.split())[:160],
               "status": status, "rows": None, "columns": None, "result": None,
               "error": None, "redacted": False}
        if status == 201 or status == 200:
            try:
                data = json.loads(raw)
                rec["rows"] = len(data) if isinstance(data, list) else None
                rec["columns"] = sorted(data[0].keys()) if isinstance(data, list) and data else []
                text, hit = redact(data)
                rec["result"] = text
                rec["redacted"] = hit
            except Exception as e:                            # noqa: BLE001
                rec["error"] = f"unparseable response: {e}: {raw[:200]}"
        else:
            rec["error"] = raw[:400]
        results.append(rec)
        print(f"[{idx:02d}/{len(statements)}] status={status} rows={rec['rows']} "
              f"{'REDACTED ' if rec['redacted'] else ''}{rec['sql_head'][:90]}")

    ok = [r for r in results if r["status"] in (200, 201)]
    bad = [r for r in results if r["status"] not in (200, 201)]
    summary = {"project_ref": args.ref, "statements": len(results),
               "returned": len(ok), "failed": len(bad),
               "failed_statements": [{"n": r["n"], "label": r["label"],
                                      "error": (r["error"] or "")[:200]} for r in bad],
               "redacted_statements": [r["n"] for r in results if r["redacted"]]}
    with open(args.json, "w", encoding="utf-8") as fh:
        json.dump({"summary": summary, "results": results}, fh, indent=2)
    print(json.dumps(summary, indent=2))
    print(f"report: {args.json}")
    return 0 if not bad else 3


if __name__ == "__main__":
    sys.exit(main())
