#!/usr/bin/env python3
"""batch14r-mutation-runner.py — do the Batch 14 suites actually bite?

Each mutation is applied to a REAL source file in this worktree, the named
suites are executed, and the source is restored. Three things are verified, and
a failure in any of them fails the run:

  1. the anchor matched exactly once, so a silent no-op mutation is impossible;
  2. the file hash changed after the mutation and changed back after the restore
     — verified after EVERY outcome, including an exception or KeyboardInterrupt,
     because the restore lives in a `finally` block;
  3. the suite's failure count and the NAMED failing assertions match the
     mutation's declared signature.

The worktree root is derived from this file's own location, so the runner works
from any checkout and never writes to a hard-coded path.

Usage:
    python3 scripts/batch14r-mutation-runner.py            # all mutations
    python3 scripts/batch14r-mutation-runner.py M0 M5      # a subset
"""
from __future__ import annotations

import hashlib
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
S_14P = "scripts/batch14p-webhook-coverage.js"
S_14Q = "scripts/batch14q-profiles-only-lifecycle.js"
S_14D = "scripts/batch14d-webhook-failure-reactivation.js"
S_AUTH = "scripts/batch14r-lifecycle-authorization.js"
S_CONC = "scripts/batch14r-concurrency-interleavings.js"
S_UNLINKED = "scripts/batch14s-unlinked-row-authority.js"
S_SNAPSHOT = "scripts/batch14t-snapshot-timing.js"

AUTHORITY = "src/lib/stripe-subscription-authority.ts"
LIFECYCLE = "src/lib/membership-lifecycle.ts"
WEBHOOK = "src/app/api/stripe-webhook/route.ts"

# `expect` is {suite: (failure_count_or_None, [substrings that must appear among
# the reported failures])}. None means "any number above zero".
MUTATIONS = [
    {
        "id": "M0",
        "what": "control: no mutation at all",
        "file": None,
        "old": None,
        "new": None,
        "expect": {S_14P: (0, []), S_14Q: (0, []), S_AUTH: (0, []), S_CONC: (0, []), S_14D: (0, [])},
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
            S_14P: (3, [
                "S6 genuine ambiguity fails closed",
                "S6 the ambiguity is named",
                "S6 rejected reconciliation performs ZERO membership writes",
            ]),
            S_14Q: (0, []),
        },
    },
    {
        "id": "M2",
        "what": "lifecycle writer: accept a conditional write that lost its race "
                "instead of re-resolving",
        "file": LIFECYCLE,
        "old": """      conflicted += 1;
      continue;""",
        "new": """      // MUTATED: the lost race is accepted rather than re-resolved.
      continue;""",
        "expect": {
            # The interleavings that rely on a conflict being reported, plus Q3.
            S_CONC: (11, ["S3-A the grant won on the FRESH snapshot",
                          "S4-A the authoritative status won"]),
            S_14Q: (2, ["Q3 an update that affected no row is REFUSED"]),
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
            S_14Q: (10, ["Q1 at least one required write actually affected a row"]),
            S_14P: (19, ["S3 profiles-only access revoked", "S1 profiles mirrored to free"]),
        },
    },
    {
        "id": "M5",
        "what": "lifecycle writer: drop the contradictory-linkage guard, letting a "
                "subscription-only match override the customer the row names",
        "file": LIFECYCLE,
        "old": """      if (query.column === "stripe_subscription_id" && customerId) {""",
        "new": """      if (false && query.column === "stripe_subscription_id" && customerId) {""",
        "expect": {
            S_AUTH: (11, ["E5a the contradiction refuses the delivery",
                          "E5a the mistaken customer is NOT silently repaired"]),
            S_CONC: (11, ["S1-A the reassigned row refuses the delivery",
                          "S1-B the contradiction is refused on the first look too"]),
        },
    },
    {
        "id": "M6",
        "what": "lifecycle writer: condition the write on the primary key only, "
                "dropping the snapshot guards (the Batch 14q shape)",
        "file": LIFECYCLE,
        "old": """    for (const column of GUARD_COLUMNS) {
      query = condition(query, column, target.guard[column]);
    }""",
        "new": """    // MUTATED: the write is not conditioned on the snapshot.""",
        "expect": {
            S_CONC: (11, ["S1-A the concurrent reassignment stands",
                          "S4-A exactly one re-resolution happened"]),
        },
    },
    {
        "id": "M4",
        "what": "webhook: skip the profiles mirror whenever the event carries no "
                "metadata.email (the pre-repair guard)",
        "file": WEBHOOK,
        "old": """        const lifecycleProfileWrite = await commitLifecycleUpdate(utSupabaseAdmin, profilePlan);""",
        "new": """        const lifecycleProfileWrite = email
          ? await commitLifecycleUpdate(utSupabaseAdmin, profilePlan)
          : { ok: true, linked: false, updated: 0, resolved: 0, eligible: 0, conflicted: 0 };""",
        "expect": {
            S_14Q: (9, ["Q1 the profiles row reflects the cancellation",
                        "Q2 the profiles row records B's linkage"]),
            S_14P: (0, []),
        },
    },
    {
        "id": "M7",
        "what": "webhook: downgrade a SECOND-table snapshot failure to a warning, so "
                "a rejection discovered there follows a first-table write",
        "file": WEBHOOK,
        "old": """        if (!profileSnapshot.ok) {
          // Nothing has been written yet, so this rejection costs no work.
          membershipFailures.push(`profiles:${profileSnapshot.reason}`);
          console.error("Refusing the profiles write:", profileSnapshot.detail);
          break;
        }""",
        "new": """        if (!profileSnapshot.ok) {
          // MUTATED: the rejection is downgraded, so nothing stops the write.
          membershipWarnings.push(`profiles:${profileSnapshot.reason}`);
        }""",
        "expect": {
            S_AUTH: (2, ["E5a NO write is attempted at all"]),
        },
    },
    {
        "id": "M8",
        "what": "webhook: capture the snapshot AFTER reconciliation instead of "
                "before it (the pre-Batch-14t ordering)",
        "file": WEBHOOK,
        "old": """        // (3) PLAN FROM THE PRE-RECONCILIATION SNAPSHOT — no further reads, and
        // BOTH tables accepted before EITHER is written.
        const memberPlan = planLifecycleUpdate(memberSnapshot, "ut_members", memberFields);
        const profilePlan = planLifecycleUpdate(profileSnapshot, "profiles", profileFields);""",
        "new": """        // MUTATED: re-read the rows here, after reconciliation, instead of using
        // the snapshot taken before it.
        const memberPlan = planLifecycleUpdate(
          await snapshotLifecycleRows(utSupabaseAdmin, "ut_members", lifecycleAuthorityInput),
          "ut_members",
          memberFields
        );
        const profilePlan = planLifecycleUpdate(
          await snapshotLifecycleRows(utSupabaseAdmin, "profiles", lifecycleAuthorityInput),
          "profiles",
          profileFields
        );""",
        "expect": {
            # Reverting the LIFECYCLE path only: T2 and T3 have their own plan
            # lines and are covered by M9 and M10.
            S_SNAPSHOT: (3, ["T1 the installed replacement is PRESERVED"]),
        },
    },
    {
        "id": "M9",
        "what": "webhook: the DELETION path captures its snapshot after "
                "reconciliation instead of before it",
        "file": WEBHOOK,
        "old": """        const memberPlan = planLifecycleUpdate(memberSnapshot, "ut_members", {
          plan: "guest",
          subscription_status: "canceled",
          stripe_subscription_id: null,
          current_period_end: null,
        });
        const profilePlan = planLifecycleUpdate(profileSnapshot, "profiles", { plan: "free" });""",
        "new": """        // MUTATED: re-read the rows here, after reconciliation.
        const memberPlan = planLifecycleUpdate(
          await snapshotLifecycleRows(
            utSupabaseAdmin,
            "ut_members",
            deleteAuthorityInput,
            ownsDeletedSubscription
          ),
          "ut_members",
          {
            plan: "guest",
            subscription_status: "canceled",
            stripe_subscription_id: null,
            current_period_end: null,
          }
        );
        const profilePlan = planLifecycleUpdate(
          await snapshotLifecycleRows(
            utSupabaseAdmin,
            "profiles",
            deleteAuthorityInput,
            ownsDeletedSubscription
          ),
          "profiles",
          { plan: "free" }
        );""",
        "expect": {
            S_SNAPSHOT: (2, ["T2 the deletion is recognised as superseded"]),
        },
    },
    {
        "id": "M10",
        "what": "webhook: the DUNNING path captures its snapshot after "
                "reconciliation instead of before it",
        "file": WEBHOOK,
        "old": """        const pastDuePlan = planLifecycleUpdate(pastDueSnapshot, "ut_members", {
          subscription_status: "past_due",
        });""",
        "new": """        // MUTATED: re-read the row here, after reconciliation.
        const pastDuePlan = planLifecycleUpdate(
          await snapshotLifecycleRows(
            utSupabaseAdmin,
            "ut_members",
            pastDueAuthorityInput,
            notAlreadyCanceled
          ),
          "ut_members",
          { subscription_status: "past_due" }
        );""",
        "expect": {
            S_SNAPSHOT: (3, ["T3 dunning did NOT stamp past_due"]),
        },
    },
]


def sha256_of(path: pathlib.Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def run_suite(suite: str) -> tuple[int, int, list[str]]:
    proc = subprocess.run(["node", suite], cwd=str(ROOT), capture_output=True, text=True)
    out = proc.stdout + proc.stderr
    labels = [ln.split("FAIL:", 1)[1].strip() for ln in out.splitlines() if "FAIL:" in ln]
    count = len(labels)
    for line in out.splitlines():
        if line.startswith("assertions failed:"):
            count = int(line.split(":", 1)[1].strip())
    return proc.returncode, count, labels


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
        report.append(f"{mid}: {mutation['what']}")

        try:
            if target is not None:
                text = original_bytes.decode("utf-8")
                occurrences = text.count(mutation["old"])
                if occurrences != 1:
                    raise RuntimeError(f"anchor matched {occurrences} times, expected exactly 1")
                target.write_text(text.replace(mutation["old"], mutation["new"]), encoding="utf-8")
                mutated_hash = sha256_of(target)
                if mutated_hash == original_hash:
                    raise RuntimeError("the mutation did not change the file")

            for suite, (expect_count, expect_labels) in mutation["expect"].items():
                code, count, labels = run_suite(suite)
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
                missing = [lab for lab in expect_labels if not any(lab in got for got in labels)]
                if missing:
                    status = "missing named failures: " + "; ".join(missing)
                if status != "ok":
                    problems.append(f"{mid}/{suite}: {status}")
                report.append(f"  {suite:46s} exit={code:<3d} failures={count:<3d} {status}")
        finally:
            if target is not None:
                target.write_bytes(original_bytes)
                restored = sha256_of(target) == original_hash
                if not restored:
                    problems.append(
                        f"{mid}: RESTORE FAILED — {mutation['file']} is {sha256_of(target)} "
                        f"but was {original_hash}"
                    )
                elif mutated_hash is None:
                    problems.append(f"{mid}: mutation was never applied")

        report.append(
            f"  restore: hash {'verified' if restored else 'NOT VERIFIED'} "
            f"({original_hash[:12] if original_hash else 'n/a'})\n"
        )

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
