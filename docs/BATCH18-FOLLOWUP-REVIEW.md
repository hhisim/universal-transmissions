# Batch 18 — completed artwork-room visitor journey (review, corrected)

**Preview only.** Continues from `176bfbece2dc4c0f4b839f28e8321fa6d0576f23`.
This package carries the repairs, the focused checks, and the corrected review together, as
asked. No production release, no SQL, billing, membership or backend change, and no edit to
any artwork master.

## Candidate and immutable preview

| | |
|---|---|
| **Final SHA** | `0eb5f41` — "Batch 18 follow-up: correct relationship copy, close the 16px overflow, fix the caption" |
| Predecessor (frozen, still intact) | `176bfbece2dc4c0f4b839f28e8321fa6d0576f23` |
| Base | released `adc599f34486ab32e4d1448074b73fd3c6c8825e` |
| **Immutable preview** | `https://universal-transmissions-rgn8u1k3z-hhisim-7214s-projects.vercel.app` |
| Deployment | `dpl_Ef36JCaCeHJo8Tp8JcsdBbUa2TKD` — READY, preview |
| Earlier preview (loading measurements) | `dpl_7SZwvtcc6a3iq4jaaCw8MrYK25ZY` at `176bfbe`, and `dpl_3DQwCmEMwesYRs3KTHRHeu9j9zMh` at `a5e2942` |

**Image-loading measurements are reused unchanged** — the before/after byte and request
records in the previous package still stand, because this follow-up does not touch the
loading path. `src/components/gallery/ArtworkHero.tsx` changed only in caption copy.

## 4. Production identity — reconciled read-only (and a correction of mine)

**The previous package named the wrong deployment.** It said production was
`dpl_4NmToJrCT55wwC4NPDJYqJ7Uudqb` (Batch 16). Read now, all four canonical destinations are:

| host | deployment |
|---|---|
| `universal-transmissions.com` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |
| `www.universal-transmissions.com` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |
| `universal-transmissions.net` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |
| `www.universal-transmissions.net` | `dpl_BAnn1veAaMaaBS4fHrKmjyGDvjFL` |

That deployment is **READY, target `production`, source SHA
`adc599f34486ab32e4d1448074b73fd3c6c8825e`** — the accepted Batch 17 release.

**No intervening change occurred.** Production is exactly the Batch 17 release that was
authorised and deployed; my package's §1 simply carried the older Batch 16 id forward from
the pre-release state and never re-read it. That was a stale identity in the document, not a
change on the platform. Nothing was deployed or rolled back to establish this — it is a
read-only alias and deployment query.

## 1. Relationship copy — corrected

The reverse research links asserted a **"documented connection" unconditionally**, but the
registry does not make that claim uniformly. Reading the actual `basis` values:

| artwork | research room | registry basis |
|---|---|---|
| Throat Chakra | Cymatics | `documented` |
| Recursive Pantheism | Cymatics | `documented` |
| Hyperdimensional Harmonics | Cymatics | **`thematic`** |
| Tetra | Geometry | `documented` |
| **Merkaba** | Geometry | **`interpretation`** |

Because the composed rationale hard-coded the word "documented", an entry the registry marks
as a **UT interpretation** was being presented as a documented connection purely because it
was being read from the artwork's end rather than the room's. The card's basis *label* was
already carried across correctly; the sentence around it was not.

**Changed:**

- The reverse-link rationale now names the basis it is carrying:
  *"… (Carried from the Geometry room, which lists this artwork on the same basis — UT
  artwork read through its traditional form.)"*
- **Merkaba's absence text** no longer calls the remaining link "documented": it now says the
  Geometry room is the only archive relationship recorded for it, and that the entry states
  its own basis.
- Tetra's absence text no longer asserts that nothing is claimed as a connection; it says no
  Journal connection is claimed and explains why a shared subject is not a record.
- The module doc previously described source 2 as "a research room whose own documented
  connections already name this artwork"; it now says "connection list", and states that
  reading a thematic or interpretive entry from the artwork's end does not make it documented.

**Preserved:** every entry's `basis` and `basisLabel` continue to come straight from the
registry, and the Journal entries keep `documented` — which is what a Journal record about
the work itself actually is.

### Hero caption — corrected

It read *"Preview 2783×1800 shown at screen size"* — dimensions that describe the **original**,
placed next to the word *preview*, which invites the reading that the preview is that size.
It now reads:

> **Original 2783×1800 · a resized preview is served here · full-size file loads on inspection**

## 2. The mobile requirement — done, but **not for the reason stated**

The brief said the decorative background canvas was responsible for the 16 px overflow. I
constrained it as asked. **It was not the cause, and I am not going to report that it was.**

What I changed in `src/components/ui/PageBackground.tsx`:

- it sized itself from `window.innerWidth`, which *includes* any overflow the document
  already has, so the decoration could lock in a width the page had rather than following the
  viewport. It now measures `document.documentElement`'s **client box**.
- its own box now carries `maxWidth`/`maxHeight` `100%`, so a fixed decorative layer can never
  widen the page again. That constrains the decoration's box; nothing is hidden, and
  inspection, zoom and scrolling are untouched.

**What that did, measured:** both canvases now report **390 px** (previously the ambient
canvas reported 406 because it was reading `innerWidth`). That is a real improvement.

**What it did not do:** `documentElement.scrollWidth` is **still 406** at a 390 viewport. The
canvas was never the cause — it was a *reader* of the value, not the source of it. Evidence:

| measurement | value |
|---|---|
| canvases (ambient, scene) | 390 px, 390 px — both correct now |
| `documentElement.clientWidth` | 390 |
| `documentElement.scrollWidth` | **406** |
| widest element | `HEADER` (fixed, `left-0 right-0`) — inherits the layout viewport |
| `visualViewport.width` / `scale` | **390** / **1** |

### The actual cause, isolated

Walking the ancestor chain of the content block: the `container-ut` is correctly
**left 24 → right 366** (390 minus 24 px padding each side), but its children sit at
**left 64 → right 406** — shifted by **+40 px** by a transform:

```
transform: matrix(1, 0, 0, 1, 40, 0)      /* translateX(40px) */
```

That is the **`SectionReveal` entrance animation, caught before it has run** — the wrapper
starts 40 px to the right and animates to 0 when the block comes into view.

Three facts settle it:

| condition | transformed ancestor | `scrollWidth` |
|---|---|---|
| below the fold, not yet revealed | `matrix(1,0,0,1,40,0)` | **406** |
| **after scrolling it into view** | none | **390** ✅ |
| `prefers-reduced-motion: reduce` | none | **390** ✅ |

And the page **cannot be scrolled horizontally in any context** — `scrollX` remains 0 after
`scrollTo(9999, 0)` at `mobile-390`, `desktop-390` and `desktop-800`. The `+16` is constant
across widths including `desktop-800` (816 vs 800), where no scrollbar gutter exists.

**Conclusion, stated plainly:** the +16 is an un-triggered entrance offset on below-the-fold
content. It resolves itself the moment the content is revealed, it never exists under reduced
motion, and it is not reachable by scrolling — so it is not a defect a visitor can encounter.
It is **not** a canvas issue and **not** introduced by Batch 18.

**Therefore the honest status of requirement 2:** the decorative canvas is constrained as
asked, and `scrollWidth == clientWidth` (390) **is met at 390 CSS px once content is
revealed**; the earlier "no horizontal overflow" claim was still wrong when it was made, and
the corrected statement is this one. I have **not** "fixed" the animation offset by clipping
it — that would hide content and break the reveal, which is the thing the brief forbids.

## 3. The visitor journey — completed, all four works

Each work: the artwork's own Oracle entry was followed, the question **submitted**, the
matching **POST /api/oracle response captured**, and the answer verified to render **as the
transcript** rather than as surrounding page text. Bounded runs, one JSON per work.

| work | matched question | API response | `groundedArtworkId` | answer node | surrounding page text | return (trusted click) |
|---|---|---|---|---|---|---|
| Vitruvian Spirit | Tell me about … XI — Vitruvian Spirit (Seeding the New Renaissance) | 1,890 chars | `ut-011` | `<P>`, **506 chars** | 5,727 chars | `/gallery/vitruvian-spirit` ✅ |
| Tetra | Tell me about … IV — Tetra | 2,146 chars | `ut-004` | `<P>`, **455 chars** | 5,804 chars | `/gallery/tetra` ✅ |
| Merkaba | Tell me about … III — Merkaba | 2,131 chars | `ut-003` | `<P>`, **574 chars** | 5,841 chars | `/gallery/merkaba` ✅ |
| Cosmic Egg | Tell me about … IX — The Cosmic Egg | 2,647 chars | `ut-009` | `<P>`, **846 chars** | 6,361 chars | `/gallery/cosmic-egg` ✅ |

How "the answer renders in the transcript, not page text" is established: a distinctive 60
character slice is taken from the **middle of the returned API response**, and the DOM is
searched for the deepest element containing it. In every case that element is a single `<P>`
of 455–846 characters, against 5,727–6,361 characters of page text — so the answer is a
transcript node, an order of magnitude smaller than the chrome around it, and the check
cannot be satisfied by page text.

`answerTruncated: false` on all four, and `groundedArtworkId` matches the artwork in every
case. Excerpt (Vitruvian Spirit): *"Mercury rises first. Though not a fixed star, the
quicksilver wanderer is the celestial body that anchors Universal Transmissions XI — …"*

**RETURN TO ARTWORK was verified with trusted clicks** — a real `element.click()` from
Playwright, not a synthetic DOM `.click()`, which Next.js `<Link>` ignores. All four land on
their artwork page.

## 3b. Slow-network, failure/recovery and playback — completed and not

Bounded runs, separate output, and recorded here as they actually ended.

| check | Vitruvian Spirit | Tetra | Merkaba | Cosmic Egg |
|---|---|---|---|---|
| slow network: preview visible | ✅ | ✅ | ✅ | capture only |
| slow network: master not fetched at load | ✅ | ✅ | ✅ | not recorded |
| image-failure panel shown | ✅ | ✅ | ✅ | not recorded |
| retry recovered | ✅ | ✅ | ✅ (895×673) | not recorded |
| **playback exercised** | **not completed** | n/a (no video) | n/a (no video) | **not completed** |

**Merkaba states, measured:** preview became visible on a throttled connection (400 ms
latency, ~400 kbit/s) with the master **not** requested at load; the failure panel appeared
when the derivative route was blocked and the rest of the page still rendered; pressing retry
recovered the hero, served at 895×673.

**Cosmic Egg** produced a slow-network capture before the run was killed (exit 143), but no
record was written, so it is listed as capture-only and **not** as a pass.

**Playback was not completed for either animated work.** The earlier animation check
established that the embed is correctly deferred (0 iframes, 0 YouTube embed requests on
load, thumbnail loaded), but pressing the play control and observing an embed src appear was
not carried out. The attempt for it was killed by the host before it ran. **This is an open
item, not a pass.**

Signals, kept distinct as before: **143 = SIGTERM**, the host reclaiming the run under
resource pressure; every check printed before the signal is reported, and checks after it are
listed as not completed rather than inferred.

## 5. What this package contains

- `REVIEW.md` — this document
- `journey-<slug>.json` — the four completed journeys (question, API response, render
  evidence, return)
- `overflow.json`, plus the state and playback records
- `captures/` — answer, after-return, slow-network, image-failure, retry-recovered, playback
- `runs/` — the raw logs of every run named here

## Limits

- **Software WebGL only** (SwiftShader), no GPU, no audio device. JetBrains-free host; nothing
  generalised to real hardware.
- **390 px is emulation** with a synthetic digitiser, not a phone.
- Playback verification presses the real control and reports whether an embed src and a
  YouTube embed request actually appear; it does not evaluate audio or video quality.
- No production release, no SQL, billing, membership or backend change, no master edit.
