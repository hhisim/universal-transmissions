# Batch 14af — the integrated TypeScript lifecycle path, against the real primitive

Baseline `7dca844`; continued from `e2fa4d2`. Preparation only: no production SQL,
no production configuration, no release.

## What this batch connects

The three lifecycle webhook paths covered by Batch 14t — create/update,
deletion, dunning — now have a single atomic write path in
`src/lib/membership-lifecycle-atomic.ts`. Both tables' conditional writes are
applied by the reviewed primitive in ONE transaction, so a conflict aborts both
rather than leaving access PAID with the mirror unwritten.

**Scope of this commit: the module, the SQL candidate, the integration harness, the
three route call-site switches, the PostgreSQL-backed webhook regression harness,
and this review.** The candidate SQL remains private-cluster-only and is not applied
to production.

## Requirement 1 — payload/call boundary (accepted)

* `AtomicTargetBuild` is the builder's envelope. Callers send `built.target`;
  `buildAtomicLifecyclePayload` returns `{ok:true,targets} | {ok:false,detail}`.
  **The envelope never reaches the RPC.**
* **Local refusals never become payloads.** The field allow-list check and the
  unusable-snapshot branch both return before `callRpc`.
* `membership-lifecycle.ts` gains `all?: LifecycleRow[]` on the snapshot: the
  located set BEFORE the eligibility filter. Additive; `rows` is unchanged.

## Requirement 2 — excluded rows receive no UPDATE

* **All located rows excluded** → the EXISTING target-level `intent: "skip"`:
  every row is covered and its guards validated, none is written.
* **Mixed eligibility** → the target stays `update` and each excluded entry
  carries an explicit `skip: true` and no `set`.
* **The identity-no-op is withdrawn.** An earlier proposal wrote excluded rows
  their own current values and called it a skip. That is not a skip, and it
  would have tripped the plan vocabulary on any out-of-vocabulary value.
* Reporting: `affected` is the number of rows UPDATED; skipped is
  `located - affected`. Neither is inferred.

### The SQL candidate

`supabase/migrations/20261015_lifecycle_per_entry_skip.sql`, **derived
mechanically** from the committed reviewed migration by
`derive_per_entry_skip.py`, so minimality is provable by diff. Five changes:
declare `v_skipped`; validate a `skip` entry as a skip entry (reusing
`SKIP_WITH_SET`); zero `v_skipped`; count and `continue` in the write loop; and
count skipped rows as covered in the completion check.

The `RETURNS TABLE` signature is unchanged, so the wrapper and existing
consumers are unaffected. **The reviewed file is not modified** — the harness
asserts its sha256 before and after applying it, and it remains
`251d8e4c3a395bc0b73e64d51127955638c039f4`.

## Requirement 3 — a PostgreSQL-backed adapter, not a second implementation

`scripts/batch14af-atomic-integration.js` drives the **real module** through an
adapter whose `rpc()` is one `psql` invocation of the real
`public.apply_lifecycle_update_sync_global`. One psql process per call, so each
call is its own transaction — the same shape PostgREST has. No SQL semantics are
reimplemented in JavaScript; a JS re-implementation would only prove that two
implementations agree.

`scripts/batch14af-atomic-integration.sh` builds a private cluster — private
unix socket, **no TCP listener (asserted)**, torn down with its data directory —
applies the schema, the reviewed RPC, the key helpers, the wrapper, then the
per-entry skip candidate.

**The compile is reproducible from committed source.** The harness compiles the
real module into a disposable directory using the **repo's own compiler**
(`node_modules/.bin/tsc`, falling back to `node node_modules/typescript/bin/tsc`
— never `npx`, which resolved to an unrelated `tsc@2.0.4` package on first run).
The generated config `extends` the project's, and is **explicit** about
`include: []`/`exclude: []` (the project's broad `include` otherwise drags in the
whole `src/data` and `blog-content` trees), `rootDir` (the emitted module is
expected at exactly `$OUT/lib/membership-lifecycle-atomic.js`), and
`noEmit`/`incremental`/`composite`. **The compile result is checked** and the
harness aborts on failure; the path is then passed explicitly as
`B14AF_ATOMIC_JS`. A stale or missing module can no longer be used silently.

Verified from a full checkout at `399e8b2` on the host with PostgreSQL 16, with
locked dependencies installed via `npm ci`.

## Requirement 4 — the four scenarios, measured

**24 passed / 0 failed** against real PostgreSQL 16.

* **S1 cancellation** — both tables written in one transaction; the member row
  becomes `guest|canceled|<null>` and the mirror's plan becomes `free` while the
  fields not named in `set` are untouched.
* **S2 reactivation** — both tables restored to `initiate|active|sub_A`.
* **S3 second-table rollback** — the SECOND target (profiles) raises
  `BATCH14 CONFLICT: target profiles pk … no longer matches the snapshot`, and
  the FIRST table's write is **rolled back, unchanged**. Note the class: a guard
  mismatch surfaces as `CONFLICT`, not `SET_CHANGED`; the harness asserts the
  class the primitive actually raises.
* **S4 stale invocation preserves the winner** — a concurrent winner lands
  between snapshot and write; the stale write fails, the failure is **retryable**,
  the winner's state is preserved and the mirror is not written.
* **S5 excluded rows receive no UPDATE** — two located rows, one eligible; the
  eligible row is written across both tables, the excluded row is byte-identical
  afterwards **and keeps its out-of-vocabulary plan (`gold`)**, which is the
  point of a real skip rather than an identity write. Reported `updated=1`,
  `located=2`.

  **Proven by UPDATE instrumentation, not by comparing values.** An
  `AFTER UPDATE … FOR EACH ROW` trigger logs `(table, row_id)` for every UPDATE —
  it fires **even when the values are unchanged**, which is exactly what a value
  comparison cannot detect. After clearing the log, S5 asserts **zero logged
  UPDATEs for the excluded row**, **exactly one for the eligible row** (so the
  instrumentation is demonstrably live, not merely silent) and **exactly one for
  the mirror**. Unchanged values alone would not have established this.

## Two accuracy points carried forward

* **The global wrapper covers direct writers ONLY when the matching trigger
  protocol is installed.** Measured in 14ad (D3c): the per-identity wrapper does
  not compose with the global-key trigger — they contend on different locks, and
  a direct writer committed inside the window. Wrapper alone: cooperative
  writers only.
* **A lost RPC response leaves commit status UNKNOWN.** Only an explicit
  `BATCH14` conflict class means the write did not land. A transport failure
  after the primitive committed must be treated as indeterminate — it must not
  be reported as a rollback.

## Route switch and webhook regression harness — completed

* `src/app/api/stripe-webhook/route.ts` now sends subscription create/update and
  deletion through `applyAtomicLifecycleUpdate`, and invoice dunning through
  `applyAtomicLifecycleUpdateOne`. The pre-Stripe snapshots and bounded retry
  remain in the route.
* `scripts/lib/ut-membership-webhook-harness.cjs` now starts a disposable private
  PostgreSQL 16 cluster on a Unix socket, applies the schema and the four prepared
  private-cluster SQL files, and reuses the exported `makePgClient()` adapter from
  `batch14af-atomic-integration.js`. It synchronizes the in-memory fixtures before
  every RPC (including post-snapshot mutations), translates test-only primary-key
  labels to UUIDs required by the real schema, records `{op: "rpc", name, payload}`
  calls, and reads committed rows back into `state.tables`.
* `attempts()` counts entered `.update()` statements and RPC calls. `applied()`
  counts rows from `.update().matched` and each RPC outcome's `affected`; those
  measures are intentionally separate.
* The reviewed migration remains untouched; the harness applies a copied private
  file and the final blob is checked before commit.

The adapted snapshot-timing suite preserves all entitlement, warning, timing and
retry assertions: **27 passed / 0 failed**. The related concurrency and lifecycle
authorization suites also pass (**41 / 0** and **21 / 0**). The separate unlinked-row
suite remains its documented pinned defect (**8 passed / 2 failed**); those failures
are the pre-existing proposal in its own review, not this route switch.

### `batch14p-webhook-coverage.js` — moved onto the shared harness

The suite previously carried its **own in-process fake client**, so it could not
reach the atomic path at all. It now uses the shared PostgreSQL-backed harness, and
S1–S6 run against the reviewed primitive in the same disposable cluster.

**Failures were classified before any assertion was changed.** Pre-adaptation
baseline against the switched route: **15 passed / 19 failed**.

* **17 of the 19 are one defect in the fixture, not the product.** The old inline
  fake has no `rpc()` surface, so the atomic module refused the write, the route
  answered 500 and nothing was written — S1 (×10), S2 (×2), S3 (×2) and S4's retry
  assertions (×3). Moving the suite onto the shared harness resolves them; no
  assertion was touched for them.
* **2 of the 19 assert the PARTIAL application the atomic contract removes**
  (S4 "the ut_members write genuinely SUCCEEDED first", S4 "the member is already
  revoked by the write that succeeded"). These are re-pointed, and only these.
* **S5/S6 additionally had a count that would become vacuous.** They asserted
  "zero membership writes" by filtering records on `w.table`; an atomic RPC record
  carries no `table`, so the identical assertion would have been trivially true.
  The claim is re-counted as write ATTEMPTS, which covers the RPC as well.

The two ATOMIC changes, stated explicitly:

* **S4 — partial application is now a rollback.** It previously asserted that the
  `ut_members` write had already landed when the `profiles` mirror failed. It now
  asserts the atomic contract: a failed required write leaves **BOTH tables
  unchanged**, and a healthy retry completes the operation. The failure is raised
  by the **ISOLATED DATABASE**, not by a mocked hook — a concurrent writer keeps
  moving `profiles.subscription_status` between the authorization snapshot and the
  write, so the primitive raises a real `BATCH14 CONFLICT` on the SECOND target and
  the transaction aborts, including the `ut_members` statement that would otherwise
  have matched. The shared harness's `failUpdate` hook is deliberately **not** used
  for this: it affects `.update()`, not `.rpc()`. `profiles.subscription_status` is
  a guard column of the primitive but is ignored for entitlement by
  `membership-plan.ts` (revocation authority is `ut_members.subscription_status`
  only), so the injection cannot disturb the entitlement the scenario asserts.
* **S5/S6 — "zero membership writes" is counted as attempts** (entered update
  statements plus RPC calls), the atomic path's unit of work.

Everything else in S1–S6 is unchanged, and assertions were **added** for the RPC
path: one atomic RPC per accepted delivery, rows updated = 2 for the two-table
revoke and 1 for the profiles-only revoke, zero rows applied by the two failed
attempts, and exactly one attempt for the healthy retry.
**49 passed / 0 failed.**

## `invoice.payment_succeeded` — write consistency (Batch 14 continuation)

The invoice path was the last lifecycle write still outside the guarantees: it
addressed rows through the payload address (`customer_email`) and wrote each table
with its own `.update()` — two transactions that could commit independently.

Repair, in `src/app/api/stripe-webhook/route.ts`:

* **Rows are resolved through the VERIFIED Stripe linkage.** The snapshot locates
  rows by the event's own subscription id, the ids the trusted tables recorded, and
  the verified customer. The payload address is one hint among several for the
  linkage READ; it never selects a row and never repairs a linkage.
* **The write snapshot is taken BEFORE reconciliation** — both tables, in (1b),
  exactly as the subscription paths do.
* **The write is the atomic synchronized path**: both targets in ONE
  `applyAtomicLifecycleUpdate` call on the exclusive global lifecycle key.
* **A conflict re-resolves**: the existing `MAX_LIFECYCLE_ATTEMPTS` bounded retry
  now covers this path too.
* **Subscription-status ownership is preserved.** `subscription_status` is not
  written, so an invoice can never clear a recorded revocation — that is what stops
  a delayed `payment_succeeded` from resurrecting canceled access. Measured rather
  than asserted: the invoice's plan write LANDS while the status and the effective
  entitlement stay revoked.
* **The existing price mapping is preserved**: the member write still records
  `plan: "initiate"`.
* **The mirror is genuinely atomic now, so a failed mirror is a failure.** With both
  tables in one transaction, a failed mirror means the member row was rolled back
  with it, so the delivery answers 500 instead of 200. This replaces the previous
  "optional mirror" warning, which was sound only while the two writes were
  independent.
* **Missing-row creation and unlinked-row authority stay separate.** There is no
  insert branch: a linkage that owns no `profiles` row is reported `absent`, nothing
  is created, and no `user_id` is fabricated.
* The now-unused `writeMembershipRow` import was removed from the route; that helper
  is unchanged and still used by its other callers.

### Focused suite — `scripts/batch14af-invoice-write-consistency.js`

Runs the real handler through the accepted PostgreSQL-backed harness.
**49 passed / 0 failed.**

* **I1** a paid, governed invoice writes BOTH tables in ONE atomic RPC (rows
  updated = 2, zero inserts).
* **I2** a delayed invoice cannot clear a recorded revocation — `canceled` and
  `incomplete_expired`, with Stripe still reporting the subscription ACTIVE so that
  only status ownership can hold the line.
* **I3** a delayed invoice for a superseded subscription cannot replace the
  governing one.
* **I4** an invoice whose current subscription is not paid is ignored, with ZERO
  write attempts.
* **I5** a concurrent change survives one lost race, and the write completes on the
  fresh snapshot.
* **I6** a required write that keeps losing its race rolls BOTH tables back (zero
  rows applied), and a healthy retry then completes the operation.
* **I7** a linkage that owns no `profiles` row is reported, never created (zero
  inserts).

The I5/I6 conflicts are raised by PostgreSQL, not by a mocked hook: a concurrent
writer moves `profiles.subscription_status` between the snapshot and the write, so
the primitive raises its own `BATCH14 CONFLICT`. That column is a guard column of
the primitive but is ignored for entitlement by `membership-plan.ts`.

## Verified (re-run for this commit)

Application code changed, so the compile and the build were re-run rather than
reused:

* `npx tsc --noEmit` → exit 0.
* `npm run build` → exit 0. Existing warnings remain: outdated Browserslist data,
  the Node 18 deprecation notice from Supabase, and the expected dynamic-server usage
  diagnostic for `/api/billing/session` during static generation.
* `scripts/batch14af-invoice-write-consistency.js` → 49 / 0 (new).
* `scripts/batch14p-webhook-coverage.js` → 49 / 0, `batch14t-snapshot-timing.js` →
  27 / 0, `batch14r-concurrency-interleavings.js` → 41 / 0,
  `batch14r-lifecycle-authorization.js` → 21 / 0, `batch14b-membership-readback.js`
  → 41 / 0, `batch14f-event-order.js` → 11 / 0 — all unchanged.
* `scripts/batch14s-unlinked-row-authority.js` → 8 / 2: the same two pinned-defect
  assertions, untouched.
* Suites red before this repair and red with **identical failing-assertion lists**
  after it: `batch14g` 10 / 2, `batch14d` 12 / 14, `batch14e` 13 / 9, `batch14q`
  10 / 10, `batch14l` 7 / 6. Their failures come from their own inline fakes having no
  `rpc()` surface, which predates this commit.
* `scripts/batch14af-atomic-integration.sh` → 24 / 0 — **not re-run**: neither the
  adapter nor the primitive changed.
* The reviewed primitive: `251d8e4c3a395bc0b73e64d51127955638c039f4`, byte-identical.

## Deferred defects

1. **`batch14f` A1 is a VACUOUS GREEN after this repair.** It previously passed for
   the right reason — the handler recorded the AUTHORITATIVE subscription id rather
   than the invoice's older one. `batch14f` carries its own inline fake with no
   `rpc()` surface, so the invoice write is now refused outright
   (`client.rpc is not a function`, visible in its output) and the stored linkage is
   unchanged for THAT reason instead. The assertion still passes and can no longer
   distinguish the two cases. The guarantee is re-established with real PostgreSQL
   evidence in **I3** above; porting `batch14f` onto the shared harness is separate
   work.
2. `batch14s` unlinked-row authority remains its own pinned defect.
3. Missing-row creation for a linkage that owns no row is deliberately not
   implemented anywhere in the lifecycle paths.

## Release blockers — all still outstanding

1. Lifecycle concurrency and conditional writes.
2. Unique-index migration hardening and independent review
   (`ut_members_email_lower_key` prepared, not applied).
3. SELECT-only production verification.
4. Separately authorized SQL application before application release.

Also separate: the cluster-directory leak in the older `batch14u-rpc-harness.sh`,
and the legacy inline-fake suites that cannot reach the atomic path
(`batch14d/e/g/l/q`).

**No release readiness is claimed.** Production remains `ac49ce06`.
