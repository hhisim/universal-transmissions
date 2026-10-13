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
* **Browser journey** — driven against the preview (below).
* **Preview** — `dpl_2pnS9F3r3kGoaX8WDSysEd8d5RXe`, state READY, source SHA
  `1a4814df0c9c55192a756c9a223a9b64d3452c98`, URL
  `https://universal-transmissions-22bwygs78-hhisim-7214s-projects.vercel.app`.

### 3a. The journey, as observed

| Step | Observed |
|---|---|
| Page renders | 6 connection cards, each with kind · basis, its basis label, the **record's own title** and a rationale (257–342 chars) |
| Legend | the three bases render as real buttons with `aria-expanded` |
| Destinations | all six return **HTTP 200** (`/journal/…` ×2, `/gallery/…` ×3, `/experience/correspondence-codex`) |
| Oracle entry carries the anchor | `researchTopicId=research-v1%3Acymatics%2Fconnection%2Fartwork-throat-chakra` + `from=/research/cymatics` + the seed question |
| Hop 2 — forwarded | the parameter **survives the device-chooser redirect**: the final URL is `/oracle/desktop?researchTopicId=research-v1:cymatics/connection/artwork-throat-chakra&from=/research/cymatics&q=…` |
| Hop 3 — rendered | chip block reads `SPEAKING ABOUT · Bio-Energetic Vortexes No.5 — Truth (Vishuddha Chakra) · RESEARCH CONTEXT · ← RETURN TO …` — the **connection's own** server-resolved title |
| Draft | seeded with the connection's own question, editable, not auto-submitted |
| Return | two links back to `/research/cymatics` |
| Keyboard | both links per card focusable (`tabIndex 0`), **no nested anchors anywhere** |
| Narrow layout | at an emulated ~390–494 px viewport: no horizontal overflow, 6 cards, the Oracle link 292 px wide and fully inside the viewport |

### 3b. Defect found by the journey (reported, not patched)

**A stale research context survives an unresolvable identifier.** Reproduced: open a valid
connection anchor (chip reads the artwork's title), then open
`/oracle?researchTopicId=research-v1:cymatics/connection/not-a-real-anchor` **in the same session** —
the chip still reads `Research context · Cymatics` instead of the honest unknown state. Clearing
`localStorage`/`sessionStorage` and reloading the same forged URL renders
`RESEARCH CONTEXT UNAVAILABLE`, so the resolver is correct and the honest path exists; what is
missing is that an unresolvable identifier does not discard the **previously resolved** context.

This is the class the standing notes forbid ("a stale artwork or deity anchor cannot silently
survive"); here it is a stale *research* anchor, and it would ground the model in the wrong topic.
Not patched in this batch: the fix belongs in `src/app/oracle/page-client.tsx`'s research-context
state, and it should be made **with** the payload-capture test below rather than blind.

### 3c. Harness limits (stated, not claimed as passes)

* The chat **send control was not driven successfully** in this session (the click landed on a
  navigation element), so no generated answer and no **outbound payload capture** were observed.
  The request body's contract therefore rests on the source (`page-client.tsx` sends the identifier
  derived from the resolved record plus the visitor's message) and on the existing Batch 14 suite,
  **not** on a captured live request.
* The narrow-layout emulation reported an inner width of 494 px rather than the requested 390 px;
  the no-overflow and in-viewport results stand at that width.

## 4. Limits

* The suite is structural. It cannot see a parameter dropped by a redirect or a chip rendered below
  the fold; that is what the browser journey is for.
* The 528 Hz correction is repeated in the new connection's rationale **as prose**. The registry
  summary remains the single normative statement of it.
