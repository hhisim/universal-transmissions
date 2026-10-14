# Batch 17 — production release

**Released:** `adc599f34486ab32e4d1448074b73fd3c6c8825e` — the candidate exactly as
authorized. **Not** the branch tip and **not** the evidence amendment `aab96c2`, both of
which were excluded by instruction.

## Deployment identity

| | |
|---|---|
| **Deployment id** | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |
| **State** | **READY** |
| **Target** | `production` |
| **Source SHA** | `adc599f34486ab32e4d1448074b73fd3c6c8825e` |
| **Ref** | `omni/batch15-research-topology` (the SHA pins the commit; the tip is ignored) |
| **URL** | `https://universal-transmissions-4mtdpdhge-hhisim-7214s-projects.vercel.app` |
| **Build** | `✓ Compiled successfully`, **197/197** static pages, 2m |

Built fresh in the **production environment** via `POST /v13/deployments` with an explicit
`gitSource` (`repoId` 1189896677, `ref`, `sha`) and `forceNew`, so the release is a new
production build of that commit rather than the READY preview of the same SHA being
promoted. The build log's own first lines confirm it:
`Cloning github.com/hhisim/universal-transmissions (Branch: omni/batch15-research-topology, Commit: adc599f)`.

**All four canonical destinations** (per-alias endpoint, which is authority):

| host | deployment |
|---|---|
| `universal-transmissions.com` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |
| `www.universal-transmissions.com` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |
| `universal-transmissions.net` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |
| `www.universal-transmissions.net` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |

The two `.net` hosts answer `308` to their canonical `.com` equivalent (the site's
pre-existing canonical behaviour); followed, both land on `www.universal-transmissions.com`
with a `200` carrying the instrument room.

## Preflight (all items run at the authorized SHA)

| item | result |
|---|---|
| production still serves Batch 16 | **pass** — all canonical hosts on `dpl_4NmToJrCT55wwC4NPDJYqJ7Uudqb` = `40755e8` |
| candidate ancestry | **pass** — `git merge-base --is-ancestor 40755e8 adc599f` succeeds; a clean fast-forward |
| reviewed asset manifest | **pass** — 21 original `dist/` files, 22 hosted, **0 hash differences**, only addition `THIRD_PARTY_NOTICES.txt`, 934,420 bytes total |
| ignored-build-step gate | **pass** — `commandForIgnoringBuildStep` is `None`; nothing could silently cancel the build |
| repo wiring | `hhisim/universal-transmissions`, `repoId` 1189896677, link type `github` |
| Vercel token | probed; `auth.json` returned `200`, the commerce copy `403` (rotated) |

No mismatch was found at any preflight step, so the release proceeded.

## Verification

**Live, on the canonical production alias — `batch17-live-verification.py`, unchanged: 37/37.**
Cymatics links to the instrument; its six released anchors are still there in order; no
instrument asset or frame exists before launch; launch loads the engine bundle, solver
worker, stylesheet and fonts; WebGL runs; the interface is the engine, not a stub; leaving
unmounts it; the Oracle opens carrying the instrument's anchor and its own question; 390 CSS
px has no horizontal overflow; reduced motion reveals every wrapper.

**Live, release-level — `prod_release_verify.py`: 21/21.** Including the check this batch
exists for: **SNAPSHOT delivers a real PNG download on production** (a 1232×900 image), plus
shutdown removing the frame and returning to the reading page, reopening giving a clean
fresh instrument, the contextual Oracle entry, and the return link back to Cymatics.

**Source invariants** — `batch17-instrument-room.js`: **74/74**.

**Build-log comparison, release vs its predecessor** (the honest answer to "no new
release-related errors"): the release build carries **10** warning/error signatures and the
Batch 16 build carries **10** — **0 introduced, 0 removed**. The set is identical. The
signatures are pre-existing dependency and environment noise (`npm warn` cache-dir,
deprecated `tar`, `install-scripts` allowScripts, a `vercel` dependency warning) plus the
known `Dynamic server usage` message for `/api/billing/session`. Produced **197/197** static
pages against Batch 16's **196/196** — the one added route is the instrument room itself.

**Runtime logs — inconclusive, and recorded as such rather than claimed as a pass.** The
runtime log query returns `recordsReturned: 0` for the release deployment **and** for the
retained Batch 16 build over the same window, and retention rejects any window wider than
about 45 minutes. Because the long-serving predecessor returns zero too, the empty result
reflects log availability on this project (its pages are statically served from the edge),
**not** the release's health. It can neither confirm nor deny new runtime errors. The
build-log comparison above is what actually evidences "no new release-related errors".

## Retained rollback target

`dpl_4NmToJrCT55wwC4NPDJYqJ7Uudqb` — **still READY**, target `production`, SHA
`40755e8cce2be9c04edfbe7a74794c11d0813ec2`.

**Say what it restores:** this is the *previous production build*, i.e. the release that was
just replaced — not a separate standby. Promoting it restores **Batch 16**, which does not
contain the Universal Resonator room at all; the instrument, its Cymatics connection and the
`allow-downloads` fix would all go with it. It is a feature rollback, not a neutral fallback.

## Evidence

Measured on the preview of `a7e2f10` (see `BATCH17-ACCEPTANCE.md`); `src` and `public` trees
are byte-identical between `a7e2f10`, `adc599f` and the released tree.
This release adds `evidence/batch17/prod-live.json` (37/37 live) and
`evidence/batch17/prod-release.json` (21/21 live) — the two verifications that ran against
the deployed artifact rather than a preview.

## Stated limits, preserved

- **Software WebGL only.** This VPS has no GPU; rendering in every measurement was
  SwiftShader, and the ~1.8 fps measured at 390 CSS px is a property of that environment.
- **Fake microphone.** The granted-microphone path used Chromium's synthetic capture device
  — it demonstrates the instrument's handling of a granted or denied device, not that a real
  microphone works.
- **No listening test.** Whether any of it sounds right remains unverified and unclaimed.
- **No physical-phone performance evidence.** 390 CSS px emulation with a fake touch
  digitiser is not a phone; nothing is generalised to real devices.

No SQL, billing, membership changes, Stripe replays, backend restarts or automatic rollback
were performed.
