# Batch 16 — the Research Nexus and the Geometry room

Two things ship together: `/research` becomes an authored exploration surface where a
visitor selects a relationship and sees what it connects, why, on what basis and where
to go next; and **Geometry becomes the second registered room**, on the same registry
and the same exact-resolution contract the Cymatics pilot established.

Preview only. Nothing is released, no SQL is applied, and no billing, corpus, media,
provider or 3D-engine path is touched.

---

## 1. What was already there, and what was not

The four domains already had pages. What they did not have was parity of *machinery*:

| domain | page | before | after |
|---|---|---|---|
| Cymatics | 637 lines | registered room, 6 connections, Oracle handoff | unchanged |
| Geometry | 1156 lines | a reading page — **no registry, no connections, no Oracle handoff** | registered room, 6 connections, 4 registers, 3 primary sources |
| Linguistics | 783 lines | reading page, no registry | reading page — **stated as such** |
| Symbolism | 1000 lines | reading page, no registry | reading page — **stated as such** |

Geometry had the most content of any domain and none of the machinery. That is the gap
this batch closes — and the incompleteness that remains is now stated on the nexus
rather than papered over (see §5).

---

## 2. One registry, one contract, two rooms

`src/lib/research-connections.ts` gains `GEOMETRY_CONNECTIONS`, `GEOMETRY_GAPS`, and
two maps — `CONNECTIONS_BY_TOPIC` and `GAPS_BY_TOPIC` — declared *after* both arrays so
the ordering is explicit.

`src/lib/research-topics.ts` no longer hard-codes Cymatics. `RESEARCH_TOPICS` holds both
rooms, and the connection anchors are derived by iterating it:

```ts
Object.entries(RESEARCH_TOPICS).flatMap(([slug, topic]) =>
  (CONNECTIONS_BY_TOPIC[slug] ?? []).map((c) => [
    connectionRegistryKey(slug, c.anchorSlug), connectionTopic(topic, c),
  ]))
```

Consequences that matter:

- **One resolver.** `resolveResearchTopic` is still the only lookup, and it is still an
  exact key match with no substring fallback. A second room cannot grow a second
  registry or a second parameter.
- **Anchors are room-scoped.** `geometry/connection/artwork-tetra` and
  `cymatics/connection/artwork-tetra` are different keys. The suite asserts that the
  same slug under the *other* room's key resolves to nothing.
- **The Cymatics release is pinned, not assumed.** The suite asserts the same six
  anchors in the same order, and that the released Codex anchor still carries its
  "how to reach it" statement.

---

## 3. Geometry as a room

**Four registers, kept apart** — MATHEMATICAL, HISTORICAL, TRADITIONAL SYMBOLISM, UT
ARTISTIC INTERPRETATION — are carried in the server-resolved topic summary (so the
Oracle is grounded in the same distinction) and rendered as four cards on the page.
Sources are cited for the first two only.

Three primary sources, each verified to resolve and described for exactly what it
supports:

- **Euclid**, *The Thirteen Books of the Elements* (Heath/Heiberg, 1908) — `archive.org`
  item `thirteenbookseu03heibgoog`, whose own description reads "III. Books X–XIII and
  appendix". Book XIII is where the five regular solids are constructed and proved to
  be exactly five.
- **Plato**, *Timaeus* (Archer-Hind) — cited only for the documented association of
  four regular solids with four bodies and of the dodecahedron with the cosmos.
- **Kepler**, *Ioannis Keppleri Harmonices mundi libri V* (1619) — the digitised 1619
  edition; the catalogue title records the appended *Mysterium cosmographicum*, whose
  title states its argument "ex quinque corporibus regularibus".

Four candidate identifiers were **rejected during preparation** because they 404'd —
checking a source before citing it is the point, not an afterthought.

**Six connections**, every one against a record that exists, by its own title:

| connection | record | basis |
|---|---|---|
| Cymatics — the parallel research room | `/research/cymatics` | thematic |
| The UT Correspondence Codex | `/experience/correspondence-codex` | documented |
| Universal Transmissions IV — Tetra | `/gallery/tetra` | documented |
| Universal Transmissions XI — Vitruvian Spirit | `/journal/universal-transmissions-xi-…` | documented |
| Walter Russell's The Universal One | `/journal/walter-russell-universal-one-…` | documented |
| Universal Transmissions III — Merkaba | `/gallery/merkaba` | interpretation |

The Geometry↔Cymatics entry states its limit in the card, in the Oracle anchor derived
from it, and in a dedicated block on the page: a Chladni figure is produced by standing
waves in a medium at a frequency, a drawn figure by an intention, **resemblance is not a
mechanism**, and the archive holds no experiment in which a geometric construction
emerges from vibration. It is labelled a *parallel inquiry* and is the one entry held as
thematic rather than documented.

---

## 4. The shared surface, and the accessible path

The behaviour moved into `src/components/research/ResearchConnections.tsx`; both rooms
render it. `CymaticsConnections.tsx` remains the released entry point as a thin wrapper
carrying the Cymatics identity and its own gaps, so the released page contract and DOM
(`data-cymatics-connections`, `id="connections"`) are unchanged.

Preserved and asserted: two links per card with the Oracle entry a **sibling**, never
nested; the basis legend as real `aria-expanded` buttons rather than hover; `break-words`
on both header labels with neither `shrink-0` (the 390 px clipping defect stays fixed);
`focus-visible` outlines on every interactive element.

The nexus explorer (`ResearchNexus.tsx`) narrows by room through `<button aria-pressed>`
and announces the filtered count with `aria-live="polite"`. It imports nothing but React
and Next, performs no fetching, and adds no dependency — `package.json` is byte-identical
to the released commit, which is asserted rather than claimed.

---

## 5. Incomplete domains, represented honestly

`RESEARCH_DOMAINS` carries all four domains with an explicit `registered` flag and a
`standing` line. Cymatics and Geometry are **Registered room**; Linguistics and
Symbolism are **Reading page — not yet a room**, with the standing text saying what is
missing: no server-resolved topic record, no sourced bibliography, and no curated
connection registry, so nothing there can be taken into the Oracle as a selected
context. The nexus coverage note repeats it: 12 relationships across two rooms, and
none invented to fill the other two.

Also stated rather than hidden: the Geometry room covers classical Euclidean and
Platonic material and says plainly that non-Euclidean, higher-dimensional and
projective treatments are not yet part of it.

---

## 6. Focused checks

`scripts/batch16-research-nexus.js` — **111 assertions, 0 failed**. It is deliberately
built to stop this batch from lying: every Geometry connection must match a real record
title; the resemblance limit must appear in both the card and the Oracle anchor; the two
unregistered domains must be described as reading pages; and the exact-resolution
contract must hold for both rooms including forged keys.

The released suite `scripts/batch15-research-topology.js` still passes — **180
assertions, 0 failed**. Three of its assertions were updated rather than dropped, and
each encodes the change of state this batch makes:

1. it read the section markup from `CymaticsConnections.tsx`, which is now a wrapper —
   it now asserts the shared component's contract *and* that Cymatics still feeds its own
   gaps to it;
2. its scope guard's allowed-file list gained this batch's files;
3. it asserted `research-v1:geometry` was a **forgery**. That is now false by design, so
   Geometry is asserted to resolve as the second room and `linguistics`/`symbolism`
   remain in the forgery sweep.

TypeScript project check: **0 diagnostics**. Local production build: `/research`,
`/research/geometry`, `/research/cymatics` and `/research/symbolism` prerender; the six
env-dependent auth pages (`/account`, `/login`, `/oracle/plans`, `/sanctum/*`, `/signup`)
fail locally with `supabaseUrl is required`, which is the documented pre-existing
environmental failure — those pages share no file with this diff, and the Vercel build
with the real environment is the gate.

---

## 7. Eyeball evidence and the live journey

Captured against the immutable preview, not locally, and recorded with it:

- desktop screenshots of `/research` (nexus) and `/research/geometry` (registers +
  connections);
- a 390 CSS px pass on both;
- the complete visitor journey — Research Nexus → a Geometry question → an explained
  connection → its destination → the contextual Oracle → return to research — with
  **natural visitor questions, not test labels**, and **full answers** checked for
  whether they answer the selected question and keep archive interpretation distinct
  from evidence.

The journey is deliberately not asserted from response metadata or answer length: those
are recorded, but the acceptance question is what the answer actually says.
