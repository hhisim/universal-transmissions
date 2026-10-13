# Batch 15 — research as an explorable knowledge topology (Cymatics pilot)

## 0. What already shipped, and was therefore not rebuilt

Inspected before writing anything. The Cymatics research page is the second pass on this
surface, not the first:

| Already present | Where |
|---|---|
| The research route tree | `src/app/research/{page,cymatics,geometry,linguistics,symbolism}/page.tsx` |
| The authoritative topic registry — exact-key resolution, no fuzzy matching | `src/lib/research-topics.ts` (`research-v1:` prefix, `resolveResearchTopic`) |
| Server-side grounding for the model | `researchPromptBlock()` — OBSERVED / HISTORICAL / UT ARTISTIC INTERPRETATION, plus "do not offer medical or healing claims" |
| Curated connections with a stated basis and rationale, plus a legend | `src/lib/research-connections.ts`, `src/components/research/CymaticsConnections.tsx` |
| The honest-absence block | `CYMATICS_GAPS` |
| The contextual Oracle entry (stable id, visitor-owned draft, chip, return link) | `src/components/research/ResearchOraclePortal.tsx` |
| The four hops that make the entry work | `/oracle?researchTopicId=…&from=…&q=…` → `FORWARDED_PARAMS` in `src/app/oracle/page.tsx` → `page-client.tsx` → `POST /api/oracle` |
| The corrected claims and the banked source mapping | `docs/` + the registry summary |

So this batch did **not** touch the claims set, the sources, the OR the epistemic markers: they are
preserved as they were. What was missing is the brief's element 4 — the Oracle was attached to the
**topic** only, never to a **selected connection**.

## 1. What this batch adds

### 1a. One Oracle anchor per connection — same contract, no second Oracle

Each connection can now be taken into the Oracle as its own context. The identifier is a stable
registry key, `research-v1:<topic>/connection/<anchorSlug>`, resolved by the **existing** resolver
against the **existing** registry — so there is one identifier shape, one resolver, one API path
and no second conversation contract. Connection anchors are **derived** from the connection records
themselves, so a connection cannot exist with an Oracle entry whose title, route or rationale
disagrees with the card the visitor clicked.

Precedence is unchanged and was not widened: a research anchor (topic or connection) still drops any
artwork or correspondence anchor rather than merging with it.

### 1b. The symbolic-correspondences leg

The page's symbolic tone values (432, 528, 639, 741, 852, 963 Hz) are catalogued in the archive's
own Codex `FREQUENCY` lattice. That is now a connection with a documented basis, so the assignments
can be inspected where they live rather than taken on trust. Its rationale repeats the page's own
correction in the same breath: the lattice is UT symbolic material, and the popular therapeutic
reading of 528 Hz is not supported by the experimental literature.

The absence note was corrected rather than left to contradict the new link: it now says the Codex
link is the **FREQUENCY system as a whole**, not a reading of one entry, and that this is an
editorial choice rather than a claim that the corpus is silent.

### 1c. A claim removed from the hero (the only content change)

The hero epigraph carried a footer attributing it to **Pythagoras**. The sentence was searched in
the surviving-source territory (Diogenes Laërtius, the *Golden Verses* corpus and the standard
Pythagorean fragments) and **no passage containing it was located**; the wording circulates
attributed without a locatable source.

| Page claim (before) | Disposition | Claim after | Search run | Supports / does not establish | Label |
|---|---|---|---|---|---|
| epigraph footer `— Pythagoras` | **Removed** (attribution unverified) | `— an epigraph carried in this archive` | `"The price the Gods exact for this gift of song"` — no located source; nearest results are Diogenes Laërtius and the *Golden Verses*, neither containing the line | The words are kept and still read as an epigraph; **no attribution is asserted**, and it is **not** rewritten as the opposite ("Pythagoras never said this"), which a failed search cannot support | — |

Per the standing rule, the words were kept and only the unsupported attribution removed. The suite
asserts the **absence of the attribution** and the **presence of the epigraph**, so a later edit
cannot quietly restore one or delete the other.

## 2. The journey as built

1. **Enter** — the page opens on its research question, with the visual anchor and the corrected
   claims untouched.
2. **Explore** — each connection states why it belongs and carries one of three bases
   (documented / UT interpretation / thematic), with the legend readable before the list.
3. **Navigate** — every destination is a real, verified route; the card shows the kind, the basis
   and the destination's own title, and the Oracle entry shows the question it will open with, so
   the destination is understandable **before** it is opened.
4. **Ask** — the topic portal is unchanged; each connection adds its own entry that carries the
   connection's stable anchor, and the chip the visitor lands on is resolved server-side.
5. **Epistemics, mobile, keyboard** — markers stay at the claims they qualify; each card exposes two
   separate, separately-focusable links (destination and Oracle), never a nested link, and the
   legend controls are real buttons with `aria-expanded`.

## 3. Verification

* **Structural suite** — `scripts/batch15-research-topology.js`: **150 / 0**. It proves the anchors
  resolve by exact key, that **forged and unknown identifiers produce no record** (19 forgery cases,
  including traversal-shaped and near-miss keys), that every connection's **title is the record's
  own title in the loaded dataset** (artwork registry and journal index, not the filesystem), that
  the summary and prompt block carry the epistemic markers, that no graph engine or canvas was
  added, and that no untouched corpus (public media, artwork registry, journal corpus, codex corpus,
  billing/membership/migrations) moved.
* **Browser journey** — recorded below, driven against the preview.
* **Preview** — the immutable preview deployment is recorded below.

## 4. Limits

* The suite is structural. It cannot see a parameter dropped by a redirect or a chip rendered below
  the fold; that is what the browser journey is for.
* The 528 Hz correction is repeated in the new connection's rationale **as prose**. The registry
  summary remains the single normative statement of it.
