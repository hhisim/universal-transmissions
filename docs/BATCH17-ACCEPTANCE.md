# Batch 17 — instrument acceptance

Continuation from `d7c7e62e6234c44867ef072cef92dd37393167fb`. The implemented room, its
on-demand loading and its research links are kept as they were. **Preview only.** This
pass exercises the instrument and changes nothing except a defect it found (see §2).

**Verification identity.** Everything below was measured against the preview
`https://universal-transmissions-iscvuxtpo-hhisim-7214s-projects.vercel.app`, built from
`a7e2f10` — the tip *including* the sandbox fix. The delivered tip `93250fb` adds only
this document, the evidence and the harness: its `src` and `public` trees are byte-identical
to `a7e2f10` (`5fe3bf9a4b1d` / `0e621be6353d`), so the results apply to it exactly.
Separately, the **production website remains `dpl_4NmToJrCT55wwC4NPDJYqJ7Uudqb`** (the
Batch 16 release) on all canonical hosts; this batch deployed nothing.

Scope limit stated up front, because it bounds every claim below: this VPS has **no GPU
and no sound card**, and the checks run in headless Chromium. Rendering is therefore
**software WebGL** (SwiftShader) in every measurement here, and "how it sounds" is not
answered — the instrument's own audio test says as much about itself: *"Audio
routing/scheduling checked with an AudioContext mock; listening test still needed."*
Nothing here is generalised to physical phones, real GPUs or real listening.

---

## 0. Results at a glance

| pass | result |
|---|---|
| **1. the real instrument** — worlds, dials, navigation, both monitor modes, Sentient evolution | **54 / 54** |
| **2. sound and capture** — synthesis, nine modes, file input, mic granted/denied, snapshot, recording | **28 / 28** |
| **3. shutdown and reopening** — with sound, mic and a recording all live | **25 / 25** |
| **4. the launched mobile experience** — operated at a real 390 CSS px | **29 / 29** |
| **5. the contextual journey** — the instrument's own Oracle question and back | **14 / 14** |
| **6. the shipped v7 tests**, locked dependencies (`npm ci`) | **4 / 4 suites pass** |
| `scripts/batch17-instrument-room.js` (source invariants) | 74 / 74 |
| `scripts/batch17-live-verification.py` (loading + navigation) | 37 / 37 — reused unchanged |

Three findings came out of this pass: **one real defect, fixed** (the sandbox blocked the
instrument's own downloads — §2); **one assertion of mine that was simply wrong** about
what Chromium promises (§3); and **one false positive in my own check**, where a correct
Oracle answer was flagged for a phrase it was entitled to use (§5). The instrument itself
required no change.

---

## 1. The real instrument, exercised

Run as `a_worlds_params.py` — **54 assertions, 0 failed.**

**The named worlds.** Prism, Monsoon, Lotus and Temple were each selected and left to
settle. Every one drives the model (its own space/M:N/sound mode) and renders a field, and
they are not the same model under four names. Switching world visibly changes the field:
pixel deltas of **9.14** (Prism→Monsoon), **12.18** (Monsoon→Lotus), **8.10**
(Lotus→Temple) on canvas captures taken through the compositor.

**Frequency and interference.** The frequency dial moved the engine (528 → 396 Hz) and the
field changed with it. Interference was then swept `0.05 → 1.0` in six steps and sampled
at each: every step changed the field (**1.81, 6.50, 4.86, 6.56, 5.52** mean luminance
delta) and no step jumped — the largest single step is well inside the smallest total
change, i.e. the control is continuous rather than a jump cut. The model reported the
value it was given.

**Navigation.** Dragging orbits (measured change), scrolling zooms (measured change), and
**Reset view** returns the camera to a comparable framing (delta 14 → back to baseline
range). IMMERSE toggles the immersive state: `body.immersed` set, the restore control
revealed, and it can be left again.

**Both monitor modes.** The plate monitor offers exactly two modes — *Source plate /
membrane* and *Actual 3D section at local Z* — and they are genuinely different
computations, not one view relabelled. Each renders live content and reports its own
readout:

- source: `CHLADNI SOURCE / 3.14 : 1.86`
- section: `VOLUME SECTION · Z 0.00 / 2.81 : 1.86`

Moving **Section position** to 0.55 changes the solved section (measured), the monitor can
be enlarged (`⛶`) and closed (`×`). Note the instrument only computes monitor previews
while the monitor is visible, which is a real efficiency choice, not a defect.

**Sentient evolution, long enough to see multiple transitions.** Observed for **165.1 s**
at pace 3× (measured **8.16 s per arc**, matching the documented 7–10 s). In that window:
**8 distinct state changes** across **3 worlds** (Prism, Monsoon, Lotus) and **7 distinct
pattern destinations** — Golden interference, Pentagonal current, Decagonal web, Aether
weave, Harmonic diamond, Sevenfold veil, Ninefold corona. Transitions glide (m and n move
through fractional values such as `m6.885 n3.481` rather than snapping), radiance stayed
inside its stated **0.2–0.7** band throughout, and grain size stayed **at or below 1.0**.

---

## 2. Sound and capture

Run as `b_sound_capture.py`.

**Synthesized sound.** Synthesis runs, the source is the built-in synthesizer, all **nine**
sound modes are offered and engage, and the instrument reports a live fundamental
(`528 Hz / FUNDAMENTAL`).

### A real defect found, and fixed

Exercising capture found something reading the code would not have: **Snapshot and Record
produced nothing at all inside the integrated room.** The instrument toasted *"Snapshot
saved."* and the visitor received no file.

The instrument saves both by synthesising an `<a download>` click, and the frame's sandbox
listed `allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock` — but
**not `allow-downloads`**. A sandboxed frame without it builds the blob and discards it.

Established by A/B, not inference: the **identical bundle** served top-level from the same
origin downloads the PNG normally, while the same bundle inside this iframe produced no
download event at all. The bundle, its capabilities (`captureStream`, `MediaRecorder`,
vp9/vp8/webm/mp4 all supported) and its recording path were all sound. **The sandbox was
the cause.**

Fix: `allow-downloads` added to the sandbox and nothing else, with the reason recorded in
the source. Two assertions added to `scripts/batch17-instrument-room.js`, one of which
also holds the sandbox back from gaining `allow-modals`, `allow-top-navigation` or
`allow-presentation`.

### After the fix

- **PNG snapshot:** a real 1232×900 image, ~0.77 MB, 54% lit pixels — the rendered field,
  not a blank frame.
- **Recording:** a real file (`vp9` video + `opus` audio at 48 kHz, 1232×900, ~340 KB).
  Inspected externally with `ffprobe`/`ffmpeg` rather than trusted: the recorded audio
  measures **−32.1 dBFS RMS**, so it is real signal and not silence.

Two honest caveats on the recording, both measured rather than assumed:

- The **WebM container reports a duration of 0.00 s**. `MediaRecorder` does not write a
  usable duration, so length is measured by decoding the audio instead, which is how the
  playable length is established.
- The **video stream carries very few frames** (~5 packets). `captureStream` only emits a
  frame when the canvas is redrawn, and this software rasteriser redraws rarely. That is a
  property of the headless environment, not a claim about a GPU-backed browser.

**Local audio file.** A local WAV was loaded; the source becomes `file`, the instrument
names the file it loaded, playback continues, and the file is referenced as a `blob:` URL
— it stays on the device.

**Microphone — granted.** With a device present the instrument connects it, the source
becomes `mic`, and the button offers to disconnect. **What is proven is the instrument's
handling of a granted device**: Chromium was given a *fake* capture device, so this is not
evidence that a real microphone works.

**Microphone — denied.** With permission withheld: **no live capture track exists**, the
instrument does not present itself as listening, and it reports the denial honestly —
*"Microphone access is unavailable or was declined. You can use an audio file instead."* —
with the connect button still offering to connect.

One observation, not a defect and deliberately not "fixed" (the brief says preserve the
engine): the source selector sets the `mic` source flag **the moment it is chosen**, before
any device exists, so an internal `source: 'mic'` can coexist with no track. The
visitor-facing behaviour is honest; the assertion therefore tests for a live track rather
than for the flag.

**Unsupported / not verified:** whether any of it *sounds* right. No listening test is
possible here, and none is claimed.

---

## 3. Shutdown and reopening

Run as `c_shutdown.py`. The brief says iframe absence is not the complete assertion, so
this does not stop there.

The instrument is same-origin, which allows a stronger test: **the parent page holds
references to the instrument's own `AudioContext` and `MediaStreamTrack` objects across
the removal**, then reads their state afterwards. A DOM node disappearing proves nothing;
a context the parent still holds going `closed` and a track going `ended` proves the
browser released the devices.

**Leaving with everything running** — sound playing, microphone connected, a recording in
progress:

| before exit | after exit |
|---|---|
| `AudioContext: running` | **`closed`** |
| mic track: `live` | **`ended`** |
| recorder: `recording` | never delivered a file |
| frame attached | detached; realm unreachable |
| heartbeat advancing | **frozen** (26 → 26 over 4 s) |

So capture, audio and background computation all stop — evidenced by the resources
themselves, not by the element going away. Note the recording in progress **delivering no
file** is itself evidence: the recorder died with the realm instead of finishing.

**A mechanism worth recording:** removing a frame destroys its realm **without** running
the unload sequence — Chromium fires no `pagehide` for it — so the instrument gets no
cleanup callback at all. It does not need one: the browser releases the devices anyway, as
measured above. My first version asserted a `pagehide` callback would fire; that asserted a
mechanism the browser does not promise, and it was the assertion that was wrong.

**Reopening.** A fresh instrument comes up, starts clean (`source: synth`, not still
listening or recording), computes again, and has a **new** `AudioContext` reaching
`running` — a fresh realm rather than a revival. Its worker exchanges messages again.

---

## 4. The launched mobile experience

Run as `d_mobile.py` at a **real 390 CSS px** viewport (`innerWidth === 390`, dpr 3, touch
enabled, no horizontal overflow).

**Operated, not merely launched.** The launch control was scrolled to and tapped. The
instrument then uses its **mobile grain budget of 24,000**. All five core controls
(`topPlay`, `sentient`, `capture`, `record`, `immersive`, `plateToggle`) are present,
laid out and reachable without horizontal scrolling, and the deeper dials are reachable
too — `modeM`, `interference`, `hue`, `sectionPosition`, `evolutionSpeed`. One-finger drag
orbits the view and two-finger pinch changes it (measured deltas), the 2D monitor is
accessible and inside the viewport, sound engages, the solver updates its readout
(`LIVE 3.67 : 2.90`), and **exit** returns to the reading page.

**Measured performance: ~1.8 fps** (11 animation frames over a 6 s window) inside the
instrument's own realm.

**Renderer: software WebGL — `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)),
SwiftShader driver)`.** There is no GPU on this host. The 1.8 fps is a measurement of
*this* environment and is **not** a statement about a physical phone, which has a GPU, a
different compositor and a real touch digitiser. Conversely, nothing here should be read as
evidence that the instrument performs well on a phone. It is evidence that it *operates* at
390 CSS px.

---

## 5. The contextual journey

Run as `e_oracle_journey.py`. The instrument was left **running with sound** before the
Oracle was opened, so "does not claim access to the visitor's live sound or canvas" is a
real test: there was live sound and a live canvas to wrongly claim.

The room's Oracle link carries the instrument's anchor, and its own suggested question:

> *"The instrument solves a model rather than measuring a real plate — what exactly is it
> solving, and where does that model stop being able to tell you about a physical plate?"*

The Oracle opens with the instrument as its subject — `SPEAKING ABOUT The Universal
Resonator · RESEARCH CONTEXT ← RETURN TO THE UNIVERSAL RESONATOR` — and answers at length
in the artistic voice. It explains the model (idealised plate, nodal structure, 2D source
vs 3D/section), distinguishes documentation from interpretation, cites nothing it was not
given, and states the limit in the instrument's own terms: *"it is not a physical
measurement, it is not a prediction for any particular sheet of material you could hold."*

**It does not claim to perceive the visitor's running instrument.** A first pass flagged
*"the moment your plate departs from the ideal"* — and that flag was wrong. The sentence is
second-person about a **hypothetical** plate, and the sentence after it denies predictive
power over any such plate; banning words rather than the claim would have failed a correct
answer. The check was tightened to perception verbs and the visitor's live session
artefacts (`your live sound/audio/canvas`, `your microphone/mic/recording/session`): six
patterns, **zero matches**.

**The check that had to be rewritten twice — and what that says.** I also required the
answer to *state the model's limit*, so that avoiding banned words without saying anything
could not pass. My first version looked for the sentence *"not a physical measurement"*.
Three independent runs each stated the limit correctly, in three different phrasings:

> *"it is not a measurement of any physical plate and not a prediction for any particular
> sheet you could hold in your hands. It is an idealised construction, solved faithfully"*

> *"so the field it yields is the structure of its own mathematics made visible… Take it as
> a prediction for a particular plate and it will fail you, because it was never measuring
> anything"*

> *"Its honesty ends where its assumptions end, and the ornament of meaning placed upon it
> must be recognised as human placement"*

A literal phrase list failed two of those three. The test was rewritten to check the
**senses** the answer must convey — that the model is idealised or built on stated
assumptions; that solving the model is contrasted with measuring a real object; and that
the answer locates where the model stops applying — rather than any sentence it must
contain. That rubric accepts all three real answers and would still fail one that dodged
the limit. This is Batch 16's own lesson applied to generated prose: **keyword checks are
not a quality verdict**, and a test fitted to one output is not a test.

**The answer delivered with this batch** is the final saved run's (a fourth phrasing, and
the strongest of them), in `evidence/oracle-journey.json`:

> *"The Universal Resonator solves an idealised mathematical standing-wave problem for a
> driven plate or membrane… The live monitor is a diagnostic of the model itself, not a
> photograph of a physical experiment."*
>
> *"The model stops being able to tell you about a physical plate the moment the plate stops
> being ideal… It cannot predict what any particular plate will do, and it is not an
> experimental result. The archive is explicit that this limit travels with the instrument.
> Idealised is not false, but it is not measurement."*

**One artifact mismatch was found while assembling the release package and corrected.**
The committed `evidence/oracle-journey.json` still held an *earlier* run's answer (3,269
characters) while `evidence/e_results.json` was from the final run — two runs' evidence
presented as one. The file was replaced with the final run's answer (1,920 characters), so
the delivered question-and-answer now matches the delivered result. No other evidence file
was affected: every other result, log and data file was hash-verified against the final
artifacts and matched.

Worth stating plainly, since it is the strongest thing this pass found: the Oracle
answered its own instrument's question well and consistently. It explained what is solved
(normal modes of a driven idealised plate or membrane), what is not (grain, thickness,
temper, damping, coupling), separated observation from analogy and this project's symbolic
tone assignments from evidence — *"assignment, not evidence"* — and refused to let the
result stand as a measurement of anything physical.

The journey returns to research: back at `/research/cymatics` with the instrument still
part of the room.

---

## 6. The shipped v7 tests, with locked dependencies

`npm ci` (locked via `package-lock.json`), then the project's own `npm run check`, `npm
test` and `npm run quality` — Node v18.19.1. **All four shipped suites pass:**

- `evolution.test.mjs` — 20 minutes of evolution, radiance/grain limits, continuous pitch
  and mode boundaries, manual hold, finite volume-to-Lotus morph
- `audio.test.mjs` — 100 uninterrupted oscillator updates, 18-second overlapping fades,
  nine sound worlds, cleanup on expiry and pause *(with its own caveat that a listening
  test is still needed)*
- `physics.test.mjs` — analytic gradients exact; sand coherence after 36 s of drift
- `v7.test.mjs` — four world changes in two minutes, distinct pattern destinations, bounded
  smooth modal steps, overlapping geometry, bidirectional circles, exact high-mode
  plate/section preview, focus controls, continuous morph domain

The **original ZIP is untouched** — its SHA-256 before and after this pass is
`646365c4aa984854658c012049ee8e1f1a0f59cde6577b299358e10faaa3ceec` (951,434 bytes).

---

## 7. Delivery

Committed under `docs/` — the review package carries the same artifacts as a single archive.

- **Integration source delta** — `evidence/batch17/INTEGRATION-DELTA.md`, and
  `INTEGRATION-DELTA-vs-40755e8.md` for the diff against the released base specifically
- **Asset hash manifest** — `evidence/batch17/asset-manifest.json`, with the original-vs-hosted
  comparison in `evidence/batch17/ASSET-COMPARISON.json`: the **21** files of the ZIP's
  `dist/` are hosted **byte-identical** (zero hash differences), plus the notices file that
  lives outside `dist/` in the ZIP; 22 files, 934,420 bytes
- **Results** — `evidence/batch17/{a,b,c,d,e,f}_results.json`, plus `evolution.json`,
  `webgl.json`, `mobile-perf.json`, `oracle-journey.json`, `census.json`, `plate-modes.json`,
  `sound-modes.json`, `v7-tests.txt`, and the raw run logs in `evidence/batch17/logs/`
- **Captures** — in the review package's `captures/`: worlds, immersive, both monitor modes,
  microphone granted/denied, snapshot, recording frame, before/after teardown, mobile, and
  the Oracle answer

Changes made in this pass: **one** — the `allow-downloads` sandbox fix, for a concrete
visitor-facing failure found by exercising capture. The only later amendment was the
evidence mismatch corrected in §5, made when the release package was assembled. Everything
else is verification.

No pricing, paywalls, billing, memberships, SQL, backend changes or production deployment.
