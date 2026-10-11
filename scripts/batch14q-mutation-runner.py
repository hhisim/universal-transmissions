#!/usr/bin/env python3
"""batch14q-mutation-runner.py — does the Batch 14 suite actually bite?

Each mutation is applied to a REAL source file in this worktree, the named
suites are executed, and the source is restored. Three things are verified, and
a failure in any of them is reported as a failed run:

  1. the anchor matched exactly once, so a silent no-op mutation is impossible;
  2. the file hash changed after the mutation and changed back after the
     restore — verified after EVERY outcome, including an exception or a
     KeyboardInterrupt, because the restore lives in a `finally` block;
  3. the suite's failure count and the named failing assertions match the
     mutation's declared signature.

The worktree root is derived from this file's own location, so the runner works
from any checkout and never writes to a hard-coded path.

Usage:
    python3 scripts/batch14q-mutation-runner.py            # all mutations
    python3 scripts/batch14q-mutation-runner.py M1 M3      # a subset
"""
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SUITE_14P = "scripts/batch14p-webhook-coverage.js"
SUITE_14Q = "scripts/batch14q-profiles-only-lifecycle.js"
SUITE_14D = "scripts/batch14d-webhook-failure-reactivation.js"

AUTHORITY = "src/lib/stripe-subscription-authority.ts"
LIFECYCLE = "src/lib/membership-lifecycle.ts"
WEBHOOK = "src/app/api/stripe-webhook/route.ts"

# ── the mutations ───────────────────────────────────────────────────────────
# `expect` is {suite: (failure_count, [substrings that must appear among the
# reported failures])}. `None` for the count means "any number above zero".
MUTATIONS = [
    {
        "id": "M0",
        "what": "control: no mutation at all",
        "file": None,
        "old": None,
        "new": None,
        "expect": {SUITE_14P: (0, []), SUITE_14Q: (0, []), SUITE_14D: (0, [])},
    },
    {
        "id": "M1",
        "what": "authority helper: early-return on the first LIVE recorded subscription "
                "(the behaviour as it stood at 2600add3)",
        "file": AUTHORITY,
        "old": """      if (LIVE.has((sub.status ?? "").toLowerCase())) {
        liveRecorded.push({ id: sub.id, status: sub.status ?? null });
      }""",
        "new": """      if (LIVE.has((sub.status ?? "").toLowerCase())) {
        return {
          ok: true,
          found: true,
          subscriptionId: sub.id,
          status: sub.status ?? null,
          selectedBy: "stored",
          candidates: [],
        };
      }""",
        # Exactly the three S6 assertions: the ambiguity is no longer detected.
        "expect": {
            SUITE_14P: (3, [
                "S6 genuine ambiguity fails closed",
                "S6 the ambiguity is named",
                "S6 rejected reconciliation performs ZERO membership writes",
            ]),
            SUITE_14Q: (0, []),
        },
    },
    {
        "id": "M2",
        "what": "lifecycle writer: accept an update that affected no row",
        "file": LIFECYCLE,
        "old": """    if (data.length !== 1) {
      // The row was resolved from verified linkage and then not written. That is
      // a failure, not an empty success: the caller must refuse the delivery so
      // Stripe retries. Zero matches never count as completion.
      return {
        ok: false,
        reason: "lifecycle_row_not_updated",
        detail: `${table}.${target.pkColumn}: ${data.length} row(s) affected, expected exactly 1`,
        code: "NO_AFFECTED_ROWS",
      };
    }""",
        "new": """    // MUTATED: zero affected rows are accepted as completion.""",
        "expect": {
            SUITE_14Q: (2, [
                "Q3 an update that affected no row is REFUSED",
                "Q3 the failure is named in the response",
            ]),
            SUITE_14P: (0, []),
        },
    },
    {
        "id": "M3",
        "what": "lifecycle writer: address profiles by a non-existent `id` column "
                "instead of its real primary key `user_id`",
        "file": LIFECYCLE,
        "old": """  ut_members: "id",
  profiles: "user_id",""",
        "new": """  ut_members: "id",
  profiles: "id",""",
        "expect": {
            SUITE_14Q: (None, ["Q1 at least one required write actually affected a row"]),
            SUITE_14P: (None, ["S3 profiles-only access revoked",
                               "S1 profiles mirrored to free"]),
        },
    },
    {
        "id": "M4",
        "what": "webhook: skip the profiles mirror whenever the event carries no "
                "metadata.email (the pre-repair guard)",
        "file": WEBHOOK,
        "old": """      const lifecycleProfileWrite = await applyLifecycleUpdate(
        utSupabaseAdmin,
        "profiles",
        lifecycleAuthorityInput,
        profileFields
      );
      if (!lifecycleProfileWrite.ok) {""",
        "new": """      const lifecycleProfileWrite = await (email
        ? applyLifecycleUpdate(
            utSupabaseAdmin,
            "profiles",
            lifecycleAuthorityInput,
            profileFields
          )
        : Promise.resolve({ ok: true, linked: false, updated: 0, resolved: 0, eligible: 0 }));
      if (!lifecycleProfileWrite.ok) {""",
        "expect": {
            SUITE_14Q: (None, ["Q1 the profiles row reflects the cancellation",
                               "Q2 the profiles row records B's linkage"]),
            SUITE_14P: (0, []),
        },
    },
]


def sha256_of(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_suite(suite: str) -> tuple[int, int, list[str], str]:
    """Return (exit_code, failure_count, failing labels, combined output)."""
    proc = subprocess.run(
        ["node", suite], cwd=str(ROOT), capture_output=True, text=True
    )
    out = proc.stdout + proc.stderr
    failures = [line.split("FAIL:", 1)[1].strip() for line in out.splitlines() if "FAIL:" in line]
    count = len(failures)
    for line in out.splitlines():
        if line.startswith("assertions failed:"):
            count = int(line.split(":", 1)[1].strip())
    return proc.returncode, count, failures, out


def main(argv: list[str]) -> int:
    wanted = {a.upper() for a in argv[1:]}
    selected = [m for m in MUTATIONS if not wanted or m["id"] in wanted]
    if not selected:
        print("no mutations selected")
        return 2

    print(f"worktree: {ROOT}")
    print(f"selected: {', '.join(m['id'] for m in selected)}\n")

    problems: list[str] = []
    report: list[str] = []

    for mutation in selected:
        mid = mutation["id"]
        target = ROOT / mutation["file"] if mutation["file"] else None
        original_bytes = target.read_bytes() if target else None
        original_hash = sha256_of(target) if target else None
        mutated_hash = None
        restored = target is None
        line = f"{mid}: {mutation['what']}"

        try:
            if target is not None:
                if original_bytes is None:
                    raise RuntimeError("target missing")
                text = original_bytes.decode("utf-8")
                occurrences = text.count(mutation["old"])
                if occurrences != 1:
                    raise RuntimeError(
                        f"anchor matched {occurrences} times, expected exactly 1"
                    )
                target.write_text(
                    text.replace(mutation["old"], mutation["new"]), encoding="utf-8"
                )
                mutated_hash = sha256_of(target)
                if mutated_hash == original_hash:
                    raise RuntimeError("the mutation did not change the file")

            for suite, (expect_count, expect_labels) in mutation["expect"].items():
                code, count, labels, _out = run_suite(suite)
                # Hash check AFTER every outcome: a suite must not be able to
                # leave the source different from what we wrote.
                if target is not None and sha256_of(target) != mutated_hash:
                    problems.append(f"{mid}/{suite}: source changed during the run")
                status = "ok"
                if expect_count is None:
                    if count == 0:
                        status = "NOT DETECTED"
                    elif code == 0:
                        status = "exit was 0 despite failures"
                else:
                    if count != expect_count:
                        status = f"expected {expect_count} failures, got {count}"
                    elif (count > 0) != (code != 0):
                        status = f"exit code {code} disagrees with {count} failures"
                missing = [label for label in expect_labels if not any(label in l for l in labels)]
                if missing:
                    status = "missing named failures: " + "; ".join(missing)
                if status != "ok":
                    problems.append(f"{mid}/{suite}: {status}")
                report.append(
                    f"  {suite:44s} exit={code:<3d} failures={count:<3d} {status}"
                )
        finally:
            if target is not None:
                # Restore from the bytes we read, whatever happened above.
                target.write_bytes(original_bytes)
                restored = sha256_of(target) == original_hash
                if not restored:
                    problems.append(
                        f"{mid}: RESTORE FAILED — {mutation['file']} hash is "
                        f"{sha256_of(target)} but was {original_hash}"
                    )
                elif mutated_hash is None:
                    problems.append(f"{mid}: mutation was never applied")

        report.append(
            f"  restore: hash {'verified' if restored else 'NOT VERIFIED'} "
            f"({original_hash[:12] if original_hash else 'n/a'})"
        )
        report.append("")

    print("\n".join(report))
    if problems:
        print("MUTATION RUN FAILED:")
        for problem in problems:
            print("  - " + problem)
        return 1
    print("MUTATION RUN PASSED — every mutation was detected and every restore verified")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
