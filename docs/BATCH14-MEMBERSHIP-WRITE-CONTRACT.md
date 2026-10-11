# Batch 14 — Membership write contract

Baseline: `ac49ce062d66a49b0e4202a5e15755b930667bc3`
Branch: `omni/batch14-membership-write-contract`

Production SQL and deployment are **not** touched by this batch. The migration
below is prepared and tested but **not applied**.

---

## 1. The defect

Every membership writer used a PostgREST upsert of the form
`upsert({...}, { onConflict: "email" })`, which compiles to
`ON CONFLICT (email) DO UPDATE`. That form **requires a unique index on
`email`**, and neither table has one. Measured on PostgreSQL 17.11 with the
deployed schema:

```
P1 ut_members upsert onConflict(email)  → FAILED 42P10
     there is no unique or exclusion constraint matching the ON CONFLICT specification
P2 profiles   upsert onConflict(email)  → FAILED 42P10
```

**Not one caller inspected the result.** `activate-free` answered
`{ success: true, plan: "free" }` unconditionally, so it reported a plan change
that had never been written.

Adding `UNIQUE(email)` is necessary but **not sufficient**, and this is the trap
the batch was written to avoid:

```
P3 profiles insert without user_id → FAILED 23502
     null value in column "user_id" of relation "profiles" violates not-null constraint
```

`profiles.user_id` is the PRIMARY KEY, `NOT NULL`, with **no default**. A payload
of `{ email, plan }` therefore cannot insert a row *whatever* unique index
exists — the INSERT half of the upsert fails on a NOT NULL violation. `profiles`
is identified by `user_id`, not by `email`, even though every handler looks it up
by email.

### A third writer the earlier batches never reviewed

`src/app/api/member/route.ts` had **no authentication at all**. It took the
address from `?email=`, was a `GET` that **wrote** (inserting a `ut_members` row
and updating `last_login`), and returned `select("*")` — the full row including
`stripe_customer_id` and `stripe_subscription_id` — to any caller who asked. It
is reached from `src/app/sanctum/member/page.tsx`.

---

## 2. Writer / constraint mapping

| Writer | Identity source | Operation (before) | Conflict target | Error checked? | Stripe interaction |
|---|---|---|---|---|---|
| `POST /api/billing/checkout` | Supabase access token via `auth.getUser()` — **verified** | upsert `{email, stripe_customer_id, plan:"free"}` into `ut_members` **and** `profiles` | `email` (no index → 42P10) | **no** | customer created **before** the writes |
| `POST /api/billing/activate-free` | NextAuth `auth()` session — **verified** | upsert `{email, plan:'free'}` into `profiles` | `email` (no index → 42P10) | **no** — always `success: true` | none |
| `GET /api/member` | **none** — `?email=` query parameter | insert `{email, oracle_access:false}` if absent; update `last_login` | n/a | partially | none |
| `POST /api/stripe-webhook` `customer.subscription.*` | Stripe signature | update `ut_members` by `stripe_customer_id`; update `profiles` by `email` | n/a | logged only | n/a |
| `POST /api/stripe-webhook` `invoice.payment_succeeded` | Stripe signature | upsert into `ut_members` **and** `profiles` | `email` (no index → 42P10) | logged only | n/a |
| `POST /api/stripe-webhook` `invoice.payment_failed` | Stripe signature | update `ut_members` by `stripe_customer_id` | n/a | logged only | n/a |

Verified-identity boundary from Batch 12 is **preserved**: nothing here resolves
identity from a request body, query string or decoded token payload.

---

## 3. Deployed schema and aggregate findings

Read-only catalog inspection of `opixpkquyapeqdceyczs` (PostgreSQL 17.6).
**Counts only — no address, member record or billing identifier was retrieved.**

```
profiles    user_id uuid  PK, NOT NULL, no default   (14 columns)
            email text NULLABLE · plan text NOT NULL default 'guest'
            indexes: profiles_pkey (user_id) only · NO unique index on email

ut_members  id uuid PK default gen_random_uuid()     (9 columns)
            email text NOT NULL · plan text default 'guest'
            indexes: ut_members_pkey (id) only · NO unique index on email
```

| Finding | profiles | ut_members |
|---|---|---|
| Rows | 19 | 2 |
| NULL / empty email | 0 / 0 | 0 / 0 |
| **Exact duplicate-email groups** | **0** | **0** |
| **Case-normalized duplicate groups** | **0** | **0** |
| Rows needing trim / lower | 0 / 0 | 0 / 0 |
| Distinct address count | 19 | 2 |
| Same address in both tables | 2 | — |
| One address → >1 Stripe customer | — | **0** |
| `user_id` present in `auth.users.id` | **11 of 19** | n/a |

The last row is the reason `profiles` cannot be given a uniqueness migration in
this batch without an identity decision — see §6.

---

## 4. The repair (application code)

New shared module **`src/lib/membership-write.ts`** — the single write path:

- `normaliseMemberEmail()` — canonical `lower(trim())` form at the write boundary.
- `findRowByEmail()` — fetches up to **two** rows and returns a discriminated
  result, so a *failed* lookup can never be confused with an *absent* row (the
  old `.maybeSingle()` returned `data: null` for both).
- `writeMembershipRow()` — explicit read-then-write, never an upsert. Refuses to
  downgrade a paid plan; refuses a `profiles` insert without the NOT NULL key;
  fails closed on duplicate matches; surfaces every database error.

Changed handlers:

| File | Change |
|---|---|
| `src/lib/membership-write.ts` | **new** — shared, error-checked write path |
| `src/app/api/billing/activate-free/route.ts` | identity via `resolveVerifiedEmail()`; error-checked; paid plan protected (409); unresolved profile identity reported honestly (409) instead of `success: true` |
| `src/app/api/billing/checkout/route.ts` | canonical address; lookup failure → 503 and **no replacement Stripe customer**; duplicates → 409; `profiles` written with the verified `user_id`; paid plan protected |
| `src/app/api/member/route.ts` | now requires a **verified** identity; ignores `?email=`; read-only; never creates a row on a read; duplicates → 409 |
| `src/app/api/stripe-webhook/route.ts` | upserts replaced with error-checked writes; price→plan mapping **unchanged** |
| `src/app/sanctum/member/page.tsx` | stops sending a client-supplied address |

---

## 5. The migration (prepared, **not applied**)

`supabase/migrations/20261010_membership_write_contract.sql` — **`ut_members`
only**, adding a unique index on `lower(btrim(email))`.

**Exact-match versus case-normalized semantics.** The handlers normalise with
`lower(trim())` before writing, and the webhook's address comes from Stripe
while `activate-free`'s comes from a session — the two historically compared
with different casing. A **case-sensitive** `UNIQUE(email)` would let
`A@x.com` and `a@x.com` coexist while the application treats them as one member.
A **functional** index on `lower(btrim(email))` makes the database agree with the
application.

**Conflict-target compatibility.** After this repair **no handler uses a conflict
target at all** — the writers read first and then insert or update explicitly. So
nothing needs to match this index. Measured:

```
Q1 onConflict(email) against an EXPRESSION index → FAILED 42P10
```

That is deliberate and expected: `ON CONFLICT` inference cannot target an
expression index. If a future caller wants `on_conflict=email`, it needs a plain
`UNIQUE(email)` column index instead. The application is correct **either way**:

```
D2 activate-free works with no unique index present (read-then-write)
```

**Guards.** The migration aborts rather than guessing:

```
3. GUARD: migration must ABORT on case-normalised duplicates
   guard run exit = 3
   BATCH14 ABORT: 1 case-normalised duplicate group(s) covering 2 row(s) exist in ut_members
   index created despite duplicates? 0
```

It also aborts on NULL addresses and on non-canonical stored addresses, because a
row that a normalised lookup cannot find would let the application create a
second row for the same person once uniqueness is enforced.

It changes **no rows, no columns, no ownership, no policies and no default
privileges**, and is idempotent.

---

## 6. Unresolved decision — `profiles` identity (requires your call)

No uniqueness constraint is proposed for `profiles`. The reason is not duplicate
data — there is none. It is an **identity contradiction that only you can
resolve**:

- The table's key is `user_id` (`NOT NULL`, no default).
- Every handler looks the table up by `email`.
- **8 of its 19 rows carry a `user_id` that does not exist in `auth.users`.**
- The NextAuth session this app issues is **JWT-strategy with an email provider**
  and its `session` callback sets **only `email`** — so `activate-free` has no
  uuid to supply, which is exactly why it now returns `409
  PROFILE_IDENTITY_UNRESOLVED` instead of inventing one or claiming success.

Three candidate resolutions, none of which should be chosen silently:

1. **Make `profiles` email-keyed.** Add `UNIQUE(email)`, give `user_id` a default
   (`gen_random_uuid()`) or make it nullable. Cheap, unblocks `activate-free` —
   but it detaches `profiles` from the auth contract and entrenches an
   address-as-identity model that the 8 orphan rows already demonstrate is lossy.
2. **Make `profiles` auth-keyed for real.** Have `activate-free` create or look
   up the Supabase auth user for the verified address and write that `user_id`.
   Correct long-term, but it changes the Oracle sign-up flow and needs a
   backfill/mapping decision for the 8 rows.
3. **Leave `profiles` as read-mostly.** Only the webhook (which has no uuid)
   writes it, and free activation writes `ut_members` instead. Smallest change,
   but the Oracle profile and the member record then diverge.

Nothing in this branch's migration blocks any of the three. Option 2 or 3 is
recommended over option 1.

---

## 7. Isolated database results (PostgreSQL 17.11)

Reproduced from the production catalog, synthetic rows only, on a private socket
(`/var/tmp/b14sock:55434`). The scratch cluster is removed by stopping it.

| Probe | Result |
|---|---|
| P1 `ut_members` `onConflict(email)` as deployed | **FAILED 42P10** |
| P2 `profiles` `onConflict(email)` as deployed | **FAILED 42P10** |
| P3 `profiles` insert without `user_id` | **FAILED 23502** |
| P4 read-then-write, existing row | SUCCEEDED |
| P5 read-then-write, absent row | SUCCEEDED |
| P6 duplicate rows visible to a `limit 2` reader | 2 detected → fail closed |
| Guard: migration with duplicates present | **ABORT**, index **not** created |
| Apply | exit 0, preflight + postflight notices, index present |
| Reapply | exit 0 (idempotent) |
| Q1 `onConflict(email)` against the expression index | FAILED 42P10 (expected) |
| Q2 case-variant of an existing address | **BLOCKED 23505** |
| Q3 whitespace variant | **BLOCKED 23505** |
| Q4 genuinely new address | SUCCEEDED |
| Q5 `profiles` insert without `user_id` after migration | still **23502** |
| Q6 `profiles` insert **with** `user_id` | SUCCEEDED |
| Reversal | exit 0, index removed, defect state returns |

---

## 8. Handler results

`scripts/batch14-membership-write-contract.js` — the **real** handlers through
the project's TS shim, mocking only the Supabase auth endpoint, the DB client,
NextAuth and Stripe. The authorization and error logic runs unaltered.

**52 assertions passed, 0 failed.** Coverage includes: anonymous rejection with
**no database lookup before authentication**; every lookup using the **verified**
address; a supplied victim address never reaching the database and never
appearing in a response; paid plan **not** downgraded; `profiles` insert without
a uuid refused rather than faked; lookup/write failures producing honest
responses; duplicate rows failing closed; and **no Stripe call on any rejected
path** (including no replacement customer when the lookup is unknown).

Two mutations confirm the suite bites:

- disabling the `activate-free` error branch → **3 failures caught**
- restoring query-parameter identity in `/api/member` → **7 failures caught**

Existing regressions remain green: Batch 11 `77/0`, Batch 12 `84/0`,
Batch 12b `56/0`. `tsc --noEmit` exit 0, `next build` exit 0.

---

## 9. Live versus mocked — limitations

- **Mocked:** every authenticated path. No account was created or signed in, no
  session minted, no Stripe object created, no portal session, no checkout, no
  purchase, no email, no database write. Authenticated success is **mocked
  evidence only**.
- **Real:** the PostgreSQL constraint behaviour in §7, and the production catalog
  and aggregate figures in §3.
- The migration is **not applied**, so production still has no unique index on
  either table. The application is correct without it; the index is a
  data-integrity backstop, not a dependency.
- Live preview checks use anonymous and incomplete requests only.

## 10. Stripe side effect before a failed persistence step

In `checkout`, a new Stripe customer is created **before** the customer id is
persisted. If either write then fails, that customer is orphaned. This is logged
and reported, **not** compensated — automatically deleting objects against live
Stripe is out of scope, and no such compensation was added. The fix reduces the
exposure (the lookup now fails closed instead of silently creating a *second*
customer on every attempt) without eliminating it.

## 11. Preservation

Batch 13 policies and grants, pricing, webhook price→plan mapping, backend
configuration, Oracle, corpus, media and the original dirty workspace are
untouched. No production SQL, no production deployment.
