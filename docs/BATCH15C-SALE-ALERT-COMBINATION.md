# Batch 15c — the sale-alert repair combined with the accepted Batch 15 release

One combined candidate. Starts from the accepted Batch 15 commit `0ac3c14`; adds only
the one-time checkout/notification changes. Batch 14's subscription authority is
untouched, and all accepted Batch 15 work is preserved.

Nothing was deployed by this pass. Production still serves `dpl_6U9Pk…`, and no SQL
was applied.

---

## 1. What the intervening upload actually was

`dpl_6U9PknVgCtVXRncKSkH9JJ13QdYa` (the CLI upload that took production on
2026-10-13T16:45:52Z) carries `src/app/api/stripe-webhook/route.ts` at git blob
`729ff93b0d06abd33a1ceb26b7cf904d7c087c7f` — **byte-identical to Thoth's
`a7fe4e3`** (`origin/fix/stripe-webhook-alert-names-product`, parent `b4f8ce7`).

It was the authorized sale-notification repair, not a rollback. But `a7fe4e3` replaces
the whole file (181 insertions / 688 deletions against its parent) and in doing so
drops Batch 14's subscription authority. That is why it could not be cherry-picked and
why this pass ports the notification change instead of the commit.

## 2. What was ported

Only the one-time checkout/notification surface:

1. **Product names resolved through `checkout.sessions.listLineItems()`.** A webhook
   payload never carries `line_items`, which is why every sale reported a hardcoded
   `"Order"`.
2. **VOA-shop sales identified explicitly** — `session.metadata?.source === "voa-shop"`.
3. **UT order updates skipped for VOA-shop sales** — the VOA branch returns before any
   `ut_orders` statement is issued.
4. **A UT order update is claimed only when rows came back** — the statement carries
   `.select("id")`, and the note distinguishes `✅ Order updated in UT DB` /
   `⚠️ No matching UT order found — nothing written to UT DB`.
5. **Lookup and write failures reported honestly** — a failed line-item lookup reads
   `— (product lookup failed)` rather than silently showing nothing, and a failed write
   reads `❌ UT DB update failed` instead of the previous unconditional success note.
6. `payment_intent.payment_failed` gains the receipt email and uses the intent's own
   `created` timestamp instead of the wall clock.

**One deliberate divergence from Thoth's copy of this text.** `a7fe4e3` tells the
operator *"VOA shop sale — recorded in VOA DB, not UT"*. That asserts VOA persistence
from `metadata.source` alone, which this handler cannot observe. The ported text reads:

> `ℹ️ VOA shop sale (metadata.source=voa-shop) — no UT order written; VOA recording is not verified here.`

The classification and the absence of a UT write are stated; the VOA write is not
claimed. Suite assertion **V1** pins this (`!alert.includes("recorded in VOA DB")`).

### Deliberately not touched

`isDigital` and the order-fulfilment status expression are **byte-identical** to
`0ac3c14` (suite assertion **V8** pins the exact source text). Nothing else in the file
changes: signature verification, subscription reconciliation, pre-Stripe snapshots,
atomic lifecycle writes, authority stamps and bounded retries are all intact, and the
suite asserts each symbol is still present (**V7**).

| Batch 14 surface | occurrences in the candidate |
|---|---|
| `webhooks.constructEvent` | 1 |
| `resolveAuthoritativeSubscription` | 5 |
| `readStoredSnapshots`/`readStoredLinkage` | 6 |
| `snapshotLifecycleRows` | 8 |
| `applyAtomicLifecycleUpdate` | 6 |
| `reconciliationStamp` | 7 |
| `MAX_LIFECYCLE_ATTEMPTS` | 9 |
| `eventGovernsCurrentSubscription` | 2 |
| `entitlementFromAuthority` | 3 |

Same counts as `0ac3c14` — nothing dropped.

## 3. The diff

`src/app/api/stripe-webhook/route.ts`: **68 insertions, 15 deletions** against
`0ac3c14`. For contrast, cherry-picking `a7fe4e3` would have been 181 insertions /
688 deletions. The full diff is committed at
`docs/evidence/batch15c/webhook-sale-alert.diff`.

The shared boundary harness gains three additive capabilities so the offer can be
exercised through the real handler: `checkout.sessions.listLineItems` on the Stripe
double, `ut_orders` in the in-memory table model, and capture of the outgoing Telegram
alert. All are opt-in — `B15C_TELEGRAM_TOKEN` is only read if the suite sets it, so the
Batch 14 suites behave exactly as before (verified below).

## 4. Verification through the real handler, with mocked external boundaries

`scripts/batch15c-sale-alert-notification.js` drives the **real** `POST` handler. Only
Stripe and Supabase are stubbed. The outgoing alert is captured, so the assertions are
about what the alert *claims*, not about the shape of the code that builds it.

**46 assertions, 0 failed.** `docs/evidence/batch15c/sale-alert-suite.txt`

| case | scenario | asserted |
|---|---|---|
| V1 | VOA shop sale | correct product name in the alert; VOA variant; **zero `ut_orders` statements issued**; states "no UT order written"; does **not** claim a UT write; does **not** claim VOA persistence |
| V2 | UT sale, row matched | real product name; not reported as VOA; claims the write; exactly one statement, matched 1, addressed by session id; `status: "paid"` (fulfilment unchanged) |
| V3 | UT sale, **zero match** | product still resolved; `⚠️ No matching UT order found — nothing written to UT DB`; no success claim; statement issued and matched 0 |
| V4 | UT write **fails** | `❌ UT DB update failed`; no success claim |
| V5 | line-item lookup **fails** (VOA) | `— (product lookup failed)`; no invented product; delivery still 200; still zero UT writes |
| V6 | lookup fails, genuine UT write | failure stated **and** the real write still reported |
| V7 | source invariants | all seven Batch 14 surfaces present; `.eq(...).select("id")` on the `ut_orders` update |
| V8 | `isDigital` / fulfilment | expression byte-identical to `0ac3c14` |

No live signed replay, no charges and no customer-event testing were performed.

## 5. Regressions and typecheck

The membership/invoice suites were run on **both** the candidate and an untouched
checkout at `0ac3c14`, and classified by their failure reason, not by their pass count.

| suite | candidate | `0ac3c14` baseline | verdict |
|---|---|---|---|
| batch14-membership-write-contract | 51 / 0 | 51 / 0 | passes both |
| batch14af-invoice-write-consistency | 49 / 0 | 49 / 0 | passes both |
| batch14ag-read-authority | 30 / 0 | 30 / 0 | passes both |
| batch14ah-durable-authority | 24 / 0 | 24 / 0 | passes both |
| batch14ai-authority-writer-contract | 48 / 0 | 48 / 0 | passes both |
| batch14f-event-order | 11 / 0 | 11 / 0 | passes both |
| batch14p-webhook-coverage | 49 / 0 | 49 / 0 | passes both |
| batch14d-webhook-failure-reactivation | 12 / 14 | 12 / 14 | **fails identically on both** |
| batch14e-reconciliation | 13 / 9 | 13 / 9 | fails identically on both |
| batch14g-authority-contract | 10 / 2 | 10 / 2 | fails identically on both |
| batch14l-linkage-sequence | 7 / 6 | 7 / 6 | fails identically on both |
| batch14af-atomic-integration | exit 2 (`HARNESS ERROR: Cannot find module '…/membership-lifecycle-atomic.js'`) | exit 2, same error | **harness error on both** |

The four failing suites fail with an **identical failure set line-for-line** on both
revisions — they are pre-existing on the accepted baseline, not caused by this port.
Their failures are all 500s on cancellation/reactivation paths in a file this change
does not touch. They are reported as failing, not as passing.

TypeScript project check (compiler API, `noEmit`): **0 diagnostics in project sources.**

Raw outputs: `docs/evidence/batch15c/regressions-candidate.txt`,
`regressions-baseline-0ac3c14.txt`, `typecheck.txt`.

A Vercel build of this commit is the build verification with the real production
environment; it is reported with the preview in the handoff, not asserted from here.

### One accepted-suite assertion had to be re-scoped, not dropped

`scripts/batch15-research-topology.js` guards the pilot's blast radius and asserted
that **no** billing, membership or migration file changed. That premise is false for an
authorized change to the webhook, so the blanket ban was replaced with a scope check:
the only billing/membership-named files that may change are the two this batch was
authorized to touch — `src/app/api/stripe-webhook/route.ts` and the shared harness
`scripts/lib/ut-membership-webhook-harness.cjs` — and a separate assertion now forbids
any migration change outright. Anything else still fails.

This is a re-scope, not a weakened assertion: the suite goes from 175 to **176**
assertions and passes **176 / 0**.

## 6. Reproduction

```bash
node scripts/batch15c-sale-alert-notification.js            # 46 / 0
node scripts/batch14af-invoice-write-consistency.js          # 49 / 0
node scripts/batch14-membership-write-contract.js            # 51 / 0
```

Regression comparison runner: `run_suites.sh <checkout> <out-dir> <suites…>` (workspace
artefact; runs the same suites against any checkout so a failure can be attributed).
