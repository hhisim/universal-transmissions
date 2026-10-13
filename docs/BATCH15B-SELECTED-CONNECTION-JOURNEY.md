# Batch 15b — completing the selected-connection journey (Cymatics pilot)

This pass finishes the pilot Batch 15 opened. It (1) reproduced the reported
stale-context defect and **withdrew it**, (2) found and repaired the defect that is
actually reachable, (3) drove the real send control and captured the real request
bodies, (4) completed the Codex destination honestly, and (5) verified at an
actual 390 CSS px viewport. No billing, SQL, corpus, media or 3D-engine file was
touched. Nothing was released to production.

Repair and evidence are in one commit on `omni/batch15-research-topology`.

---

## 1. The claim this pass opened with — withdrawn

Batch 15's record (`docs/BATCH15-RESEARCH-TOPOLOGY.md`, §3b) reported:

> **A stale research context survives an unresolvable identifier.** … open a valid
> connection anchor (chip reads the artwork's title), then open
> `/oracle?researchTopicId=research-v1:cymatics/connection/not-a-real-anchor` in the
> same session — the chip still reads `Research context · Cymatics`.

**Withdrawn, as a displayed defect.** It does not reproduce in any navigation mode
the application has. Eight steps across four navigation modes were driven against
the same preview the report was written against
(`dpl_2pnS9F3r3kGoaX8WDSysEd8d5RXe`), reading the Oracle's own context block after
each one:

| Step | Navigation | Context block |
|---|---|---|
| S1.1 | hard load, valid connection A | `SPEAKING ABOUT Bio-Energetic Vortexes No.5 — Truth (Vishuddha Chakra) · RESEARCH CONTEXT` |
| S1.2 | hard load, **unknown** identifier, same tab | `RESEARCH CONTEXT UNAVAILABLE` |
| S2.1 | in-app `<Link>` (soft) to connection A | `SPEAKING ABOUT Bio-Energetic Vortexes No.5 …` |
| S2.2 | same document, route changed to the **unknown** identifier | `RESEARCH CONTEXT UNAVAILABLE` |
| S3.1 | `history.back()` to A | `SPEAKING ABOUT Bio-Energetic Vortexes No.5 …` |
| S3.2 | `history.forward()` to the **unknown** identifier | `RESEARCH CONTEXT UNAVAILABLE` |
| S4.1 | valid connection A | `SPEAKING ABOUT Bio-Energetic Vortexes No.5 …` |
| S4.2 | valid connection B | `SPEAKING ABOUT Cymatics and the Language of Form …` |

The honest-unavailable state renders every time. The resolver is exact
(`resolveResearchTopic` uses `hasOwnProperty`, no substring fallback), and the chip
is derived from the URL on every render, so there was never a stored context for a
route change to leave behind.

Two things account for the original observation, and both are in the batch-15
record itself:

* **`Research context · Cymatics` is not the Oracle's chip.** That exact string is
  the *research page's* portal chip: `src/components/research/ResearchOraclePortal.tsx`
  line 80, `Research context · {topic.title}`. The Oracle's own chip reads
  `SPEAKING ABOUT … / RESEARCH CONTEXT`, and its unavailable state reads
  `RESEARCH CONTEXT UNAVAILABLE`. A reading taken from the research page while the
  tab had not left it would produce the reported string verbatim.
* That session recorded that its send click "landed on a navigation element" and
  that the journey was driven by a harness that could not capture requests.

The reproduction output is kept in
`docs/evidence/batch15b/withdrawn-stale-context.json`.

Per the standing rule for correcting a claim — including one of ours — the
withdrawal is made explicitly rather than quietly dropped.

---

## 2. What the journey found instead — two real defects, one of them reachable

### 2a. An explicitly unresolved identifier was dropped from the request (reachable)

The chip was right and the request was not. The submit payload built its
`researchTopicId` as `researchContext ? researchTopicIdFor(researchContext.id) : undefined`,
so an identifier that **failed to resolve** was not sent at all. The request then
looked to the server like an ordinary ungrounded question: `researchStatus: "absent"`,
`activeAnchor: "none"`, no disclosure that the visitor's selected topic was
unavailable, and no research context. Measured against the shipped preview, with the
same question, the only difference being whether the identifier is in the body:

| Request body | `researchStatus` | `activeAnchor` | Answer (real, from the deployed route) |
|---|---|---|---|
| `researchTopicId` **absent** (what the client sent) | `absent` | `none` | "…the frequency system it draws on is the Codex's own waveform-language of **Codex Wave Modes**, where number, glyph, waveform, and harmonic reference frame fuse into a neuro-symbolic transmutation grid." |
| `researchTopicId` = the **unresolved** identifier | `unknown` | `research` | "…The **selected research topic is unavailable**, so no frequency system can be truthfully named for this page. This transmission stays sealed, awaiting the moment its true anchor is restored." |

The first answer names a system that is not a system. That is the class the
standing notes forbid.

### 2b. The memoised submit closure did not name the research anchor (latent)

`send` is a `useCallback` whose dependency list named `artworkContext` but never the
research anchor. A memoised closure can outlive the render that created it, so a
client-side move from a resolved anchor to an unresolved one could leave `send`
still holding the resolved identifier while the chip on screen said UNAVAILABLE —
the chip rendered from one value and the request carrying another.

**Not reachable through the shipped UI today, and that is stated rather than
implied.** Navigation semantics were measured, not assumed (`scripts`-level probe,
recorded in the withdrawn-claim evidence): every `.goto()` and every
`history.back()`/`forward()` between two such entries was a **full document load**
(load count +1, a `window` marker died), and the only soft navigations the app has
are `/research/cymatics ↔ /oracle/desktop`, which unmount and remount the Oracle.
No shipped navigation changes the research anchor without remounting the client,
and `page-client.tsx` contains no `<Link>`, no `useRouter` and no `window.location`
reference. It is a one-line-away bug — any future `<Link>` or `router.push` to a
sibling Oracle entry would create exactly the precondition — so it was repaired
structurally rather than left to be rediscovered.

---

## 3. The repair

All of it is in `src/app/oracle/page-client.tsx`.

1. **A NAMED third state.** `researchContext | null` became

   ```ts
   | { state: "none" }
   | { state: "unresolved"; requestedId: string }
   | { state: "resolved"; id: string; title: string; route: string; returnTo: string }
   ```

   derived from the current URL on every render. Nothing about a research entry is
   copied into component state, so there is no copy a route change could leave
   behind. Naming the unresolved case is what lets the payload carry it.
2. **Submitted identifier derived from the same value the chip renders from**:
   `resolved → the canonical public identifier`, `unresolved → the requested
   identifier as itself`, `none → nothing`.
3. **Read through a ref**, `researchAnchorRef`, refreshed on every render, so a
   memoised closure cannot submit an anchor from an earlier URL; the anchor is also
   added to `send`'s dependency list.
4. **A route change to a different entry aborts the in-flight resolution**
   (`entryIdentity` = research id + artwork id), so an older, slower answer cannot
   land after the navigation and re-attach the previous context. The guard touches
   transport state only: **the messages already exchanged and whatever the visitor
   has typed are deliberately left alone.**
5. The artwork anchor stays suppressed whenever a research identifier was supplied,
   resolved or not, exactly as before.

---

## 4. The Codex destination — completed honestly

The brief: *use its existing supported navigation to expose FREQUENCY, or clearly
tell the visitor how to locate it. Do not imply a targeted destination that the link
does not provide.*

The link **cannot** target FREQUENCY, and that was established by driving it rather
than by reading it:

* `public/experience/correspondence-codex/codex.html` contains **no** `location.*`
  reference, no `URLSearchParams`, no `hashchange` listener — the Codex is a single
  page with a six-tab nav (`Home · Matrix · Symbols · Letters · Decode · Oracle`).
* Probed in the browser: `?system=FREQUENCY` → system bar still `All Systems`, tab
  still `Home`; `#FREQUENCY` → same. Neither is honoured.

So the honest branch is taken, and the path that does work was verified by walking
it: the **Home tab's system grid** lists all 27 systems; choosing **〜 FREQUENCY
(25 entries)** opens the **Matrix** tab with 〜 FREQUENCY selected in the system bar
and the counter reading `25 of 824 entries`. The same button is in the Matrix tab's
system bar.

The card therefore changed in three ways:

| | Before | After |
|---|---|---|
| Card title (also the Oracle anchor title) | `The Correspondence Codex - the FREQUENCY system` — reads as a targeted destination | `The UT Correspondence Codex` — the destination's own title |
| How to reach FREQUENCY | not stated | stated on the card, in text, as a `destinationNote` |
| Oracle anchor summary | named the record only | carries the same "Reaching it: …" statement, so the model cannot imply the link lands on the system |

`destinationNote` is a new optional field on `ResearchConnection`. The structural
suite requires a note on every connection whose destination is not a deep-linkable
content route, so a future card cannot imply a targeted destination it does not have.

---

## 5. The four journeys, with captured requests

Driven by `scripts/batch15b-connection-journey.py` against the repaired preview.
Every request below is a real `POST /api/oracle` captured from the browser; the
send control is the real one. Responses are labelled **REAL** (the deployed route
answered) or **STUBBED** (the harness intercepted and supplied a fixed body, to
exercise the client with the backend held still) — per capture, never globally.

| Journey | Control | Chip | `researchTopicId` in the body | `artworkId` | Response |
|---|---|---|---|---|---|
| **J1** valid connection A, opened from its own card | click TRANSMIT | `SPEAKING ABOUT Bio-Energetic Vortexes No.5 — Truth (Vishuddha Chakra)` | `…connection/artwork-throat-chakra` | absent | REAL — `research` / `resolved`, grounded title = the record's own |
| **J2** A → valid connection B (back to the page, then B's card) | click TRANSMIT | `SPEAKING ABOUT Cymatics and the Language of Form: When Vibration Learns to Spell` | `…connection/journal-cymatics-language-of-form` | absent | REAL — `research` / `resolved` |
| **J3** valid → **unknown**, same session, storage present | click TRANSMIT | `RESEARCH CONTEXT UNAVAILABLE` | `…connection/not-a-real-anchor` (the requested identifier, as itself) | absent | REAL — `research` / `unknown` |
| **J3s** same state, backend held still | click TRANSMIT | `RESEARCH CONTEXT UNAVAILABLE` | `…connection/not-a-real-anchor` | absent | **STUBBED** |
| **J4** unknown from a **clean session** (nothing in local/session storage) | **keyboard Enter** | `RESEARCH CONTEXT UNAVAILABLE` | `…connection/not-a-real-anchor` | absent | REAL — `research` / `unknown` |

The visitor's own message is carried verbatim in every one of them, the composer is
emptied on submit, and the message is in the transcript. In J2 the previously
resolved anchor (A) appears nowhere in the body.

Both defects of §2 are visible in the difference between this table and the same
harness run against the **pre-repair** preview
(`docs/evidence/batch15b/journey-before.json`): **9 of the 45 assertions failed
there, every one of them in an area this pass repaired.** J1 and J2 passed
unchanged, and J3 was the failure —

```
FAIL J3 the request carries the REQUESTED identifier, as itself
     body: {"message": "...", "mode": "oracle", "lang": "en", "speed": "fast", "history": []}
FAIL J3 the server held the research anchor slot for the unknown identifier
     {"activeAnchor": "none", "researchStatus": "absent"}
```

---

## 6. Verification at an actual 390 CSS px viewport

A real 390 × 844 viewport (`window.innerWidth` confirmed 390; the Batch 15 record
had only managed an emulated 494 px). The long basis labels were the failure mode:
the header row was `flex items-start justify-between` with the label span marked
`shrink-0`, so at 390 px the longest label ran off the card.

| | Before | After |
|---|---|---|
| Document horizontal overflow | **81 px** | **0 px** |
| Cards with a clipped / overflowing header | **4 of 6** | **0 of 6** |
| `codex-frequency-lattice` label, past the card's right edge | **+104.7 px** (header overflow 130 px, `flex-shrink: 0`, one line) | −25 px, wraps to a second line |
| `flex-shrink` on the label | `0` | `1` |

The full per-card measurements are in
`docs/evidence/batch15b/viewport390-before.txt` and `viewport390-after.txt`.

Keyboard access was exercised by tabbing, not asserted from the markup: the tab
order reaches a card's destination link, **the same card's** Oracle entry link, the
research portal's Oracle link, and the page composer. On the Oracle, the composer
is focusable, accepts typed input, and is followed by a focusable control.

---

## 7. Verification summary

| Check | Result |
|---|---|
| `node scripts/batch15-research-topology.js 8a6e7f73b1f0` | **175 / 0** (was 150 / 0; +25 assertions for §3 and §4) |
| `node scripts/batch2-research-anchor.js` | 64 / 0 (unchanged) |
| TypeScript project check (compiler API, `noEmit`) | 0 diagnostics in project sources |
| `scripts/batch15b-connection-journey.py` against the repaired preview | **45 assertions, 0 failed** — `docs/evidence/batch15b/journey.json` |
| Unchanged corpora | `public/`, artwork registry, journal corpus, codex corpus, billing/membership/migrations — asserted by suite section F |

Preview (immutable): see §9.

---

## 8. Limits, stated rather than glossed

* **The latent closure defect (2b) is not demonstrated in the browser**, because no
  shipped navigation creates its precondition. It is covered structurally (suite
  section H) and by the ref, not by a capture. Say so rather than imply a live
  reproduction.
* **The model's prose is not part of the contract.** The tests assert the response
  *envelope* for an unresolved identifier — `researchStatus: "unknown"` and
  `activeAnchor: "research"`, i.e. the server was told and the anchor slot is held.
  In two of the captured REAL runs the model still did not lead with the
  unavailability, even though the grounding instructs it to. The client-side repair
  is complete; a model-compliance gap remains open and is **not** claimed as fixed.
* **The stub is a stub.** J3s proves the client sends the right body with the
  backend held still; it is not evidence about the backend.
* The journey harness is the browser tier and needs a Playwright-capable
  interpreter; it is not wired into the Node suite and must be run by hand.

---

## 9. Preview and reproduction

Two identities are named separately, because they are not the same deployment:

* **Evidence preview** — `https://universal-transmissions-pkv0keldd-hhisim-7214s-projects.vercel.app`,
  built from commit `77ddba1`, the commit that carries the repair. `git rev-parse 77ddba1:src`
  = `233f5a82db012ddfefb3f8369a7a211172c58405`. Every capture in §2a, §5 and §6 was
  taken against it.
* **Delivered preview** — the immutable deployment of this commit. Its URL,
  deployment id and `src`/`scripts` tree hashes are recorded in the batch artefact
  `preview.json`, kept beside this batch in the workspace rather than committed:
  a deployment URL cannot exist before the push that creates it, so committing it
  here would only ever record a different commit's deployment. Relative to the
  evidence preview this commit changes only `scripts/` and `docs/`, so `src/` is
  byte-identical and the same application was exercised. The hashes are recorded
  side by side precisely so that claim is checkable rather than asserted.

Nothing was promoted to production: the deployment is a branch preview, and no
production alias was moved.

```bash
# structural
node scripts/batch15-research-topology.js 8a6e7f73b1f0     # 175 / 0

# journey (Playwright interpreter)
python3 scripts/batch15b-connection-journey.py <preview-url> out.json   # 45 / 0
```
