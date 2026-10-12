# Batch 14ag — membership read authority

**Candidate. Prepared, not released.** Continues from `7a098b1`. No production SQL was
applied and no production configuration changed: the rule below is a reader-side
candidate, and the additional state discussed in §5 is **proposed and not written**.

## 1. The defect this closes

`scripts/batch14s-unlinked-row-authority.js` was committed RED on purpose. One table
carries the verified Stripe linkage, the other holds a row for the same address with no
linkage at all. No lifecycle writer can address that row — and must not, by address —
but the shared reader ranked it anyway:

* **U1, cancellation.** The linked row is revoked to `guest`; an unlinked row at
  `initiate`/`active` outranks it → the member **stays PAID**, acknowledged `200`.
* **U2, reactivation.** The linked row is granted `initiate`; an unlinked row whose
  `subscription_status` is `canceled` is the reader's revocation authority → the member
  **stays REVOKED**, acknowledged `200`.

Both directions are the same defect: a row that no verified relationship owns still
decided entitlement.

## 2. The authority definition

**SUPERSEDED BY BATCH 14ah** (`docs/BATCH14AH-DURABLE-AUTHORITY.md`). The rule below
turned on **identifier presence**, and `api/billing/checkout` writes `stripe_customer_id`
at CUSTOMER CREATION with no reconciliation behind it — so a checkout could suppress a
legitimate legacy paid row and bypass a recorded revocation. Authority is now explicit
evidence of a **completed, verified subscription reconciliation**
(`entitlement_authority_at`). The alternative reading below is kept as the record of what
was decided at this batch, and the general shape (evidence-only rows decide; no evidence
⇒ previous rule; contradiction ⇒ fail closed) survived the change.

An identifier is **present** when the stored value is a string with non-whitespace
content. `""`, `"   "`, `null` and a missing column are all **absent**.

A row is **LINKED** when `stripe_customer_id` or `stripe_subscription_id` is present.
A row is **UNLINKED** when neither is present.

> **1 — Linkage is necessary.** Entitlement is decided by the LINKED rows alone.
> An UNLINKED row contributes **neither a grant nor a revocation**. It is reported as
> `unaddressable` and is never rewritten by address.
>
> **2 — A bare identifier is not sufficient.** Linkage makes a row a **candidate**, not
> an authority. The candidates must also agree about **who the membership belongs to**:
> if two linked rows record **different non-empty customer ids**, the authority is
> **CONTRADICTORY** and the read **fails closed** (`{ok:false, reason:"ambiguous"}`,
> which every caller already answers as guest). The stored state does not say which
> customer is current, and choosing one would be guessing.
>
> **3 — No linked row at all.** When **no** row for the address carries a linkage there
> is no verified relationship to prefer, and the previous rule stands unchanged:
> highest plan wins, `ut_members.subscription_status` revokes. **This is what preserves
> legitimate legacy access.**
>
> **4 — Revocation authority is unchanged.** `ut_members.subscription_status` revokes,
> and only when that row has authority. `profiles.subscription_status` stays
> non-authoritative: nothing writes *and clears* it, so honouring it would revoke
> permanently (Batch 14r §5, remedy R2).
>
> **5 — Resolution itself is unchanged.** A table returning more than one row is still
> `ambiguous`; a lookup error is still a failure, never an absent row. The rule narrows
> *which rows may decide*, not how a decision is computed.

### The four cases it must cover

| Stored shape | Outcome under the rule |
|---|---|
| **customer-only linkage** (`stripe_customer_id` present, subscription absent) | the row has authority; it may grant and revoke |
| **subscription linkage** (`stripe_subscription_id` present, customer absent or present) | the row has authority; it may grant and revoke |
| **profiles-only membership** (no `ut_members` row at all) | linked → that row decides; unlinked → the legacy rule decides |
| **contradictory records** (two linked rows, different customers) | fails closed; neither row entitles and neither is rewritten |

Two linked rows recording **different subscription ids** are *not* a contradiction:
both are relationships recorded for the same customer, and they are read together
(highest plan among them; revocation from any authoritative row).

## 3. Does the existing schema express the distinction?

**Yes — for every writer in the tree — and the candidate therefore needs no migration.**

`UNLINKED` is inferred from the **absence** of both identifiers, so the inference is
exact only while nothing clears them on a row that was linked before. Measured in the
current writers: the only write that nulls an identifier is the revocation path, which
sets `stripe_subscription_id: null` **and always writes `stripe_customer_id` from the
verified event**. No path writes `stripe_customer_id: null`. A revoked row therefore
stays LINKED and keeps its revocation authority.

That is a **convention, not a guarantee**, and it is stated as one:

> Any future path that clears `stripe_customer_id` on a linked row silently converts it
> into an unlinked row, which would then lose its revocation authority and could grant
> access on a stale mirror's word.

## 4. The minimal additional state, if the owner wants it structural

Not required for the pinned cases, and **not applied**. If the distinction must hold by
construction rather than by convention, the smallest addition is **one nullable marker
written once by the linkage writers and never cleared** — `stripe_linked_at timestamptz`
(or an equivalent boolean) — used as:

```
LINKED(row) := row.stripe_linked_at IS NOT NULL
            OR row.stripe_customer_id  is present
            OR row.stripe_subscription_id is present
```

The second and third disjuncts keep every existing row working during any transition, so
the marker can be backfilled without a flag day. This is deliberately **not** included:
the existing fields carry the distinction for all current writers, and adding state that
the rule does not need would be guessing at a requirement.

## 5. The candidate repair

`src/lib/membership-plan.ts` only — no write-path change, no new authority, no
migration:

* `linkageId(value)` — a present identifier, or `null`.
* `hasVerifiedStripeLinkage(row)` — the LINKED test, exported so it is checkable.
* `resolveMembershipPlan` — the authority block: computes `profileLinked`/`memberLinked`,
  fails closed on contradictory customers, narrows the rows that may decide entitlement,
  and reports `unaddressable: string[]` on the result for diagnostics.

The raw rows are still returned (`membership.profile` / `membership.member`), so every
caller's shape is unchanged; only `plan`, `source`, `revokedBy` and the new
`unaddressable` reflect the narrowing.

## 6. Evidence

**The pinned suite went green without being touched.** `batch14s-unlinked-row-authority.js`
is **byte-identical** to its previously-RED state — git blob id
`296b77e06fd68ded9436d3ff59d1c4d0d3231d11`, unchanged at this commit and identical to the
blob committed while the suite was RED — so a green run there means **the rule landed**,
not that the suite was weakened:

```
batch14s-unlinked-row-authority   8 passed / 2 failed   →  10 passed / 0 failed
  U1 TARGET: an unaddressable row must not outrank the linked one      FAIL → ok
  U2 TARGET: an unaddressable revocation must not veto a verified grant FAIL → ok
```

**A focused suite demonstrates the rule and its boundaries**
(`scripts/batch14ag-read-authority.js`, **29 passed / 0 failed**):

* A1/A2 legacy: with no linkage anywhere, a paid row still grants and a `canceled` row
  still revokes — today's behaviour, unchanged.
* A3 customer-only linkage earns authority; the unlinked paid row is reported
  `unaddressable` and does not outrank it.
* A4 subscription-only linkage earns authority; the unlinked paid row cannot veto its
  revocation.
* A5 profiles-only membership: linked grants from that row; unlinked keeps today's
  treatment.
* A6 contradictory customers fail closed, are named, and never surface as a plan.
* A7 two linked, agreeing rows: highest plan still wins, and a linked revocation still
  overrides a stale paid mirror.
* B1/B2 replay the two PINNED cases through the real handler and add what batch14s could
  not assert on the atomic path — that the write carried **no entry at all** for the
  unlinked table (`entries=0`, `seen_pks=0`), that the database reported that linkage
  `absent` with `affected=0`, that exactly one row was updated, that zero rows were
  inserted, and that the unlinked row keeps every stored value it had.

**One affected suite needed a fixture correction, and no assertion was changed.** With
the rule in place `batch14c-entitlement-revocation` went **38/0 → 31/7**. All 7 failures
were classified as **fixture under-specification**, not a product defect: the suite's
`prof()` helper seeded a `profiles` row with **no Stripe linkage** while `mem()` seeded
one **with** it, so cases labelled "profiles=initiate, ut_members=free" (C1) and
"past_due (dunning) keeps access" (C8) were answers about the unlinked-row path rather
than about plan ranking between authoritative rows. Every production writer records the
customer on a `profiles` row, so the helper now seeds it. All 38 assertions are
unchanged and pass; each case reports the same plan/source/revokedBy as before.

**Everything else is unchanged.** Re-run for this commit: `batch14b` 41/0, `batch14c`
38/0, `batch14f` 11/0, `batch14p` 49/0, `batch14t` 27/0, `batch14r-concurrency` 41/0,
`batch14r-authorization` 21/0, `batch14af-invoice-write-consistency` 49/0,
`batch14-membership-write-contract` 51/0, `batch14m` 7/0, `batch14n` 15/0. Still red
with **identical failing-assertion lists**: `batch14d` 12/14, `batch14e` 13/9,
`batch14g` 10/2, `batch14q` 10/10, `batch14l` 7/6 (their own inline fakes have no
`rpc()` surface — a pre-existing condition). `npx tsc --noEmit` → exit 0;
`npm run build` → exit 0.

## 7. Behaviour change, stated plainly

* An **unlinked row loses authority** whenever another row for the same address is
  linked — in both directions. This is the intended repair and it is what makes
  `batch14s` green.
* A member whose records are **never linked** keeps exactly today's treatment, so no
  legacy member silently gains or loses access from this rule.
* Two linked rows naming **different customers** now **deny** access instead of ranking
  their plans. That is a deliberate fail-closed choice, consistent with the reader's
  existing "unreadable is never treated as an answer" rule; selecting a winner would be
  guessing.
* `profiles.subscription_status` remains non-authoritative, unchanged.
* The rule's strength rests on the §3 invariant (no writer clears
  `stripe_customer_id`). It is verified for the current writers only.

## 8. Limits

* Exposure was **not** re-measured against production data. Whether any deployed address
  currently holds an unlinked row beside a linked one is a SELECT-only verification and
  remains a release blocker.
* `batch14s`'s own header still reads "PINNED DEFECT — EXPECTED RED". It was left
  byte-identical on purpose, because its unchanged bytes are the evidence that the rule
  landed rather than the suite being weakened; updating that header is the owner's call.
* `batch14d/e/g/l/q` still cannot reach the atomic path. Porting them onto the shared
  harness is separate work.

**No release readiness is claimed. Production remains `ac49ce06`.**
