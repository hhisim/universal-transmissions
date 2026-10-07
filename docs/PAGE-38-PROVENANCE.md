# Batch 2 — Page 38 evidence provenance

Recorded from the **live retrieval layer** on the provider host
(`/opt/tao_oracle/app/codex_retrieval.py`, class `CodexRetriever`), not asserted
from memory and not inferred from the model's prose.

## What was retrieved

Query: `"What is Codex page 38 about?"` → `CodexContext`, `page_hint = 38`,
`has_ontology = True`, 6 chunks returned.

The top chunk:

| field | value |
|---|---|
| `page_number` | `38` |
| `source` | `Page 038` |
| `tier` | `ontology` |
| `tier_label` | `ONTOLOGY (Author's Vision)` |
| `distance` | `3.79` |

Its text is a **UT Obsidian note** whose YAML front matter carries:

```
type: note
domain: spiritual
status: active
tags: [#, #domain/spiritual, #type/note]
page: 038
links: [[memory/01-Projects/ut-codex/pages/Page 038.jpg]]

# 📜 Page Ontology: TEŠ.ÚN.DU.AH
*(Unpacking Duality)*
```

## What this establishes

1. Page 38 is genuinely a UT Codex page: the note is filed at
   `memory/01-Projects/ut-codex/pages/` and links the page image
   `Page 038.jpg`. The identifier is real and resolved by the retrieval layer,
   not invented by the model.
2. The nearest neighbour is a genuine page-38 match at distance 3.79 — a very
   strong embedding hit for the literal page query.
3. Page extraction is real, not best-effort: `_extract_page_number` recognises
   `page N`, `p. N`, `# N`, `sayfa N` and `страниц N`, and
   `_extract_page_from_text` also recovers the number from the source filename
   or the document body. The page hint here came from that machinery.

## Ontology/interpretation vs. direct manuscript content — the distinction

This is the part that must not be overstated.

The retrieved chunk is **the author's own ontology note about** page 38 —
a written interpretation ("an instruction manual for initiating, stabilizing
and amplifying trinary spiral formations"), tagged `type: note`,
`tier_label: ONTOLOGY (Author's Vision)`.

It is **not**:

- a transcription or image of the manuscript page,
- a quotation from a historical source,
- a scholarly edition or critical text,
- any form of historical or scientific proof.

The page *image* is referenced by the note (`Page 038.jpg`) but the image
content itself is not what was retrieved, and no OCR of the plate was returned.

So the honest statement is: **the archive holds a page-indexed ontology note for
page 38, authored by the corpus owner, describing that page.** Any answer must
be framed as interpretation over the author's own vision, labelled as such.
The earlier Oracle reply ("Page thirty-eight feels in the bones like a held
breath…") is poetic framing in the same register, and is not a manuscript
description.

## Coverage — do NOT generalise from this example

A single successful lookup proves **nothing about completeness.**

- The addressable band is hard-coded: `_extract_page_number` only returns a
  number when `1 <= num <= 200`. Page 201+ is not merely unretrieved, it is
  outside the extractor's contract.
- Retrieval returned 6 chunks for a single query, and only **one** was the
  page-38 ontology note. The other chunks were `tier: summaries`,
  `SOURCE SUMMARY (Library)`, one of them page 383 with `source: Unknown` and a
  distance of 308.49 — effectively unrelated, included because a summary tier
  matched loosely.
- That loose tail is precisely the substitution hazard: a query for page 38
  can drag in "Page 383", because 383 contains 38. Routing therefore forbids
  substituting another page and requires the model to say plainly when the named
  page is not in the retrieved material.

The route's guidance for an in-band page (1–200) is: answer only from material
actually labelled for that page; if it is absent, state that the page's content
is unavailable, and never describe a different page or a different book. For an
out-of-band page the content is declared unavailable up front.

## Retained test results

| Test | Result |
|---|---|
| `"What is Codex page 38 about?"` → follow-up `"Which page did I ask about? Reply with the number only."` | returned **`38`** — memory holds the page reference even though no page metadata is returned to the client |
| `"What is Codex page 4500 about?"` (out of band) | declines honestly; **no** substitution to page 383 or any other folio |

Both were verified against the real preview endpoint and in a real browser.# Batch 2 — Who calls which Oracle endpoint, and why "no caller" was wrong

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