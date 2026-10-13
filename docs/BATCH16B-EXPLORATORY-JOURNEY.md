# Batch 16b — completing the exploratory research journey

Continues from `de3636d`. Preview only: nothing is released, no SQL is applied, and no
billing, corpus, provider-replacement or 3D-engine path is touched.

Three things finish the milestone: selection becomes real, the answer cutoff is
diagnosed and repaired at the layer responsible for it, and the finished experience is
walked with keyboard, reduced motion and a real 390-pixel viewport.

---

## 1. Selection is real

The nexus used to print every relationship as an expanded card — a wall to scroll, not
a surface to explore. It now offers a **compact list** beside an **inspector**: choose a
relationship and it opens out with

- **what it connects** (the destination, as an ordinary link),
- **why it connects** (the rationale the archive holds it on),
- **how well it is supported** (the basis, in words, not a colour),
- **the records behind it** — the record itself, the room it belongs to, and the room's
  real references,
- **where to go next** — the destination and the contextual Oracle entry.

Everything is derived from the existing registry; the Geometry registry and sources are
untouched. Room filtering stays, and narrowing can never leave an empty panel.

**Accessibility is structural, not bolted on.** The list is real `<button>` elements, so
Tab and Enter work with no scripting at all; Up/Down move between relationships. The
panel is announced when it changes. On a narrow screen the list sits above the panel.

**The copy is visitor-facing.** The page previously explained server resolution and a
registry; it now explains what someone can explore and do. The suite fails the build if
`server-resolved`, `registry key`, `exact-resolution`, `resolveResearchTopic` or a raw
`research-v1:` identifier ever appears in the nexus page or component.

---

## 2. The 1,750-character cutoff — diagnosed before anything changed

**It was not a capture artefact. The visitor was receiving it.**

Method, in the order the review asked for:

1. **The raw API response.** Calling the **deployed route** four times the way the
   browser does returned a 200 response of **2,771 characters ending mid-sentence**:
   `...The frequency and spin assignments in particular are`. One cut in four responses.
2. **The rendered transcript and the evidence capture.** The earlier 1,750-character
   answer in `reverify.json` ended mid-sentence on the wire; the other captured answers
   (1,739 / 2,656 / 2,167) all ended at sentence boundaries. So the cutoff was real and
   intermittent, not a capture bug.
3. **Length limits and finish metadata.** Nothing in this repository caps the answer —
   the only `.slice(0, 3000)` is the TTS route, and `stripUnverifiedCitations` only
   removes links, which cannot cut mid-sentence. The route reads `data.response` and
   **forwards no finish metadata at all**. The layer that spends the budget is the
   Oracle backend on port 8001 (`/opt/tao_oracle`), which this repository proxies to.

**The cause, measured directly against the provider:**

`deepseek-v4.1-flash` emits a `reasoning_content` chain of thought that is billed from
the **same `max_tokens` pool** as the answer. `codex` ran with `max_tokens = 1400`, and
`_call_opencodego` retried **only when content came back EMPTY** — `finish_reason` was
never read.

| budget | finish_reason | completion tokens | reasoning | content |
|---|---|---|---|---|
| 1400 | `length` | 1400 | 1400 | **0 chars** (empty → triggered the old retry) |
| 4096 | `length` | 4096 | 3806 | **1,251 chars, cut mid-sentence** |
| 8192 | `stop` | 4192 | 3660 | 2,456 chars, complete |
| 16384 | `stop` | 3294 | 2732 | 2,693 chars, complete |

So the old retry path — 1400 empty, then 4096 — returned a **truncated fragment**, which
is exactly the ~1,750-character mid-sentence answer a visitor saw.

**The repair, in that layer.** In `/opt/tao_oracle/app/synthesis.py`:

- the codex budget is **8192**, measured to finish cleanly, with a comment recording the
  measurements above;
- `_call_opencodego` now reads `finish_reason` and, on `"length"`, retries once with more
  headroom instead of passing the fragment to a visitor — and logs the case where even
  the retry is still capped, which is the only remaining path to a visible cutoff.

The route could not have fixed this: by the time it sees the text, the rest is already
gone upstream. **VOA runs its own separate `synthesis.py`** and is unaffected. The
service was backed up, syntax-checked, restarted and health-checked; port 8001 also
serves `/api/oracle-v2` and `/api/codex-oracle`, so all three benefited.

**Before / after, on the deployed route:** 1 cut in 4 responses → **0 in 6**, with
answers up to 3,064 characters.

---

## 3. The finished experience, verified

`scripts/batch16b-research-journey.py` — **27 assertions, 0 failed**:

- **the walk**: nexus → Geometry filter → `artwork-tetra` selected → inspector →
  `/gallery/tetra` → back to the room → the contextual Oracle carries the chosen
  relationship as context → return to research;
- **keyboard**: the room filter, Enter to select, ArrowDown to move, and the Oracle link
  inside the inspector is focusable;
- **reduced motion**: every reveal wrapper computes to full opacity with no transform;
- **the basis reads differently by kind**: a documented relationship states "named in an
  existing UT record", while the thematic Geometry↔Cymatics relationship states "not a
  sourced link";
- **390 CSS px**: a real 390 viewport, no horizontal overflow, the inspector inside the
  viewport, and the Geometry room likewise.

### A defect found while checking the reveal wrappers

`SectionReveal` ships its hidden state — `opacity: 0; transform: translateY(40px)` — in
the **prerendered HTML** (170 such wrappers on `/research`). A visitor without
JavaScript could never trigger the reveal, so those sections were simply blank for them;
reduced motion was never honoured either.

The fix is a `[data-reveal]` CSS rule that restores visibility under
`@media (scripting: none), (prefers-reduced-motion: reduce)`. Everyone else keeps the
animation. The journey now asserts a reveal wrapper is **visible with JavaScript
disabled**, and a no-JavaScript capture is among the screenshots delivered with this
batch.

The five captures — desktop inspector, desktop Geometry after scrolling, 390-pixel
inspector, 390-pixel Geometry after scrolling, and the no-JavaScript page — are
delivered with this batch and archived at
`/mnt/HC_Volume_107040658/omni-recovered-deployments/batch16b/`. They are kept out of
git deliberately: the repository tracks the small JSON evidence under
`docs/evidence/`, not ten megabytes of PNGs.

### Answer quality, not just length

`scripts/batch16b-answer-completeness.py` — **30 assertions, 0 failed** over four
answers (an opening question and a follow-up carrying the first turn as history). Every
answer ends at a sentence boundary, addresses the selected relationship, distinguishes
documentation from interpretation, does not attribute Lawlor, Buckminster Fuller,
Blavatsky or Schwaller (none of which was ever supplied), cites no page number the
grounding never supplied, and does not claim to have read the whole record. The
archive's voice is intact.

---

## 4. Checks

| check | result |
|---|---|
| `scripts/batch16-research-nexus.js` | **129 assertions, 0 failed** |
| `scripts/batch15-research-topology.js` | **180, 0 failed** |
| `scripts/batch16b-answer-completeness.py` | **30, 0 failed** |
| `scripts/batch16b-research-journey.py` | **27, 0 failed** |
| TypeScript project check | **0 diagnostics** |

Assertions updated rather than dropped, each encoding a change of state: the suite now
asserts the inspector contract and the visitor-facing-language rule, and the batch-15
blast-radius guard lists this batch's files — including `SectionReveal.tsx` and
`globals.css`, which is how the reveal safety net stays visible to a reviewer.

**Not claimed:** the local production build still fails on the six env-dependent auth
pages (`supabaseUrl is required`) as documented in Batch 16; those share no file with
this diff. The preview build with the real environment is the gate.
