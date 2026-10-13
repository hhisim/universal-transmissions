# Batch 17 — the Universal Resonator as the Cymatics instrument room

Base: the accepted Batch 16 candidate `40755e8cce2be9c04edfbe7a74794c11d0813ec2`.
Release status of that base is confirmed separately (see §0). **This instrument work is
preview only** — no production website deployment.

Authoritative source: the supplied `Universal_Resonator_v7_Living_Patterns.zip`. Its
engine, visual identity, presets and creator controls are preserved as built.

---

## 0. The base's release status

`40755e8` **is live in production** as `dpl_4NmToJrCT55wwC4NPDJYqJ7Uudqb` (READY,
`target: production`, SHA pinned to `40755e8…`, all four canonical hostnames aliased —
`universal-transmissions.com`, `www.`, `.net`, `www.net`), deployed through the
established Vercel production process with the SHA pinned rather than the branch ref.

The **Oracle backend** is a separate, already-live component and is not pinned by the
website SHA. Recorded before that deployment: `synthesis.py 8e79238a…`,
`main.py 45649e50…`, `models.py cda5a1cd…`, service active and healthy (3.2.0).
It was not restarted for this batch.

---

## 1. The instrument room

A dedicated route at **`/experience/universal-resonator`**, following the existing
`/experience/*` convention in this repo rather than inventing a second one.

### The reading page starts nothing

The load-bearing claim here is negative, so it is written as such: **before launch the
page renders a panel and nothing else.** No iframe, no script tag, no preload, no
resource hint. The bundle is 960 KB of WebGL, a solver worker and a Web Audio graph, and
none of it may begin on a page whose job is reading. The prerendered HTML for the room
contains **no `<iframe>` and no reference to the bundle at all**, and the page never
calls `getUserMedia` — the microphone sits behind the instrument's own control, declared
in the frame's `allow` list and never requested from the room.

Leaving the instrument unmounts the frame, which is what tears the GL context, the
worker and the audio graph down.

### The bundle is the zip's, on our own origin

`dist/` is hosted byte-for-byte at `public/experience/universal-resonator/` — 22 files,
960 KB — with relative paths preserved (`./app.js`, `./style.css`, `./ut-logo.svg`,
`./favicon.svg`), the fifteen bundled Cinzel / Cormorant Garamond / Space Mono woff2
fonts, and `THIRD_PARTY_NOTICES.txt` (Three.js, esbuild) alongside it. Nothing is
rewritten, minified again or reimplemented, and no asset is fetched cross-origin.

---

## 2. Connected to the archive

The instrument is registered **through the existing machinery, not a parallel list**: a
`CYMATICS_CONNECTIONS` entry of `kind: "Instrument"`. It is appended last, so the six
anchors released with the Cymatics room keep their identifiers *and* their order — the
room now carries seven, and the suite asserts the released six as an ordered prefix.

Because the nexus, the room's connection surface and the Oracle anchors are all derived
from that one registry, registering it is the whole job: it appears in the Cymatics room
and in the nexus automatically, and it resolves as
`research-v1:cymatics/connection/instrument-universal-resonator` through the same
exact-key contract as every other record.

**What its grounding carries.** The room's registers, the references' `supports`
descriptions, and the model's limit — stated rather than left behind on the instrument
page: the plate is an **idealised model**, what it shows is the structure of the model's
own mathematics made visible, it is **not a physical measurement of a real plate** and
**not a prediction for any particular material**. Idealised is not the same as false;
what it prevents is the instrument being read as an experimental result.

**Navigation, explained where it cannot simply be followed.** The connection carries a
`destinationNote` saying that the room opens as a reading page and that the instrument
does not load until launched — so a visitor is never left to discover that the link
lands them somewhere the instrument is not yet running.

The chain is navigable both ways: **Cymatics → instrument → what the model solves and
where it stops → the references → the Oracle in this context → back to Cymatics and the
nexus.**

---

## 3. Checks

| check | result |
|---|---|
| `scripts/batch17-instrument-room.js` | **72 assertions, 0 failed** |
| `scripts/batch16-research-nexus.js` | **157, 0 failed** |
| `scripts/batch15-research-topology.js` | **196, 0 failed** |
| `scripts/batch17-live-verification.py` (against the preview) | see §4 |
| TypeScript project check | **0 diagnostics** |

Assertions updated rather than dropped, each encoding a real change of state:

- the Cymatics room now asserts **seven** connections, with the six released anchors as
  an ordered prefix and the instrument appended — so a future edit cannot interleave or
  rename a released anchor without failing;
- the blast-radius guard names `public/experience/universal-resonator/` as the **one**
  public/ exception, keeping the artwork-media corpus check otherwise intact;
- the instrument room route joins the list of known content destinations.

**Not re-run:** the local production build still fails on the same six env-dependent auth
pages (`/account`, `/login`, `/oracle/plans`, `/sanctum/member`, `/sanctum/orders`,
`/signup`) as documented since Batch 16 — the same six, no new ones; 197/197 other pages
prerender, including the new room.

---

## 4. Live verification

`scripts/batch17-live-verification.py` proves the negative claim **at the network
level** rather than by reading source: every request the page makes is recorded, and
before launch not one of them may touch the instrument's bundle. It then confirms that
launching really does start the engine (the frame loads, `app.js`/`worker.js`/fonts are
requested, a canvas appears inside the frame), that leaving unmounts it, that the chain
navigates both ways, that the Oracle opens with the instrument as its subject, and that
the room works at a real 390 CSS px with reduced motion honoured.

**Result: 37 assertions, 0 failed,** against the preview. The instrument runs for real in
the frame — WebGL available, three canvases live, GL driver messages in the console, and
its own interface up with the UT skin's Zalgo title and its presets
(`PLATE / CIRCLE / CYLINDER / 3D FIELD / VOLUME`, `SNAPSHOT`, `RECORD`, `IMMERSE`), i.e.
the engine and creator controls, not a stub.

Three findings from the first run, all disclosed rather than quietly fixed:

- **Two were my harness, not the site.** The "no instrument asset before launch" check
  matched Next's *own* route chunk under `/_next/static/chunks/app/experience/...`, and
  the "no canvas" check assumed zero canvases anywhere — but the UT shell draws its own
  ambient canvases site-wide (3 on `/research`, 2 on `/research/geometry`). The honest
  assertions are: no request to the hosted bundle, and no instrument frame.
- **One was a bad locator**: `frame_locator(...).locator("canvas")` never settled, while
  reaching the instrument's document directly shows three canvases and a running engine.
- The room page's console also shows pre-existing **site-wide** errors unrelated to this
  batch (a Pinterest RSS proxy fetch blocked by CORS, and a 422) — they are not
  introduced here, and are recorded rather than omitted.

Captures delivered with this batch: the reading page before launch, the launched
instrument, the Oracle in the instrument's context, and the room at 390 px.
