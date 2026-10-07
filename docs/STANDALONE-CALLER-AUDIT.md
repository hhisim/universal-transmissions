# Batch 2 — Who calls which Oracle endpoint, and why "no caller" was wrong

## The error being corrected

An earlier Batch 2 audit reported that `/api/codex-oracle` had **no caller**. That
conclusion was wrong, and it was wrong in a way that mattered: it implied the
standalone Correspondence app was dead code, so its working contract could be
changed freely. It is not dead. The mistake was searching only `src/`.

## The actual callers

| Caller | Kind | Endpoint | How it is loaded |
|---|---|---|---|
| `src/app/oracle/page-client.tsx` | React client component | `POST /api/oracle` | the desktop Oracle page |
| `src/app/oracle/mobile/page.tsx` | React client component | `POST /api/oracle`, `/api/oracle/tts` | the mobile Oracle page |
| **`public/experience/correspondence-codex/codex.html`** | **static HTML+JS asset** | **`POST /api/codex-oracle`** | **`<iframe>` from `src/app/experience/correspondence-codex/CodexLoader.tsx`** |
| `public/integration/UTIntegration.min.js` | static bundle | references `/api/oracle` | embedded integration surface |

**Why the audit missed it.** `codex.html` lives under `public/`, not `src/`. A
`grep -rn` scoped to `src/` cannot see it. It is a self-contained static
application — its own `MODES` table, its own transcript loop — which is exactly
the shape of an independent app and therefore also invisible to a
component-level reading of the Next.js tree.

The route is reachable through a normal user path:
`/experience/correspondence-codex` → `CodexLoader.tsx` → `<iframe>` → `codex.html`.

## The exact contract that client depends on

From `codex.html`:

```js
let working = history.slice(-8).map(m => ({ role: m.role, content: m.content }));
const resp = await fetch('/api/codex-oracle', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: working[working.length-1]?.content || '',
    pack: 'codex', mode: curMode, lang: 'en',
    speed: needsLongerReply ? 0.7 : 1,
    systemPrompt,           // mode prompt from its own MODES table
    history: working,
  }),
});
const part = typeof data?.response === 'string'
  ? data?.response.trim()
  : (data?.content || []).map(c => c?.text || '').join('\n').trim();
```

Three requirements follow, and all three are now honoured:

1. **History is Anthropic-shaped: `{ role, content }`, not `{ role, text }`.**
   The shared validator originally only read `text`, so *every* message this
   client sent would have been silently dropped — a real regression of its
   working behaviour. `validateHistory` now accepts `content` as an alias and
   normalises it to `text`. Asserted in
   `scripts/batch2-followup.js` ("S3 — standalone client shape compatibility").

2. **Response shape**: reads `data.response` (string) or
   `data.content[].text`. The route returns the Anthropic-compatible
   `content: [{ text }]` shape, preserved.

3. **`systemPrompt`**: the client sends a long mode prompt from its own table
   ("You are the Codex Oracle … Respond with oracular depth …").

## Why `systemPrompt` is no longer forwarded

The baseline route passed `systemPrompt` straight through to the provider
verbatim:

```js
const { pack, mode, lang, speed, message, systemPrompt, history } = body;
body: JSON.stringify({ pack, mode, lang, speed, message, systemPrompt, history })
```

That is a privilege channel: any client reaching the endpoint could set the
system instruction for a shared, metered backend. It is not destructured and
not forwarded in any form now. Assertions confirm the outbound body contains no
`systemPrompt` and no `system:` role.

**Server-owned instructions remain authoritative** — the provider applies its own
system configuration; the route adds none of the client's. Legitimate behaviour
survives because the mode is still forwarded as `mode` (`'oracle'`,
`'decipher'`, `'web'`, `'etymology'`, `'scholar'`), which is the parameter the
backend actually understands, and the multi-pass continuation loop still works
(it re-sends its own history each pass, and that history now validates).

## What was NOT changed

- No new corpus, no vector database.
- The standalone app's own files were not edited — it keeps its `systemPrompt`
  field and its `MODES` table; the server simply no longer honours it as a
  privileged instruction. That is the narrowest change that closes the hole.
- `/api/oracle` behaviour for the desktop and mobile clients is unchanged apart
  from the new bounded-memory composition.