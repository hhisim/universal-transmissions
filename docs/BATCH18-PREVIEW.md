# Batch 18 — artwork rooms and a progressive gallery hero

**Preview only.** Base: released `adc599f34486ab32e4d1448074b73fd3c6c8825e`.
Candidate: `a5e2942` — one commit carrying implementation, verification and this review.

Nothing here touches billing, memberships, SQL, the backend, the Resonator engine or any
original media master. `public/artworks/**` is byte-unchanged (verified below).

## 1. What the released pilot already did, and what it left behind

The Vitruvian Spirit pilot (`ProgressiveDetailExplorer`, Batch 3) already solved progressive
loading **for detail tiles**, and it held four invariants worth reusing rather than
reinventing: an unrevealed detail is never mounted, so it cannot begin a request; revealed
batches are never unmounted; thumbnails go through `next/image` so the browser negotiates a
resized variant; and the original is requested only on inspection. It reuses the site's
existing `<Lightbox>` for inspection. The contextual Oracle machinery likewise already
existed: the page emits `/oracle?…artworkId=…&from=<artwork path>&q=…`, and the Oracle reads
`from` as a bounded `returnTo` and renders a `← RETURN TO ARTWORK` control.

**What it left behind:** the pilot ran for exactly one artwork, and the *main artwork* never
got the treatment at all. Its hero passed `unoptimized` and `priority`, which serves the
master eagerly.

## 2. Measured before/after — what a visitor actually transfers

Measured with one harness run identically against released production and against this
preview (`scripts/batch18-measure-loading.py`), counting only image responses on first paint.

| work | before (released) | after (preview) | change |
|---|---|---|---|
| vitruvian-spirit | 1,357,422 B | 206,750 B | **−85%** |
| tetra | 1,778,926 B | 104,779 B | **−94%** |
| merkaba | 1,718,778 B | 125,344 B | **−93%** |
| cosmic-egg | 4,999,389 B | 201,886 B | **−96%** |
| **total** | **9,854,515 B** | **638,759 B** | **−94%** |

The main artwork itself, before → after:

| work | before | after |
|---|---|---|
| vitruvian-spirit | 1,253,084 B **master** | 102,412 B **derivative** |
| tetra | 466,431 B master | 72,810 B derivative |
| merkaba | 612,314 B master | 95,300 B derivative |
| cosmic-egg | 425,368 B master | 137,526 B derivative |

And the shape of the page:

| work | `<img>` in main | hero box |
|---|---|---|
| vitruvian-spirit | 8 → 8 | 1230×1230 `cover` → 1230×795 **`contain`** |
| tetra | 8 → 7 | 1230×1230 `cover` → 1230×924 `contain` |
| merkaba | 6 → 6 | 1230×1230 `cover` → 1230×924 `contain` |
| cosmic-egg | **37 → 8** | 1230×1230 `cover` → 1230×1637 `contain` |

**This is not a full-resolution download behind a spinner.** The preview *is* the payload —
a resized avif/webp derivative the browser selects from `sizes` — and the master is fetched
only when a visitor asks to inspect. That distinction is asserted, not asserted-about: the
verification fails if the master is requested on load.

**Half the change was found by measuring, not by reading.** The first measurement of the
preview showed cosmic-egg essentially unchanged (4,999,389 → 4,711,547): the hero was
progressive but the detail strip was still progressive for *one* artwork, so a 37-detail
work still pulled all 37 thumbnails. Extending the pilot explorer to every artwork is what
produced the −96%.

## 3. Connections to the archive

`src/lib/artwork-connections.ts` reuses the standard `research-connections.ts` already set:
a connection is a claim, so `rationale` and `basis` are **required** per entry, and a shared
keyword is not a relationship. Two sources, and neither is invented:

- **Journal records that name the work** — a literal, checkable map. Vitruvian Spirit,
  Cosmic Egg and Recursive Pantheism each have a post carrying the work's own title.
- **Research rooms that already list the work** — **derived** by reading
  `CONNECTIONS_BY_TOPIC`, so the artwork page cannot drift from the research room making
  the same claim. The room's own rationale is reused verbatim rather than paraphrased.

**Absences are stated, not filled.** Merkaba and Tetra get an explicit "no Journal record
names this installment" instead of a near-miss link; Tetra's note records why the posts that
*mention* tetrahedral geometry are not promoted to connections.

Each entry renders its `kind`, its `basisLabel`, its rationale, and a link to the record,
under copy that keeps the work's recorded description separate from an interpretation. The
existing Oracle entry is preserved (now marked `data-artwork-oracle`) and the return route
is the released one.

## 4. Verified journeys

`scripts/batch18-verify.py` walks discovery → preview → inspection → connection → Oracle →
return for Vitruvian Spirit, Tetra, Merkaba and Cosmic Egg (portrait, 0.75:1 — materially
different shape from the 1.33–1.55:1 landscape works).

**14/14 per work through the Oracle check** (verified in two batches of two works):

- discovery: the gallery indexes the work
- preview: starts in preview state; requests an optimised derivative; **the master is NOT
  fetched on load**; the box takes the master's own aspect (no crop); the image is
  `contain`, not `cover`
- focus: the artwork dominates the first viewport
- inspection: opening it requests the full-resolution master; zoom controls offered;
  Escape closes and returns to the artwork
- connections: present; each states why it belongs; the basis of each claim is labelled
- Oracle: the entry names the work and where to return to

**States** (`/root/b18/states.py`, 14/18, with both failures diagnosed below):

- 390 px: no horizontal overflow; the hero fits; the inspection control is tappable
- slow network (400 ms latency, ~400 kbit/s): the preview becomes visible **and the master
  is still not requested**
- image failure: an aborted preview shows the honest "Preview unavailable" panel with a
  retry, and the rest of the page still renders

## 5. Two failures found, both reported rather than tuned away

**a. `innerWidth` is 406 at a 390 CSS px viewport — pre-existing, not this batch.** The
verification asserted `innerWidth === 390`. The control run on released production reports
the **identical 406**, `viewportMeta width=device-width`, and the widest element is the
site's own background `CANVAS` at 406 px. So the layout viewport expands on this site for a
reason that predates this work, and the assertion — not the page — was wrong. The overflow
check was also measuring against the expanded viewport, so it can only catch overflow beyond
406; that limitation is recorded rather than papered over.

**b. The hero occupies less of a phone's first screen than it used to (0.387 → 0.252 on
Vitruvian Spirit).** This is a **real consequence of not cropping.** The released hero
rendered every work into a fixed square, which on a 390-wide phone is ~390 px tall; a 1.55:1
work at its true aspect is ~262 px tall, so it is shorter on screen. The artwork is still the
first content and the dominant element of the page, but it is a smaller share of the first
screen. That is the honest cost of honouring the artwork's shape, and it is stated here
rather than hidden behind a lowered threshold. If presence on a phone matters more than
fidelity, the fix is a taller mobile frame or a tap-to-zoom affordance, not a crop.

## 6. Checks run

- `npx tsc --noEmit` → **exit 0**
- `next build` with the project's env supplied → **exit 0**. A bare local tree fails the six
  Supabase-dependent auth routes (`/account`, `/login`, `/oracle/plans`, `/sanctum/member`,
  `/sanctum/orders`, `/signup`) exactly as it did before this change — a local env-scope gap,
  not a defect; the production build of the base commit reported 197/197.
- Original media masters: `public/artworks` unchanged (the batch only *reads* them, via
  `scripts/batch18-artwork-image-meta.py`, to record intrinsic dimensions).

## 7. Honest limits

- All rendering here is **software WebGL** (SwiftShader) on a host with no GPU. Nothing is
  generalised to real devices.
- The mobile checks use emulation at 390 CSS px with a synthetic digitiser; that is not a
  phone. The 406 layout-viewport finding above is a measurement of this site, not of handsets
  generally.
- The two journey batches and the states run were each **interrupted by the host (exit 143)**
  after the checks shown; every check reported here completed and printed before the
  interruption, and the batches were split precisely so an interruption could not lose a
  whole work's evidence. Checks not reached in a given run were re-run and are reported.
- No listening/audio claims arise in this batch. No production deployment was made.
