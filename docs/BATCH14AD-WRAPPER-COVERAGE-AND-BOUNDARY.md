# Batch 14ad — wrapper lock coverage and execution boundary

Baseline: `7fbf46ba838a705827d276da9c96e544dde9c62a` (`7fbf46b`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, application integration, or policy
selection.** The reviewed base RPC is **unchanged**. Result after repair:
**48 assertions passed / 0 failed**, plus **9/9 mutation assertions**.

---

## 1. The gap, reproduced BEFORE the repair

The wrapper's key set covered the **declared** linkage and each entry's
**`original`** linkage. It did **not** cover the **replacement** linkage a write
installs through `entry.set`. So a call that locates a row through identity **A**
but sets its linkage to **B** is *moving* the row to B — and a concurrent caller
targeting **B** does not contend with that move.

The harness puts the pre-repair derivation in the experiment itself
(`b14ad_keys_pre_repair` / `b14ad_apply_pre_repair`), so the gap stays visible
rather than living only in a git revision. Run against the unrepaired wrapper the
harness reported **21 failures**, of which the load-bearing ones were:

- the customer replacement key was **absent** from the set (A1, A9, A10);
- the subscription replacement key was **absent** (A2);
- the pre-repair set demonstrably lacked it (A7);
- **B1: a concurrent caller targeting the replacement committed inside the
  window** — the race, reproduced;
- both wrappers were **SECURITY DEFINER** and **anon and authenticated could
  execute them** (C1, C2, C4, C5, C7, C8, C20, C22);
- **an actual call under anon and under authenticated SUCCEEDED and changed
  membership state** (C10, C12, C13, C14) — the serious one: unauthorized callers
  could drive entitlement writes.

## 2. Repair — replacement identities in the lock set

`entry.set.stripe_customer_id` and `entry.set.stripe_subscription_id` now
contribute keys to the same set, alongside declared and original. The set is still
**deduplicated and ascending**, so the acquisition order that keeps multi-key
writers from deadlocking each other is unchanged.

**A JSON `null` replacement contributes no key** — it names no identity. That is
asserted, not assumed: a NULL replacement set yields exactly the declared+original
key count (A5). For the move payload the repaired set carries exactly the **two**
replacement keys more than the pre-repair set (A6).

### Tested

- **customer** replacement (A1) and **subscription** replacement (A2);
- declared **and** original identities still covered (A3);
- deduplicated and ascending (A4);
- **NULL** replacement adds nothing (A5);
- **both tables** — the same holds on `profiles` (A9);
- **multiple targets** union their replacement keys (A10);
- the race: pre-repair the replacement caller **committed inside the window**
  (B1); with the repaired wrapper it is **blocked by the expected backend on the
  replacement key** (B2), and both rows end linked to the replacement customer
  (B3).

### Mutation-tested

`scripts/batch14ad-key-mutations.sh` removes the contribution from a
**disposable copy** and requires the named assertion to fail:

| Mutation | Result |
|---|---|
| **MU-REPL-C** — customer contribution removed | A1 **fails**, A2 still passes |
| **MU-REPL-S** — subscription contribution removed | A2 **fails**, A1 still passes |
| **MU-REPL-BOTH** — the whole `entry.set` block removed | **both** fail |

The tracked wrapper's sha256 is **identical before and after** the whole mutation
run — it is never written to.

## 3. Repair — the execution boundary on BOTH wrappers

**SECURITY DEFINER is not needed and is removed.** The wrapper makes no privileged
access of its own: it takes advisory locks (available to every role) and calls the
reviewed RPC, which is itself SECURITY DEFINER and therefore runs its body as its
owner regardless of caller. So an **INVOKER** wrapper is the tighter arrangement —
it executes with the caller's privileges — and that is what both wrappers now are.

- ownership **pinned explicitly** to `postgres` for both wrappers;
- `revoke all` from **PUBLIC**, **anon** and **authenticated** on both wrappers —
  load-bearing, because PostgreSQL grants EXECUTE to PUBLIC on new functions by
  default;
- `grant execute` to **service_role** only;

> **Correction (Batch 14ae).** The claim made here was that without the revokes
> *"every role could drive entitlement writes through the wrapper."* **That
> conflated two separate boundaries and is withdrawn.** Without the wrapper revokes
> a role could **call the wrapper** — not necessarily **write entitlement state**,
> because the base RPC carries its own EXECUTE restriction to `service_role`, and
> an exposed INVOKER wrapper still runs as its caller, so the call is then denied
> at the base RPC. Both statements are now correct in the SQL comment, and the
> boundary suite asserts the wrapper ACL **and the denial point** separately for
> exactly this reason.

- the **trigger installer** is closed to public/anon/authenticated too — it is
  policy, not a read helper;
- **creation, ownership and the ACL changes are one transaction**, so a failure
  part-way through cannot leave a callable function behind with default PUBLIC
  execute rights.

### Verified with actual calls, not just catalogue reads

| Caller | Behaviour |
|---|---|
| **anon** | call **fails**, `42501` permission denied, **no membership change** |
| **authenticated** | call **fails**, `42501`, **no membership change** |
| **service_role** | call **succeeds**, the **real RPC contract** applies |

`ROLLBACK` is preserved through the wrapper under the authorized role: a failing
two-target call still reports the RPC's own `BATCH14 NEWLY_LINKED` and leaves the
first target unwritten.

**Reapplication is verified, not assumed:** re-running the wrapper file succeeds,
and afterwards anon still cannot execute, service_role still can, and the wrapper
is still SECURITY INVOKER.

## 4. Repair — `q()` returns its real SQL exit status

The helper printed its output through `printf` and therefore **returned printf's
status**, so any `if q ...` tested `printf` rather than the statement. It now
captures the psql status and `return`s it, and the permission assertions branch on
that status. Asserted both ways: `q` returns 0 for a statement that succeeds and
**non-zero** for one that fails (D1–D4).

**This defect was present in the Batch 14ac harness too.** It is corrected there in
this commit, and **Batch 14ac's review is corrected accordingly** — its assertions
read `$QRC` explicitly in the places that mattered, but the helper itself did not
return the status and any status-based branch would have been wrong.

## 5. Harness defects found in this batch — reported, not hidden

1. **`RC_OUT` read from a command substitution, again.** `as_role` sets a global,
  so calling it inside `$(...)` set the value in a subshell and the parent read a
  stale one. This is the **third appearance** of the same mistake in this line of
  work (14aa `wait_rc`, 14ac `wait_rc`, now `as_role`); every call site now
  **redirects to a file** and reads the global in the parent.
2. **Unsigned masking of the advisory key.** `hashtextextended` can return a
  negative bigint, and the lock's high 32 bits live in `pg_locks.classid`, an
  **unsigned** oid — so `(key >> 32)` of a negative key never matches and the
  barrier check fails. It is now masked to 32 bits. **This can only produce a
  false *negative*** (the check fails loudly), never a false pass, so **Batch
  14ac's passing block-observations stand** — but the helper was fragile.
3. **`-c` + `-f` gave an unreliable exit status.** Splitting `set role` and the
  call across two psql options left the permission failure reported as exit 0.
  They are now one script file, and the assertions on that status are real.

---

## 6. Still outstanding — unchanged and separate

1. **Independent review of the reviewed RPC primitive** — still the gating step.
2. **The synchronization policy choice** — still not made.
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.

No production authorization is granted.
