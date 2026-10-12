# Batch 14ah — durable entitlement authority

**Candidate. Prepared, not released.** Continues from `f3c4560`. **No production SQL
is applied**, no production configuration changes, and the schema addition below is a
review candidate that exists only in the private test cluster.

## 1. Why the previous rule was still wrong

Batch 14ag replaced "no linkage" with "linkage" as the authority test: a row that
recorded a Stripe identifier decided entitlement, and a row without one did not.
Identifier presence is not evidence of anything, because **`api/billing/checkout`
writes `stripe_customer_id` at CUSTOMER CREATION** — plan `free`, no subscription, no
reconciliation, no verification of anything. So a checkout could:

* **X1 — suppress legitimate legacy paid access.** A legacy paid row (no linkage, still
  paying) beside a row carrying only a checkout customer id lost to that id.
* **X2 — bypass a recorded revocation.** A `canceled` row without identifiers was
  ignored because the other table held a checkout customer id.

Both counterexamples were written and run **before the repair**. Captured output
against `f3c4560`:

```
batch14ah-durable-authority  [COUNTEREXAMPLES — RED BEFORE REPAIR]

  --- X1 a checkout customer id must not suppress a legacy paid row ---
    effective plan = free
  FAIL: X1 TARGET: customer creation alone must not suppress legitimate legacy paid access (got free)
  --- X2 a checkout customer id must not bypass a recorded revocation ---
    effective plan = initiate
  FAIL: X2 TARGET: customer creation alone must not bypass a recorded revocation (got initiate)

assertions passed: 0
assertions failed: 2
```

## 2. The authority contract (exact)

**State.** `entitlement_authority_at timestamptz`, nullable, on `public.ut_members` and
`public.profiles`. Non-null means: *a lifecycle writer completed a verified
reconciliation against Stripe's CURRENT state and persisted this row atomically with
that decision.* It is that reconciliation's timestamp.

**Terms.**

* **ATTESTED** — `entitlement_authority_at` is present (a non-empty timestamp string).
* **UNATTESTED** — it is absent. Includes legacy rows, anything a checkout wrote at
  customer creation, and hand-seeded rows.

**Rules.**

1. **Authority is reconciliation evidence, never identifier presence.** An identifier
   makes a row *addressable*; it does not make it *authoritative*.
2. **A row may decide entitlement only if it is ATTESTED.** An attested row may both
   GRANT and REVOKE.
3. **If at least one row is attested, only attested rows decide.** Unattested rows
   contribute nothing — no grant and no revocation. Each is reported in
   `unaddressable` and is never rewritten by address.
4. **If NO row is attested, the previous rule stands unchanged**: highest plan wins,
   and `ut_members.subscription_status` revokes. This preserves legitimate legacy
   access *and* keeps a recorded revocation effective. That is the whole of X1/X2.
5. **CONTRADICTION — two attested rows that disagree about the relationship they
   record** (a different non-empty `stripe_customer_id`, or a different non-empty
   `stripe_subscription_id`) **fail closed**: `{ok:false, reason:"ambiguous"}`, which
   every caller already answers as guest. Nothing stored says which governs, and
   choosing one would be guessing.
6. **Revocation authority is unchanged** — `ut_members.subscription_status`, and only
   when that row is attested (or, under rule 4, when nothing is attested).
   `profiles.subscription_status` stays non-authoritative: nothing writes *and clears*
   it, so honouring it would revoke permanently.
7. **Resolution is unchanged** — a table returning more than one row is still
   `ambiguous`; a lookup error is still a failure, never an absent row.

**The four cases the rule must cover**

| Stored shape | Outcome |
|---|---|
| **customer-only linkage** created by checkout, no evidence | NOT authority. Decides nothing while an attested row exists; under rule 4 it does not manufacture a decision either |
| **subscription linkage**, attested | authority: grants and revokes |
| **profiles-only membership** | attested → that row decides; unattested → rule 4 |
| **contradictory records** (two attested rows, different customer *or* different subscription) | fails closed; neither row entitles and neither is rewritten |

## 3. The lifecycle writer contract

| Path | Writes the stamp? | Why |
|---|---|---|
| `customer.subscription.created` / `.updated` | **YES** | it reconciled against Stripe's current state and applied the decision atomically |
| `customer.subscription.deleted` (cancellation) | **YES** — corrected in Batch 14ai | a cancellation IS a completed, verified reconciliation: it establishes authority on the first one and refreshes it afterwards, and it clears the mirror's linkage too. Leaving it out meant a first cancellation established nothing, so an unreconciled paid row kept access |
| `invoice.payment_succeeded` | **member YES; profile NO** — corrected in Batch 14ai | the member write settles the plan AND the governing subscription; the mirror write settles only the plan and the customer, so attesting it made the invoice's own write leave a contradicted attested pair behind |
| `invoice.payment_failed` (dunning) | **NO** — corrected in Batch 14ai | dunning determines the PAYMENT status, not the plan; attesting it turned an untouched cached plan into a complete entitlement decision |
| `api/billing/checkout` (customer creation), `writeMembershipRow` | **NO** | not a subscription reconciliation; nothing changes in that path |

Two invariants make this coherent:

* **Persisted atomically.** The stamp travels in the same `p_targets` payload as the
  plan/status it authorises, in the same transaction, under the same global key.
  There is no window in which a decision is visible without its evidence.
* **Written by every completed reconciliation, never set to NULL by any path.** A
  cancellation that cleared it would make the revocation unreadable — the mirror image of
  the defect this batch closes. Batch 14ai also REQUIRES that the attestation be earned:
  see the writer contract in `docs/BATCH14AI-WRITER-CONTRACT.md`.

The stamp is **not a guard column**: the four snapshot guards and the exact-coverage
contract are unchanged, so existing payload shapes keep working.

## 4. Atomic persistence — the candidate SQL

`supabase/migrations/20261016_entitlement_authority.sql` — **prepared, not applied**.
It is derived mechanically from the candidates it supersedes and its diff against
`20261015_lifecycle_per_entry_skip.sql` is exactly four changes:

1. `alter table ... add column if not exists entitlement_authority_at timestamptz` on
   both tables (plus column comments);
2. `entitlement_authority_at` added to `c_writable`;
3. the `ut_members` UPDATE writes it when the caller supplies it;
4. the `profiles` UPDATE writes it when the caller supplies it.

The **reviewed** migration is not modified and remains
`supabase/migrations/20261012_apply_lifecycle_update.sql` at git blob
`251d8e4c3a395bc0b73e64d51127955638c039f4` — unchanged by this batch. The candidate is
applied only in the private cluster the shared harness builds; the whole file is one
transaction, so the DDL, the function replacement and the ACLs commit together or not
at all.

## 5. Legacy rows without the evidence

A row with `entitlement_authority_at IS NULL` is **not** penalised while nothing for
that address is attested: rule 4 gives it exactly today's treatment. The moment
something for that address *is* attested, the unattested row stops deciding — because
there is now a verified reconciliation to prefer.

**No backfill is proposed, and that is deliberate.** Stamping existing rows would
manufacture authority the system never established: it would assert that a
reconciliation happened where none did, which is precisely the inference this batch
removes. Legacy rows earn authority the next time a real reconciliation writes them.

## 6. Evidence

* **Counterexamples**: RED before the repair (output above), green after — X1 `initiate`,
  X2 `guest`.
* **The pinned cases are preserved**: `batch14s-unlinked-row-authority.js` — **byte-identical**
  (git blob `296b77e06fd68ded9436d3ff59d1c4d0d3231d11`) — reports **10 / 0** under the new
  rule, so U1 and U2 are green for the durable reason, not the identifier one.
* **The durable suite**: `scripts/batch14ah-durable-authority.js` **24 passed / 0 failed**
  — X1, X2, plus N1 customer-only checkout on its own (reports its own plan, no
  manufactured authority), N2 profiles-only membership (attested and unattested), N3
  contradictory **subscription** records fail closed and are named, N4 evidence decides
  while identifiers do not (both directions, including that an attested revocation still
  overrides a stale paid mirror), W1 a cancellation **attests** the row it revokes
  (establishes or refreshes; the field is set, never cleared — Batch 14ai), and W2 a
  reactivation re-asserts it — including that the unattested table was never written
  (`outcome=absent, affected=0`) and that zero rows were inserted.
* **The read-authority suite**: `scripts/batch14ag-read-authority.js` **30 / 0** after its
  A3/A6/A7 fixtures and header were re-pointed from identifier presence to reconciliation
  evidence (recorded in the file's own header as a supersession, not a weakening).
* **Everything else unchanged**, re-run for this commit: `batch14b` 41/0, `batch14c` 38/0,
  `batch14d` 12/14, `batch14e` 13/9, `batch14f` 11/0, `batch14g` 10/2, `batch14l` 7/6,
  `batch14q` 10/10, `batch14-membership-write-contract` 51/0, `batch14m` 7/0, `batch14n`
  15/0, `batch14p` 49/0, `batch14t` 27/0, `batch14r-concurrency` 41/0,
  `batch14r-authorization` 21/0, `batch14af-invoice-write-consistency` 49/0 — each with a
  **byte-identical failing-assertion list**, not merely the same count.
* `scripts/batch14af-atomic-integration.sh` → **24 / 0** against private PostgreSQL 16.
* `npx tsc --noEmit` → exit 0; `npm run build` → exit 0.

### Fixture corrections made, and why they are not assertion changes

* **Five inline-fake suites** (`batch14e/f/g/l/q`) validate the columns a reader selects
  against their own `COLUMNS` allow-list. The reader now selects
  `entitlement_authority_at`, which those lists did not carry, so the lookup returned
  `42703` and entitlement assertions failed. Adding the column to those lists is a
  **fixture** correction: every assertion is unchanged and every suite returned to its
  exact prior totals with an identical failing list (`batch14f` back to 11/0). The same
  class of correction was made to `batch14c`'s seed helper in the previous batch.
* **A harness defect was found and fixed**: `readTablesFromPostgres` read committed rows
  back through a hardcoded column list, so the new column was dropped on write-back and
  the write appeared to do nothing. The readback list now tracks `DB_COLUMNS`.

## 7. Limits

* **Exposure was not re-measured against production data.** How many deployed addresses
  hold an unattested row beside an attested one is a SELECT-only verification and stays a
  release blocker. Index hardening and production verification remain separate work.
* **Authority does not expire.** A stale attested row continues to decide until a newer
  reconciliation overwrites it. That is the intended "last verified reconciliation wins"
  semantics; inventing a TTL would be guessing at a requirement.
* **The rule is only as strong as the writers — and that is now enforced.** The stamp must
  be written by reconciled paths only, and Batch 14ai makes the module REFUSE a write that
  attests without supplying the target's plan and subscription linkage. `writeMembershipRow`
  and the checkout path deliberately do not write it at all.
* `batch14s`'s header still reads "PINNED DEFECT — EXPECTED RED"; its unchanged bytes are
  the evidence the rule landed, and updating that header is the owner's call.

**No release readiness is claimed. Production remains `ac49ce06`.**
