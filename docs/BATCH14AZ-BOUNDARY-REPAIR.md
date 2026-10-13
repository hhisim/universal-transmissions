# Batch 14az — the function-boundary failure on production, and the repair

**What happened:** step 8 of the authorized installation — the function surface boundary — **failed on
production and rolled itself back**. Its own final assertion aborted with:

```
BATCH14AY boundary: surface not as intended: b14ab_linkage_key(service_role grant)
b14ac_install_trigger(service_role grant) b14ac_linkage_keys_for_payload(service_role grant)
b14ac_trg_stmt_exclusive(service_role grant) b14ac_trg_stmt_shared(service_role grant)
```

Everything before it committed (steps 1–7). Nothing was rolled back by hand, no application was
deployed, `main` was not pushed and no alias changed.

## 1. Read-only evidence — production default function ACLs

`pg_default_acl` on the project database has **two** rows for FUNCTIONS in `public` — owned by
`supabase_admin` and by `postgres` — and both read:

```
postgres:EXECUTE, anon:EXECUTE, authenticated:EXECUTE, service_role:EXECUTE
```

So every function the bundle creates is born with an **explicit** `service_role` grant, in addition
to PostgreSQL's built-in `PUBLIC` EXECUTE. The per-function capture (`production-function-acls.json`)
shows the resulting state for the 17 bundle functions: 13 carry the full default ACL
`{=X/postgres, postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, service_role=X/postgres}`,
and the four the migrations touch carry `{postgres=X/postgres, service_role=X/postgres}`.

## 2. Root cause

The boundary revoked `public, anon, authenticated` on all 17 bundle-owned functions and granted
`service_role` exactly the four-function release closure — but it never **withdrew** `service_role`
from the survivors outside that closure. On a database whose default privileges grant `service_role`
EXECUTE, that grant survives the revoke, the surface stays wider than the closure, and the assertion
that checks `has_function_privilege('service_role', …) = false` for the five non-closure survivors
aborts the whole boundary.

It passed every isolated run because a private cluster's default function ACL is
`{=X/owner, owner=X/owner}` — no `service_role` entry at all — so revoking PUBLIC alone left
`service_role` with nothing. **The defect is a portability gap between the private cluster and
Supabase, and no run against a fixture could have found it.** The preflight could not either: it
inspects objects, and this is a property of the default ACL, which the preflight did not read.

## 3. The repair

Section 3 of `20261017_function_surface_boundary.sql` — previously a single statement withdrawing the
per-identity entry point — is now an existence-guarded loop that withdraws `service_role` from
**every survivor outside the release closure**, the same six statements the failure named plus the
one that was already there:

| signature | why it is withdrawn |
|---|---|
| `apply_lifecycle_update_sync(jsonb)` | the non-composing per-identity entry point (unchanged) |
| `b14ab_linkage_key(text, text)` | internal helper |
| `b14ac_install_trigger(text)` | installer, not a runtime dependency |
| `b14ac_linkage_keys_for_payload(jsonb)` | internal helper |
| `b14ac_trg_stmt_exclusive()` | trigger function; trigger invocation does not consult the caller's EXECUTE privilege |
| `b14ac_trg_stmt_shared()` | same |

Preserved exactly as they were: the four `service_role` grants that form the closure
(`apply_lifecycle_update`, `apply_lifecycle_update_sync_global`, `b14ab_acquire_global_lock`,
`b14ab_linkage_key`→`b14ab_linkage_global_key`), the PUBLIC/anon/authenticated revokes, the
prototype drops, and the pinned `search_path`. **No production default privilege was changed** —
the boundary now works with the defaults it meets instead of assuming them away. The loop is
existence-guarded for the same reason as section 1: a boundary that cannot be re-applied is not a
boundary.

## 4. The focused regression

`scripts/batch14az-boundary-default-acl-regression.sh` runs the whole scenario under **both**
default-ACL regimes (ordinary, and production-shaped via
`alter default privileges in schema public grant execute on functions to anon, authenticated, service_role`):

1. **reproduces the incident** — the pre-repair boundary, attested against blob
   `878af9c7d8c44d969497ffbda6462b391bc5605c`, is applied and must **fail** under production-shaped
   defaults, with the abort naming exactly the five unrevoked grants, and leave the 13
   PUBLIC-executable functions in place (the exposure);
2. **the portability gap is the control** — the same pre-repair artifact must **succeed** under
   ordinary defaults, which is why no earlier run caught this;
3. **the repaired boundary applies, then re-applies** (idempotent, under both regimes);
4. **the restricted surface** — the ten retained functions with `service_role` EXECUTE on exactly
   the four-function closure and nothing else, no bundle-owned function reachable by `anon` or
   `authenticated`, no PUBLIC EXECUTE anywhere, the seven prototypes absent;
5. **the postflight verdict reads `t`** under production-shaped defaults — the gate the operator
   will use in production;
6. **the rollback-only smoke passes with BOTH post-conditions true**, and the row counts are
   unchanged.

The baseline is **attested**: the harness refuses to test a pre-repair file whose blob is not the
recorded one, and takes it from `$B14AZ_PRE_REPAIR_BOUNDARY` or the repo's own history — the same
operator-procedure rule the preflight follows, because the harness cannot reach another clone's
history.

## 4a. Results

`PGBIN=/usr/lib/postgresql/<16|17>/bin bash scripts/batch14az-boundary-default-acl-regression.sh`
with `B14AZ_PRE_REPAIR_BOUNDARY` pointing at the attested baseline:

| check | PostgreSQL 16 | PostgreSQL 17 |
|---|---|---|
| focused regression, both regimes | **72 / 0** | **72 / 0** |
| `batch14ax-install-bundle-validate.sh` (frozen, re-run) | 58 / 0 | 57 / 0 |
| `batch14ax-gate-negatives.sh` (frozen, re-run) | 66 / 0 | 66 / 0 |

Per regime the regression confirms: the pre-repair boundary **fails** under production-shaped
defaults naming exactly the five unrevoked grants and leaving 13 functions PUBLIC-executable; it
**passes** under ordinary defaults with the surface fully restricted (the portability gap, as a
control); the repaired boundary applies and re-applies; the ten retained functions carry
`service_role` EXECUTE on exactly the four-function closure; nothing is reachable by anon,
authenticated or PUBLIC; the seven prototypes are gone; the postflight verdict reads `t`; and the
smoke passes with both rollback post-conditions true and the row counts unchanged.

### Replacement artifact

| file | sha256 | git blob |
|---|---|---|
| `supabase/migrations/20261017_function_surface_boundary.sql` (step 8, **replaces** `ac39a47d…`/`878af9c7…`) | `cf8111657045cf2260992484c5b53b5d791395afa787f8e91967161d23fbb0ac` | `51ad730052c30cd420b545c07b751de4686566d8` |
| `scripts/batch14az-boundary-default-acl-regression.sh` (new) | `5a084d24271ced540a9fd55e9fe61f8260ba60f46d5d29e33ba75d952eb0c318` | `75904ff5fb6fbc1cedefe0322d2a13c107ad6060` |

## 5. State after this batch

* **Production: steps 1–7 applied; step 8 (the boundary) not applied.** 17 bundle functions exist,
  13 of them PUBLIC/anon/authenticated-executable, and the seven Batch 14ab prototypes are present.
  The exclusive statement trigger is installed and enabled on both tables. The deployed application
  does not call any bundle function, so this is reachability rather than an active path — but it is
  exactly what step 8 closes, and it stays open until the repaired artifact is applied.
* **No production default privilege was modified**, nothing was rolled back destructively, no
  application was deployed, `main` was not pushed, no alias changed.
* The repaired boundary is a **replacement** for step 8 of the documented sequence; steps 1–7 are
  already committed and must **not** be re-applied.
