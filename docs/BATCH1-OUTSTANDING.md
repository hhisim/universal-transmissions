# Batch 1 — outstanding contracts and issues (for the next task)

Recorded so the next batch starts from measured state rather than re-auditing.

## Contracts as they stand after Batch 1

### `/api/oracle` request

```
POST /api/oracle
{ message: string, mode: string, lang: string, speed: string,
  artworkId?: string, artworkTitle?: string }
→ 200 { response: string, groundedArtworkId: string | null }
→ 400 { error }  no message
→ 502 { error }  backend non-2xx
→ 504 { error }  backend timeout (120 s)
→ 500 { error }  unexpected
```

- **Whole-JSON contract.** The client awaits `res.json()`. There is no SSE or
  `ReadableStream` anywhere in this path. Streaming is *not* claimed.
- **Backend:** `ORACLE_BACKEND_URL` (default `http://204.168.154.237:8001`)
  `/chat` with `pack: "codex"`. Since the 2026-10-06 change that backend's
  synthesis hop is OpenCode Go / `deepseek-v4.1-flash` (x-opencode-go), with
  Gemini → Qwen → MiniMax fallbacks server-side.
- `artworkId` is resolved server-side against `src/data/artworks.ts`. The
  client's `artworkTitle` is **ignored**. An unrecognised id is dropped and the
  response reports `groundedArtworkId: null`.

### `/api/oracle/tts`

```
POST /api/oracle/tts { text, lang, voice } → 200 audio/ogg | 502 | 500
```
Markdown/emoji stripped, text capped at 3 000 chars, 30 s upstream timeout.
Now fire-and-forget from the client: the answer never waits on it.

### Client behaviour

- One `AbortController` per submit (`reqAbortRef`). A new submit aborts the
  previous; unmount aborts the current. Aborted requests append nothing.
- `ttsPending` marks a bubble awaiting speech; audio is patched in by object
  identity, so a superseded bubble can never receive another's audio.
- Draft from `?q=` seeds the textarea exactly once and is never auto-submitted.

## Open issues — not addressed in Batch 1

### Conversation continuity (audit Y#2, P0)
`/api/oracle` still receives **no history**. The desktop request omits
conversation ID, previous turns and any entity envelope. The tested follow-up
("which page did I just ask for?") still cannot recover page 38, because page
numbers are never bound to the request. The `codex-oracle` standalone client
*does* send bounded history — the two clients remain inconsistent.

### Backend artwork grounding is metadata-only
This batch resolves trusted artwork *metadata* (title, year, medium,
description, tags) and prepends it to the question. It does **not** bind the
answer to verified Codex pages, correspondence records or research citations.
The chip label "SPEAKING ABOUT" reflects UI state, not a grounding claim, and
`groundedArtworkId` is the only grounding signal returned. Preserving a draft
alone establishes nothing about grounded knowledge.

### Page-level retrieval unknown
The audit could not explain why page 38 failed. No backend span timing exists.
`/api/oracle` logs no retrieval/model spans, so latency attribution is still
unmeasured. **No model recommendation is possible from current evidence.**

### True streaming not implemented
Deliberately deferred (audit D). The full-response contract remains, so the
2–5 s warm first-useful-response target is still gated on whole-response
completion. Implementing it needs a backend change (SSE from `/chat`) plus a
client reader — out of this batch.

### TTS still adds a serial dependency to *audio*
Text no longer waits on speech, but `AudioPlayer` only mounts once audio
arrives. There is no cancel-audio control on a pending bubble, and no explicit
"stop speech" beyond the player.

### Reduced-motion coverage is partial
Batch 1 disables the boot overlay, scan line, xeno/lemurian shimmer, chromatic
wave and the decode echo. `CosmicBackground`, `GlitchTitle`'s remaining
transitions, and the animated scrollbar gradient on other routes are untouched.

### Accessibility not audited to WCAG 2.2 AA
Fixed: heading accessible name, textarea/transmit labels, live status, native
button semantics on the echo toggle. Still open: unnamed icon buttons, focus
containment in dialogs, source-note keyboard access, contrast measurement,
target sizes, and the absence of a global reduced-motion mechanism outside
this route.

### Entitlements unverified
`guest 10 / free 25 / initiate unlimited` remains an **in-memory client
counter**. Not server-enforced. Not tested. Guest quota is client-resettable.
The draft-seeding change deliberately avoids auto-submit so an artwork entry
does not silently consume a guest question.

### Analytics: `meta` is still free-form
Query strings and referrers are now stripped and entity ids are allowlisted,
but `meta` passes arbitrary caller-supplied keys through. No call site in this
batch logs prompts. A repo-wide audit of `trackUtEvent` call sites is
outstanding.

### The 577 vs 824 correspondence count, and `/store/correspondence-codex-companion` 404
Untouched. Not part of this batch.

## Known-good verification commands

```bash
cd /var/tmp/ut-batch1-oracle
./node_modules/.bin/tsc --noEmit -p tsconfig.json
npm run build
node scripts/batch1-regression.js .
node scripts/batch1-behaviour.js .
```

Note: `next start` will serve a **stale build** if `.next` was rebuilt while the
server was running (chunk hashes 400). Kill the listener by port
(`ss -ltnp | grep :PORT`) before restarting.