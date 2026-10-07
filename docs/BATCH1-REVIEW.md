# Batch 1 Review — Release Package

Review of `11a18f4` against `85a979b`, plus fixes. **Not deployed.**
Worktree `/var/tmp/ut-batch1-oracle`, branch `omni/oracle-batch1-20261007`.

---

## 1. Production / base / branch ancestry

### Production (established, not assumed)

| Fact | Value | How verified |
|---|---|---|
| Project | `universal-transmissions` / `prj_E5hqrQHvT2gE0sirOyjN9dwscJyY` | `.vercel/project.json` |
| Live alias | `www.universal-transmissions.com` → `dpl_9pD9fNE9rDNUnTMZs7QJxRn9sgs5` | Vercel v4 `/aliases` |
| **Deployed commit** | **`85a979b5b2d86978ec2a33ecabb2c0de40ca1f23`** | Vercel v13 deployment `meta.githubCommitSha` |
| Deployed ref | `omni/seo-remediation-20260906` | same |
| Deployed source | `cli` (CLI-uploaded tree, not git-push) | same |
| Deploy time | 2026-09-30 05:50 UTC, state READY | `createdAt` |

Two independent confirmations that production == `85a979b`:
1. Vercel deployment metadata names the SHA and ref.
2. Live `/oracle` still 307s to a bare `/oracle/desktop` with **no** query
   forwarded — i.e. the pre-batch-1 router. Live `/oracle/desktop` HTML
   contains none of the new markers.

### The "fourteen" question — the nine commits ahead of origin/main

`git log origin/main..85a979b` = 10 commits, newest first:

```
85a979b  perf(ut): serve 640px h264 video + poster on home
bce88c9  feat: publish fasting of the heart transmission
79139df  feat: publish law-of-one-ethics-of-relation transmission
ab6a2a9  feat: hermetic crater in-body image trio
5916e6b  feat: publish hermetic crater transmission
3088e8c  feat: publish star and uncarved block journal essay
8c3d1d6  Avoid broken YouTube thumbnail requests
9771558  Fix UT SEO metadata and media fallbacks
c89efee  fix: tighten UT SEO metadata and discovery
```

**Nine** are non-HEAD (the 10th, `85a979b`, is the production tip itself). They
are journal/essay content, media optimisation and SEO metadata fixes. They are
**already live**, because production is built from `85a979b`.

### Ancestry

```
origin/main  605aabe  (behind production by 10 commits)
   └── 9 SEO/content/media commits
        └── 85a979b  == PRODUCTION  (deployment dpl_9pD9fNE…)
             └── 11a18f4  batch 1 (reviewed here)
                  └── <candidate>  this review
```

- `origin/main` is **not** production. Deploying from it would roll the site
  back nine commits.
- `11a18f4` is a direct descendant of `85a979b`, so the batch is a clean
  fast-forward from production — no merge or cherry-pick required.
- The main workspace `/home/prime/.openclaw/workspace/universal-transmissions`
  is a **symlink** to `/mnt/deploy-ssd/projects/universal-transmissions`; both
  paths share one `.git` object store. Its 26 dirty files are untouched
  (verified again at the end).

### Release candidate

**`HEAD` of `omni/oracle-batch1-20261007`** = production (`85a979b`) + batch 1 +
review fixes. Nothing unrelated is included, because the branch was created at
`85a979b` and contains only the batch commits.

**Rollback base: `85a979b`** — the exact revision currently in production.

---

## 2. Source diff

### Diffstat against 85a979b (source only, excluding docs/tests/screenshots)

| File | +/− |
|---|---|
| `src/app/oracle/page-client.tsx` | +357/−66 (batch1), further +~150/−~20 in review |
| `src/app/api/oracle/route.ts` | +40/−2 |
| `src/app/oracle/desktop/page.tsx` | +32/−1 |
| `src/lib/analytics.ts` | +30/−1 |
| `src/app/api/analytics/event/route.ts` | +25/−3 |
| `src/app/oracle/page.tsx` | +21/−5 |
| `src/components/analytics/InteractionTracker.tsx` | (review) |
| `src/app/gallery/[slug]/page.tsx` | +1/−1 |

Batch-1 total including docs and tests: **+1078/−79**. Broken down:
- production logic ≈ **506**
- tests (2 suites, 376 lines) ≈ **376**
- documentation ≈ **196**
- screenshots: 4 PNG binaries ≈ 1.3 MB
- **line-ending churn: 0.** Verified per file: `page-client.tsx` stayed
  mixed CRLF/LF (1186/748 → 1281/944); every other file stayed pure LF. No
  mass reformatting.

All 66 deleted lines in `page-client.tsx` were audited individually; every one
maps to an intended edit (boot gate, awaited-TTS line, decode gate, GlitchTitle
layers, raw-error interpolation). **No unrelated code was removed.**

### New helpers and why

| Helper | Purpose |
|---|---|
| `prefersReducedMotion()` | One read of the media query; disables display gates. |
| `plainText()` | Strips combining marks (U+0300–036F) so the heading's accessible name is real text — several strings are stored already-corrupted. |
| `boundedParam()` + `MAX_DRAFT_CHARS/ENTITY/RETURN` | Caps URL-supplied context. |
| `GlitchTitle` `sr-only` + `aria-hidden` layers | Plain text owns the accessible name; glyph layers decorative. |
| `cancelPendingSpeech()` / `speechAbortRef` | Abortable speech, independent of the answer request. |
| `resolveArtwork()` (API) | Resolves `artworkId` in `src/data/artworks.ts`; client title ignored. |
| `buildForwardQuery()` + `FORWARDED_PARAMS` | Allowlisted redirect forwarding. |
| `sanitizedPath()` / `sanitizedEntityId()` | Client-side pathname + token sanitising. |
| `pathOnly()` / `entityId()` / `allowlisted()` / `labelToken()` | Server-side enforcement. |

### Dependencies added

`@/data/artworks` (already in repo) in `api/oracle/route.ts`; `useSearchParams`
+ `Suspense` (react/next). **No new packages.**

---

## 3. Startup overlay — verified with real interaction

The previous round only asserted that an input property was enabled. This round
exercised actual focus, typing and submission.

- Measured window: overlay present for **~2 frames (~130 ms)**; `pointer-events:
  none` throughout; `aria-hidden="true"`; **0 focusable descendants**.
- Stylesheet rule confirmed:
  `.oracle-boot-overlay { position: fixed; inset: 0px; z-index: 60; pointer-events: none; animation: 900ms … }`
- **Worst case tested:** an overlay was force-injected covering the viewport
  (z-index 99999) and left in place. With it present:
  - `ta.focus()` → focus works
  - typed text survives
  - `keydown Enter` → submits, user echo appears
  - focus not trapped on the overlay
- Acknowledgement measured with the overlay active: **0–1 ms** to request send.
- Reduced motion: overlay element is never mounted at all.

---

## 4. Text and audio lifecycles

Existing suites re-run: `batch1-regression` **50/50**, `batch1-behaviour`
**19/19**. Added `review-speech-lifecycle` **24/24** for the gaps below.

### Gaps found in 11a18f4 and fixed in this review

| Gap | Evidence | Fix |
|---|---|---|
| `fetchTTS` not abortable | `fetch("/api/oracle/tts", …)` had no `signal` | per-request `AbortController` (`speechAbortRef`) |
| Voice-off didn't stop pending speech | toggles only called `speechSynthesis.cancel()` | both toggles call `cancelPendingSpeech()` |
| Object URL leaked on normal completion | only the aborted branch revoked | revoke on bubble replace, on unmount, and in `AudioPlayer` |
| `AudioPlayer` never released audio | no cleanup effect | pauses, clears `src`, revokes URL on unmount |
| Superseding a question left speech running | `reqAbort` only covered the answer | `send()` also calls `cancelPendingSpeech()` |

Confirmed still correct: text appended before TTS (`append@` < `tts@`); no
`await fetchTTS`; aborted requests append nothing; voice default on; `hd`/`standard`
selection preserved; `speechSynthesis.cancel` preserved.

---

## 5. Context and draft safety — verified in-browser

| Check | Result |
|---|---|
| Only allowlisted params survive redirect | `view,q,artworkId,from` kept; `utm_source`, `fbclid`, `email`, `evil` **dropped** |
| Metadata from server registry | chip title = registry title |
| Unknown `artworkId` | no chip, draft still seeded, input enabled — graceful |
| URL title cannot override | `artworkTitle=FAKE TITLE` → chip still shows registry title; "FAKE" absent from DOM |
| External `from` rejected | `//evil.example.com/x` and `https://evil.example.com/x` both fall back to `/gallery/vitruvian-spirit` |
| Relative `from` honoured | `/gallery/ok` preserved |
| Draft bounded | 6000-char `q` → **600 chars** |
| Server bound | `message` > 2000 → **413**; grounded payload capped 6000 |
| Draft never auto-submitted | confirmed in source and behaviour |
| Edited draft survives rerender | "EDITED BY VISITOR" survives a speed-toggle rerender |
| Cleared draft stays cleared | stays `""` after a settings change |

**Grounding honesty (unchanged):** verified artwork *metadata* is available.
Codex-page grounding and citations are **not** implemented.

---

## 6. Analytics gap — closed

Measured the real surface first: `InteractionTracker` is the only event source
and **zero `data-analytics-*` attributes exist in the codebase**, so every event
took the fallback path where `meta.label` was `button/anchor.textContent` and
`target_url` was `url.href` (which carries `?q=<prompt>` for the artwork CTA).

Changes:
- **Server allowlists** (enforced): `event_name` (10 values), `category`, `action`,
  `placement`, `entity_type`. Unknown `event_name` → **400**.
- `meta` no longer accepts arbitrary keys; only `label`, which must match
  `LABEL_TOKEN` (`^[A-Za-z0-9][A-Za-z0-9_.:-]{0,47}$`) — prose is dropped.
- `product_id`/`sku`/`post_slug`/`session_id` constrained to token shape, so
  emails are rejected.
- Client: `tokenLabel()` replaces the `textContent` fallback; `target_url` is
  `url.pathname`; `entity_id`/`entity_type` sent from data attributes;
  `referrer` reduced to a pathname; `session_id` no longer used as entity data.

New regression `review-analytics-payload` (**48/48**) transpiles the real route
with the project's TypeScript and calls `POST`. Stored row:

```json
{"event_name":"oracle_click","category":"internal_link","action":"click",
 "path":"/gallery/vitruvian-spirit","target_url":"/oracle/desktop",
 "entity_id":"ut-011","entity_type":"artwork","referrer":"https://www.universal-transmissions.com/gallery/vitruvian-spirit",
 "meta":{"label":"ASK_THE_ORACLE"}}
```

Prompt absent in plain, URL-encoded, plus-encoded, lowercase and fragment forms.
All 8 adversarial payloads (prose label, unknown meta keys, unknown event name,
prompt as category/entity_type/post_slug, email in session_id/entity_id) were
either rejected or nulled. Entity ids and canonical paths are retained.

---

## 7. Corrected timing interpretation

**The previous "502 ms" figure was wrong as a render cost.** This headless
Chromium renders at **~550 ms per `requestAnimationFrame`** (measured: 549, 533,
533, 566, 566, 550). Any probe that waits for a frame — as the old one did —
reports ≈ one frame interval regardless of how fast the work was.

Event-driven re-measurement (MutationObserver, no frame waits; mocked 1000 ms
backend; **timestamps only, no conversation content recorded**):

| Stage | Time |
|---|---|
| A click → request sent (acknowledgement) | **0 ms** |
| B mocked backend wait | 1088 ms *(deliberate mock)* |
| C `res.json()` resolved → DOM committed | **8 ms** |
| D click → DOM committed | 1097 ms (= A+B+C) |

Interpretation: **answer rendering costs ~8 ms after parse.** There is no
deliberate delay and no animation in the commit path — verified
`animationName: none`, decode echo is opt-in and absent, no combining marks in
the answer. The earlier 502 ms was **test polling granularity plus frame
cadence**, not render cost and not model latency.

Acknowledgement: **0–29 ms** across runs (frame-bound, as befits a paint
measurement). Real model and TTS latency are **not** measured.

---

## 8. Checks run

```
tsc --noEmit                 clean
next build                   clean; /oracle/desktop prerenders static (197 kB / 378 kB)
batch1-regression.js         PASS 50  FAIL 0
batch1-behaviour.js          PASS 19  FAIL 0
review-analytics-payload.js  PASS 48  FAIL 0
review-speech-lifecycle.js   PASS 24  FAIL 0
```

Total **141 assertions**, plus browser verification of items 3, 5 and 7.

---

## 9. Remaining limitations

- Conversation memory still absent (`/api/oracle` takes no history).
- Artwork grounding is metadata only; no page-level grounding or citations.
- No streaming implemented or claimed.
- Entitlements remain a client-side resettable counter.
- `CosmicBackground` ignores reduced motion; dialogs lack focus containment.
- `ALLOWED_*` sets are derived from current usage; adding a new event name
  requires editing the route allowlist (deliberate, but worth knowing).
- Timings are single-run, headless, mocked. Not field percentiles.

## 10. Deployment considerations

- `/oracle/desktop` requires the `Suspense` wrapper; removing it breaks the build.
- `page-client.tsx` has mixed CRLF/LF — use byte-preserving edits.
- Production is **CLI-deployed** from a tree at `85a979b`. To ship: build a tree
  from the candidate HEAD, copy the real `.vercel/project.json`, `chown` to
  `prime` (root-owned files are silently dropped by the remote build).
- Rollback base: **`85a979b`**.
