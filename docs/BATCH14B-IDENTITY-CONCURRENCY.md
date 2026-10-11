# Batch 14b — Identity, concurrency and membership readback

Baseline: `ac49ce062d66a49b0e4202a5e15755b930667bc3`
Continues from candidate: `20cd838e6c48233daa3cd648cc019ee1443c7411`
Preview work only. No production deployment, no SQL application, no member-data
change, no purchase, no email, no live Stripe mutation.

---

## 1. Why option 3 needed a reader fix first

Option 3 says free activation may persist membership in `ut_members` without
creating a `profiles` row. Tracing the readers showed that alone would have made
the activation **invisible**, because the readers disagreed about precedence:

| Reader | Before | Consults |
|---|---|---|
| `/api/billing/session` | profiles → ut_members | member page (token path) |
| `/api/member/message` | profiles → ut_members | Ask Hakan gate |
| `sanctum/member/codex-ii` (×3) | profiles → ut_members | Codex II gating |
| `/api/billing/plan-status` | **ut_members → profiles** | (no callers since Batch 12b) |
| `/api/member` | ut_members only | member page fallback |

A fixed table order cannot be right in both directions:

- **profiles-first hides a new membership.** Deployed data has 19 `profiles` rows
  and 2 `ut_members` rows, so a member is very likely to hold an old `profiles`
  row at `guest`. Writing `free` to `ut_members` would leave every profiles-first
  reader reporting `guest` — the activation succeeds and nothing observes it.
- **ut_members-first exposes a downgrade.** With `profiles` at `initiate` (paid)
  and `ut_members` at `free`, the ut_members-first reader answered **`free`** for
  a paid member — measured, and the old `PS4` assertion had encoded it as
  expected behaviour.

**Correction:** all readers now share one rule — **highest entitlement wins**,
using the application's own plan vocabulary (`normalizeMemberPlan`). The plan
vocabulary and the price→plan mapping are unchanged.

> Note: `normalizeMemberPlan` recognises only `initiate`, `free` and `guest`;
> every other stored value (e.g. `master`, `seeker`, `full`) normalises to
> `guest`. The resolver inherits that behaviour rather than inventing plan
> semantics. This is why an unrecognised stored value is **not** treated as paid.

## 2. Files changed

| File | Change |
|---|---|
| `src/lib/membership-plan.ts` | **new** — one resolution rule shared by every reader; distinguishes ambiguity from a read failure |
| `src/lib/membership-write.ts` | UPDATE keyed on the table's **real** primary key; refuses to write a `profiles` row owned by a different `user_id`; downgrade guard now uses the app's ranking |
| `src/lib/verified-identity.ts` | exposes the Supabase `userId` when the credential actually is a Supabase token; absent (not fabricated) for NextAuth |
| `activate-free` | resolves the effective plan first; writes `ut_members`; writes `profiles` only with a verified uuid |
| `billing/session`, `billing/plan-status`, `member/message`, `member`, `codex-ii` ×3 | all use the shared resolver |

### Two real defects found in the Batch 14 code

1. The UPDATE was `.eq("id", row.id)` — but **`profiles` has no `id` column**, so
   that branch could never update a profile row.
2. Nothing checked that the row an address resolved to **belonged to the caller**.
   A verified user A whose address matched user B's `profiles` row would have
   written to B's row. Now refused as `identity_mismatch`, demonstrated by test
   `I1` and by a mutation that reinstates the bug.

## 3. Concurrency — real PostgreSQL 17.11, real simultaneous connections

`scripts/batch14b-concurrency.py` runs the **exact statement sequence**
`writeMembershipRow` issues (`SELECT … LIMIT 2`, then INSERT or UPDATE) on
genuinely concurrent connections with a barrier between the read and the write,
so the interleaving is deterministic rather than hoped for.

| Scenario | WITHOUT the index (as deployed) | WITH the proposed index |
|---|---|---|
| Two simultaneous first-time writes, identical address | **2 rows** ❌ | **1 row** ✅ |
| Case/space variants of one address | **3 rows** ❌ | **1 row** ✅ |
| Concurrent free activation + paid update | 1 row, final `initiate` ✅ | 1 row, final `initiate` ✅ |
| Two first-time writes with retry on conflict | **2 rows**, no conflict, no retry ❌ | **1 row**, loser gets `23505` → re-reads → UPDATE ✅ |

**Conclusion — the index is a RELEASE PREREQUISITE.** Read-then-write alone is
*not* concurrent-safe: two simultaneous first-time writes for one address create
two rows, which makes every membership lookup ambiguous. This **withdraws** the
Batch 14 statement that "the application is correct without it". The application
is correct for the *sequential* case without the index; it is **not** correct
under concurrency.

Scenario 2 also shows why the migration's non-canonical-address guard matters:
with the index present the duplicate was blocked, but the loser's retry re-read
returned **0 rows**, because the winner had stored an un-normalised address that
a normalised lookup cannot match. That is precisely the state the preflight
guard aborts on.

> Honest limit: this is database-role concurrency simulation of the helper's
> statement sequence, not two live Vercel invocations. It establishes the
> database-level behaviour, which is where the race lives.

## 4. Migration hardening

`supabase/migrations/20261010_membership_write_contract.sql` — prepared, **not
applied**.

A name is not a constraint. The postflight now asserts that the object is
**unique**, **valid**, **live**, and that its expression really is
`lower(btrim(email))`; the preflight refuses to proceed if the name is already
taken by something else. Measured negatives on isolated PostgreSQL 17.11:

| Negative test | Result |
|---|---|
| Index named `ut_members_email_lower_key` with a **different definition** (`(email)`) | **ABORT** — "already exists with an unexpected definition" |
| Index with the right definition but **INVALID** (`indisvalid=false`) | **ABORT** — "the index exists but is INVALID" |
| Clean data | applies, postflight passes, index unique/valid/live |
| Reapply | idempotent |

## 5. Paid-plan protection versus subscription lifecycle

The two are separated deliberately:

- **Protected path** (`protectPaidPlan: true`) — `activate-free` and `checkout`.
  A free activation cannot lower the effective plan. It refuses only a genuine
  *downgrade in the application's ranking*, so a transition that **raises** the
  effective plan (an unrecognised stored value normalising to `guest` becoming
  `free`) is allowed rather than blocked. Concurrency scenario 3 confirms a paid
  row stays `initiate` while a free activation runs against it.
- **Lifecycle path** (`protectPaidPlan: false`) — the Stripe webhook. Stripe is
  the authority on subscription state, so `customer.subscription.deleted`
  (`initiate`→`guest`), `invoice.payment_failed` (`past_due`) and
  `invoice.payment_succeeded` continue to apply. The guard does **not** block
  them; only the two user-initiated paths are protected.

The price→plan mapping is untouched and was **not** repaired or expanded.
Unresolved policy, stated rather than invented: the webhook writes plan
`"initiate"` for `invoice.payment_succeeded` regardless of price, so a future
non-initiate price would be mapped to `initiate`. That mapping is out of scope
for this batch and is left exactly as found.

## 6. Partial failures and external side effects

Order of operations in `checkout`:

1. verify the Supabase token;
2. read `ut_members` for a stored customer id — **a failed read returns 503 and
   no customer is created** (a failed read is not an absent customer);
3. only then `stripe.customers.create`;
4. write `ut_members`, then `profiles`, each error-checked independently;
5. create the checkout session.

Tested: lookup failure → 503 with **zero** Stripe calls; duplicates → 409 with
zero Stripe calls; a failure of either database write is logged and reported and
the response makes **no persistence claim**. One-table-succeeds-then-other-fails
leaves a partial row rather than a false success, and the next attempt updates
by the real primary key instead of creating a duplicate.

**Orphan customer, still explicit:** the Stripe customer is created *before* the
customer id is persisted, so a failed write orphans it. Not compensated — no
automatic deletion against live Stripe was added, per the brief.

## 7. Evidence and status

**Isolated database (real PostgreSQL 17.11):** concurrency table in §3; migration
negatives in §4.
**Mocked:** all authenticated handler paths — 309 assertions across five suites,
0 failures.

| Suite | Result |
|---|---|
| `batch11-member-message-authz.js` | PASS 77 / FAIL 0 |
| `batch12-verified-billing-identity.js` | PASS 84 / FAIL 0 |
| `batch12b-plan-status-callers.js` | PASS 56 / FAIL 0 |
| `batch14-membership-write-contract.js` | 51 / 0 |
| `batch14b-membership-readback.js` | 41 / 0 |

Batch 12/12b harnesses needed a mock upgrade (their DB mock implemented only
`.maybeSingle()`; the readers now use `.limit(2)`). That was a harness gap and is
fixed. `batch12b` `PS4` was updated because it had encoded the ut_members-first
precedence that reported a paid member as `free`.

Mutations caught: disabling the identity-mismatch guard → 3 failures; restoring
profiles-first precedence → 3 failures.

**Live:** anonymous/incomplete preview probes only — no authenticated session,
portal session, checkout, purchase, subscription, email or database write.

## 8. Preservation

Batch 13 ACLs and policies, pricing, webhook price mapping, backend
configuration, Oracle, corpus, media and the original dirty workspace untouched.
No production SQL, no production deployment.
