# Batch 14c — Entitlement revocation and final review

Baseline: `ac49ce062d66a49b0e4202a5e15755b930667bc3`
Continues from: `59bcef660ba17012551496ac539c01b8527ec3c1`
Preview and isolated testing only. No production SQL, no deployment, no member-data
change, no live Stripe operation.

---

## 1. The defect: ranking is not an authority rule

"Highest entitlement wins" protects a paid plan from being overwritten by a free
activation. It is **not** an authority rule, and on its own it preserved access
after a legitimate revocation: a stale `initiate` in one table outranked a
`guest` recorded by the cancellation in the other, so the member stayed entitled
forever.

**Which fields and events actually revoke.** Only `subscription_status` carries
lifecycle state; `plan` is a cached projection of it. The application already
writes:

- `customer.subscription.deleted` → `ut_members.plan='guest'`, `subscription_status='canceled'`,
  then a **separate** `profiles` update to `plan='free'` looked up by `stripe_customer_id`.
- `invoice.payment_failed` → `subscription_status='past_due'`, plan unchanged (dunning keeps access).

### The rule chosen

**A recorded revocation is an authority signal and outranks every stored plan.**
If either row for the identity carries a revoking status, the effective plan is
`guest`, regardless of what any plan column says. Otherwise the existing
highest-entitlement ranking applies unchanged.

Revoking: `canceled`, `incomplete_expired`, `unpaid`.
Not revoking: `active`, `trialing`, `past_due` (the existing dunning behaviour),
`inactive` (the `profiles` column default, and the value on eight `guest` rows),
and NULL.

Deployed data at the time of writing: **zero rows in any revoking state**; the
only paid rows are one `profiles.initiate` and one `ut_members.initiate`, both
`active`. **No existing member loses access under this rule** — verified by the
status cross-tab in §7.

No new billing policy, no price→plan change, and **no additional SQL** is
required — the rule is read-side only.

## 2. Enumerated entitlement cases

Real shared reader plus real `billing/session`, `billing/plan-status` and Ask
Hakan handlers. "Eligibility" is the predicate Ask Hakan and Codex II apply.

| Case | Stored state | Effective plan | Eligibility |
|---|---|---|---|
| C1 | profiles `initiate`/active, ut_members `free` | `initiate` | eligible |
| C2 | profiles `initiate`/active, ut_members `guest` + **canceled** | **`guest`** | **denied** |
| C3 | profiles `guest`, ut_members `initiate`/active | `initiate` | eligible |
| C4 | ut_members `initiate` but **canceled** | **`guest`** | **denied** |
| C5 | successful lifecycle on both tables | **`guest`** | **denied** |
| C6 | profiles write failed, ut_members revoked | **`guest`** | **denied** |
| C7 | ut_members write failed (still `initiate`/active), profiles `free` | `initiate` | eligible — **honest limitation** |
| C8 | `past_due` (dunning) | `initiate` | eligible |

**C7 is the remaining gap and is reported, not hidden.** If the revocation write
to `ut_members` fails, no revocation is recorded anywhere and the stale paid
state is what the database holds; the reader reports it accurately rather than
guessing. The webhook currently logs a failed membership write and continues, so
**Stripe never retries** — making the handler surface a failure is a reliability
fix worth doing separately, and is not done here.

## 3. Existing-row concurrency (step 2)

`scripts/batch14c-concurrency-update.py`, PostgreSQL 17, real connections, both
reads forced before either write, both write orders.

| Scenario | Final stored plan |
|---|---|
| **Without** compare-and-set, order A (activation then upgrade) | `initiate` ✅ |
| **Without** compare-and-set, order B (upgrade then activation) | **`free`** ❌ |
| **With** compare-and-set, order A | `initiate` ✅ |
| **With** compare-and-set, order B | `initiate` ✅ (loser reports `cas_conflict`) |
| Two protected writes, either mode | `free` (no harm) |

Order B without the CAS is a **lost update**: the activation evaluated a stale
`free` read, passed its guard, and clobbered a paid upgrade. A unique email index
prevents duplicate INSERTs; it does nothing for a lost UPDATE. The UPDATE is now
conditional on the plan value actually read, so the comparison and the write are
atomic with respect to the row, and the loser gets `CONCURRENT_MODIFICATION`
instead of overwriting.

## 4. Release order (step 3) — prepared, nothing applied

**The index is a prerequisite for this release**, not merely for the wording of a
concurrency claim. There must be **no application-first production release**.

1. Review final code and the exact migration bytes.
2. Re-check production data/index preconditions read-only.
3. **Separately authorised** SQL application and verification.
4. **Separately authorised** exact-SHA application release.

## 5. Cumulative diff and purpose of each change

(Base: `ac49ce06`. Roster generated from `git diff --name-only`.)

**Application (`src/`)**

| File | Purpose |
|---|---|
| `lib/membership-plan.ts` | **new** — one resolution rule for every reader: revocation authority, then highest entitlement; distinguishes ambiguity from a read failure |
| `lib/membership-write.ts` | single error-checked write path: read-then-write, identity-scoped UPDATE on the real PK, downgrade guard on the app's own ranking, **compare-and-set** |
| `lib/verified-identity.ts` | exposes the Supabase `userId` only when the credential really is a Supabase token |
| `api/billing/activate-free` | option 3: resolve effective plan, write `ut_members`, write `profiles` only with a verified uuid |
| `api/billing/checkout` | canonical address, fail-closed lookup, `profiles` keyed by verified `user_id` |
| `api/billing/session` | **authorization boundary** — profiles-first replaced by the resolver |
| `api/billing/plan-status` | **authorization boundary** — ut_members-first replaced by the resolver |
| `api/member/message` | **authorization boundary** (Ask Hakan gate) — resolver; previously ranked raw plans |
| `api/member` | **authorization boundary** — was unauthenticated, wrote on GET, returned `select("*")` |
| `api/stripe-webhook` | error-checked writes; price→plan mapping **unchanged** |
| `sanctum/member/codex-ii/page.tsx` | **authorization boundary** — resolver |
| `sanctum/member/codex-ii/gallery/page.tsx` | **authorization boundary** — resolver |
| `sanctum/member/codex-ii/exclusive/page.tsx` | **authorization boundary** — resolver |
| `sanctum/member/page.tsx` | stops sending a client-supplied address |

**SQL / tests / docs** — the migration, its reversal, the isolated fixture and
probes, the verify runner, the concurrency harnesses, the five suites and the
two review documents.

## 6. Why the Batch 14 assertion count went 52 → 51

Not a lost assertion. The old `A4` block made **four** claims, one of which —
*"A4 no row was created"* — asserted that activation writes **nothing**, which
option 3 deliberately contradicts. It was replaced by two narrower claims: that
the activation **is** recorded in `ut_members`, and that no `profiles` row is
invented. Four assertions became three: **52 → 51**, with the removed claim's
subject matter still covered, and now by assertions that match the intended
behaviour.

Separately, `PS4` in the batch12b suite was **rewritten, not deleted** — it had
encoded the ut_members-first precedence that reported a paid member as `free`.

## 7. Evidence separation

**Isolated database (real PostgreSQL 17.11):** §3 update race; the insert race and
migration negatives from Batch 14b; and the read-only status cross-tab that
justifies the revoking-status set (zero revoking rows; paid rows both `active`).
**Mocked:** all authenticated handler paths — six suites, **347 assertions, 0
failures** (77 + 84 + 56 + 51 + 41 + 38).
**Mutations caught:** revocation authority removed → C2/C4 fail; compare-and-set
removed → **DOWNGRADE CONFIRMED** on real PostgreSQL.
**Live:** anonymous/incomplete preview probes only.

Harness gaps closed (not product regressions): the batch11/12/12b DB mocks
implemented only `.maybeSingle()` and needed `.limit(2)`; the batch14/b/c mocks
needed `.is()` for the conditional UPDATE.

## 8. Limitations

- C7: a failed revocation write leaves a stale paid row that the reader reports
  accurately but cannot detect as revoked.
- Concurrency evidence is the helper's statement sequence on real connections,
  not compiled TypeScript inside two Vercel invocations.
- The `profiles` identity question (8 rows whose `user_id` matches no
  `auth.users` row) remains open, untouched, and is not resolved by option 3.
- The webhook answers success when a membership write fails, so Stripe does not
  retry.
