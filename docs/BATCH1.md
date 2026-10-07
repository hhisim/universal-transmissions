# Batch 1 — Oracle readiness, readability, artwork handoff

Local change set. **Not deployed.** Built and verified against a local
`next start` on the isolated worktree.

## Scope

Implements audit items **B, C, D, E** of the 2026-10-07 live audit, plus the
two accessibility defects found while verifying (decorative glyph owning the
heading's accessible name; unlabelled controls).

Deliberately out of scope (documented in `docs/BATCH1-OUTSTANDING.md`):
conversation memory, retrieval redesign, tier/entitlement changes, full visual
redesign, Cymatics integration, true token streaming.

## Files changed

| File | Change |
|---|---|
| `src/app/oracle/page.tsx` | `/oracle` router now forwards an allowlisted query (`view`, `q`, `artworkId`, `from`) to the chosen destination instead of redirecting to a bare path. |
| `src/app/oracle/desktop/page.tsx` | Wraps the client in `<Suspense>` (required by `useSearchParams`) with a static, non-blank fallback. |
| `src/app/oracle/page-client.tsx` | Readiness gate removed; boot becomes a non-blocking overlay; text-before-speech with cancellation; readable-first answers; artwork context chip; accessible names/live region; clean heading accessible name. |
| `src/app/api/oracle/route.ts` | Resolves `artworkId` against `src/data/artworks.ts` and prepends **verified** metadata; ignores any client-supplied title; returns `groundedArtworkId`. |
| `src/app/gallery/[slug]/page.tsx` | Entry link carries `artworkId` + validated `from` return path. |
| `src/lib/analytics.ts` | Never records `location.search`; adds allowlisted `entity_id`/`entity_type`. |
| `src/app/api/analytics/event/route.ts` | Server-side `pathOnly()` strips query strings from `path`/`target_url`/`referrer`; `entityId()` rejects free text. |
| `scripts/batch1-regression.js` | 50 source-contract assertions. |
| `scripts/batch1-behaviour.js` | 19 behavioural assertions with mocked slow/failed/stale TTS. |
| `docs/BATCH1-OUTSTANDING.md` | Contracts and open issues for the next batch. |

## Behaviour after this change

- Input usable at first paint; boot lines continue as a dismissible overlay and never gate input.
- Answer text is appended the moment the API responds; speech is requested afterwards and patches the message in place. A slow or failing TTS cannot delay, hide or corrupt the answer.
- A superseded request is aborted; late audio for it is discarded and its object URL revoked.
- Answers render as full readable markdown. The glyph decode is an opt-in, `aria-pressed` "SHOW DECODED ECHO" toggle; reduced motion disables it.
- Vitruvian Spirit → Oracle preserves the question as an **editable draft** (never auto-submitted) and shows a context chip with a registry-verified title and a validated return link.
- Analytics stores pathname-only plus allowlisted entity ids.

## Checks run

```bash
./node_modules/.bin/tsc --noEmit -p tsconfig.json     # clean
npm run build                                          # clean, /oracle/desktop prerenders static (197 kB)
node scripts/batch1-regression.js .                    # PASS 50  FAIL 0
node scripts/batch1-behaviour.js .                     # PASS 19  FAIL 0
```

## Measured timings

Method: Chromium via CDP against `next start` on the worktree, mocked backend
(1 s synthesis, 15–20 s TTS) so numbers measure the UI contract, not model
latency. Upper bounds include automation overhead; not field percentiles.

| Metric | Before (audit) | After | Method |
|---|---|---|---|
| Input usable after load | ~6.6 s fixed gate | 0 ms additional (input present and enabled in first paint; no overlay) | DOM inspection at load |
| Acknowledgement after submit | ~840 ms (observation) | **21 ms** (repeat run: 29 ms) | `requestAnimationFrame` poll to first DOM/status change |
| Answer visible after API response | 0 (awaited TTS first) | **502 ms** (repeat: 527 ms), with speech still pending | poll to `.oracle-answer-readable` |
| Answer readable | ~33 chars/s decode (~30 s per 1 000 chars) | immediate, full text | DOM text comparison |

Not measured: real model latency, real TTS latency, field CWV, real devices.

## Screenshots

`docs/screenshots/batch1/` (captured on the local build):
`01-artwork-entry-context.png`, `02-answer-readable-speech-pending.png`,
`03-narrow-375-context.png`, `04-reduced-motion.png`.

## Deployment considerations

- `/oracle/desktop` is now statically prerendered again and **requires** the
  `<Suspense>` wrapper; removing it breaks the build.
- `page-client.tsx` has mixed CRLF/LF line endings. Use byte-preserving edits;
  the `patch` tool normalises newlines and will produce a noisy diff.
- `/api/oracle` imports `@/data/artworks`; that adds ~artworks data to the
  route bundle.
- No schema or env changes. No new dependencies.