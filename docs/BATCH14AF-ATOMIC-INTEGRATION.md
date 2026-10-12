# Batch 14af — the integrated TypeScript lifecycle path, against the real primitive

Baseline `57c99de`. Preparation only: no production SQL, no release.

## What this batch connects

The three lifecycle webhook paths covered by Batch 14t — create/update,
deletion, dunning — now have a single atomic write path in
`src/lib/membership-lifecycle-atomic.ts`. Both tables' conditional writes are
applied by the reviewed primitive in ONE transaction, so a conflict aborts both
rather than leaving access PAID with the mirror unwritten.

**Scope of this commit: the module, the SQL candidate, the integration harness
and this review.** The three call sites in `stripe-webhook/route.ts` are NOT yet
switched — see *Not done*, below.

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

## Not done — and why it is not folded in

* **The three call sites in `route.ts` are not switched.** The route still uses
  the TypeScript conditional-write path.
* **The webhook regression tests are not yet adapted.** The adaptation is
  authorized, but switching the route without it turns the frozen Batch 14t
  regression red (9 assertions), because that harness mocks the per-table
  `.update()` path and has no `.rpc()` surface. Adapting it means giving the fake
  client the same PostgreSQL-backed `rpc` — reusing this adapter — counting RPC
  calls in `attempts()`, and re-pointing T1/T2/T3 while preserving their
  entitlement, snapshot-timing and race assertions.

Both are the same piece of work and belong in one commit with the route switch.

## Unchanged / verified

* `npx tsc --noEmit` → exit 0.
* `scripts/batch14t-snapshot-timing.js` → passed, 0 failures (the additions are
  additive and the route is untouched).
* The reviewed primitive: `251d8e4c3a395bc0b73e64d51127955638c039f4`, byte-identical.

## Release blockers — all still outstanding

1. Lifecycle concurrency and conditional writes.
2. Unique-index migration hardening and independent review
   (`ut_members_email_lower_key` prepared, not applied).
3. SELECT-only production verification.
4. Separately authorized SQL application before application release.

Also separate: `invoice.payment_succeeded`, unlinked-row authority, and the
cluster-directory leak in the older `batch14u-rpc-harness.sh`.

**No release readiness is claimed.** Production remains `ac49ce06`.
