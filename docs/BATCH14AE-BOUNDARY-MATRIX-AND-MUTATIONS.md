# Batch 14ae — complete boundary evidence for both wrappers

Baseline: `10568033036b7d814374e8116923ea447021f978` (`1056803`)
Branch: `omni/batch14-membership-write-contract`

**Preparation only. No production SQL, integration or policy selection.** The
source repairs from Batch 14ad are accepted; this batch adds the missing boundary
evidence, adds mutations that must be detected, and corrects one claim.

**Lock-coverage evidence is reused unchanged** — the replacement-key derivation is
not touched, and Batch 14ad's coverage harness and key mutations are not re-run
here because nothing they cover changed.

---

## 1. The assertion that "the call failed" is not enough

The wrappers are **SECURITY INVOKER**. An INVOKER wrapper exposed to PUBLIC still
executes as its caller, so the call then reaches the **base RPC — which has its own
EXECUTE restriction to `service_role`** — and is denied there. The anonymous call
therefore ends in `42501` **either way**.

That means a boundary test that only asserted *"the call is refused"* would pass
with the wrapper wide open. Two independent boundaries, and they must be told
apart:

| Boundary | What it protects |
|---|---|
| **the wrapper's own ACL** | who may **call the wrapper** |
| **the base RPC's ACL** | who may **write entitlement state** |

Dropping the wrapper revokes does **not**, on its own, permit a write.

## 2. The completed role matrix — 50 assertions, 0 failed

`scripts/batch14ae-boundary-suite.sh` runs on its own private cluster, against the
**tracked** wrapper by default and against any wrapper file passed as an argument.
For **both** wrappers × **anon, authenticated, service_role**, **initially and
after reapplication**, it asserts:

1. **the wrapper's own EXECUTE privilege** (`has_function_privilege`);
2. **the actual call outcome** — an actual call as that role, not a catalogue read;
3. **the DENIAL POINT** — *which* function the permission error names. The suite
   classifies where the denial landed (`wrapper`, `base`, or `other`) and asserts
   the expected one by name, so a downstream denial cannot be mistaken for a
   restricted wrapper;
4. **unchanged membership state** on every rejected call — `plan` is asserted
   before and after.

Plus, after **reapplication**: still SECURITY INVOKER, still owned by `postgres`,
and the full matrix re-run.

**Authorized rollback is now verified through BOTH wrappers** — for
`apply_lifecycle_update_sync` and `apply_lifecycle_update_sync_global` alike, a
failing two-target call under `service_role` reports the RPC's own
`BATCH14 NEWLY_LINKED` and leaves the first target unwritten.

Result: **50 passed / 0 failed**. (The count fell from 58 in an earlier iteration
of this suite because two separate denial-point assertions per denied cell were
replaced by one assertion that *classifies* where the denial landed — 8 denied
cells, so 8 fewer assertions. The classified form is strictly stronger: it can
distinguish `wrapper` from `base` instead of merely asserting an absence.)

## 3. PUBLIC-restoration mutations — both detected

`scripts/batch14ae-public-mutations.sh` builds a **disposable copy** of the wrapper
with PUBLIC execution restored and runs the boundary suite **against that copy**:

| Mutation | Effect | Detected by |
|---|---|---|
| **MU-PUB-SYNC** | `grant execute on apply_lifecycle_update_sync to public` | the wrapper ACL assertion, and the denial point |
| **MU-PUB-GLOBAL** | `grant execute on apply_lifecycle_update_sync_global to public` | the wrapper ACL assertion, and the denial point |

For each, detection is delegated to a **separate verifier**
(`scripts/batch14ae-verify-pub-mutation.sh`), which requires **all four** of:

1. the suite's **assertion-failure exit status** — `1`, not any non-zero status
   (`2` means the suite could not even set up, which is not a detection);
2. the assertion-failure marker line;
3. an actual **`FAIL` line for the wrapper's own ACL**, with the observed value
   `1` where `0` was expected — for `anon` or `authenticated`;
4. an actual **`FAIL` line for the denial point**, with the observed value `base`
   where `wrapper` was expected — for the same roles.

**Why a verifier rather than a grep in the runner.** The first version of this
check matched the assertion **text**, and that text appears in an `ok` line exactly
as it does in a `FAIL` line — so matching the assertion *name* proved only that the
assertion **ran**, not that it **failed**. It also treated any non-zero suite exit
as a detection, so a mutated wrapper that failed to *apply* would have been scored
as a caught mutation. Both are corrected by requiring the failure status and the
`FAIL` line with its observed value.

### Negative controls

| Control | Construction | Required outcome |
|---|---|---|
| **NC1** | a disposable mutation that revokes `service_role`'s EXECUTE instead — boundary assertions for anon/authenticated still **pass**, an **unrelated** assertion fails | the verifier **refuses**; the suite is confirmed to have failed for an unrelated reason, and the failing assertion is confirmed to be the `service_role` ACL |
| **NC2** | a log where the ACL and denial-point assertions appear as **`ok` lines** (the original false positive) | the verifier **refuses** — matching an assertion's text is not a detection |
| **NC3** | a log with an unrelated `FAIL` line only | the verifier **refuses** |
| **NC4** | a valid-looking log presented with exit status **2** | the verifier **refuses** — an infrastructure failure is not a detection |

NC1 is the substantive one: it is a genuine boundary break, of a *different kind*,
and the verifier must not mistake it for the mutation under test.

The tracked wrapper is **never written to**: its sha256 is identical before and
after the run.

## 4. Corrected claim

The wrapper SQL previously said:

> *"PostgreSQL grants EXECUTE to PUBLIC on new functions, so the revokes are
> load-bearing: without them every role could drive entitlement writes through the
> wrapper."*

**The second clause is wrong and is corrected in place.** Without the wrapper
revokes a role could **call the wrapper**, not necessarily **write entitlement
state** — because the base RPC's own EXECUTE restriction is a separate control and
still applies. The comment now says so explicitly, names the two boundaries, and
states that a `42501` raised downstream by the base RPC is **not** evidence that
the wrapper is still restricted.

The same overstatement in `docs/BATCH14AD-WRAPPER-COVERAGE-AND-BOUNDARY.md` is
corrected there too.

---

## 5. Still outstanding — unchanged and separate

1. **Independent review of the reviewed RPC primitive** — still the gating step.
2. **The synchronization policy choice** — still not made.
3. `invoice.payment_succeeded` — separate review.
4. Unlinked-row authority — held; `batch14s` stays committed red.
5. Unique-index migration hardening and independent review — prepared, not applied.
6. SELECT-only production verification — not performed.
7. Separately authorized SQL application, then an exact-SHA application release.

No production authorization is granted.
