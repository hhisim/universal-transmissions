# Batch 17 — Release review package

**Candidate** `adc599f34486ab32e4d1448074b73fd3c6c8825e`
**Released base** `40755e8cce2be9c04edfbe7a74794c11d0813ec2` (Batch 16 release; still production)

## Preview identity

| | |
|---|---|
| **Preview URL** | `https://universal-transmissions-1anm1il1o-hhisim-7214s-projects.vercel.app` |
| **Deployment id** | `dpl_AmTnZK6sfqG9xeFVstC1PCxJBy8Q` |
| **State** | **READY** |
| **Source SHA** | `adc599f34486ab32e4d1448074b73fd3c6c8825e` |
| **Target** | none (preview; not production) |

**Where the measurements were taken.** The acceptance run was executed against the
preview of `a7e2f10` — `dpl_AsC7o6CFaB9YjagYh89bG2RyRDpY`, READY,
`https://universal-transmissions-iscvuxtpo-hhisim-7214s-projects.vercel.app` — the tip
*including* the sandbox fix. `adc599f` adds only this document, the evidence and the
acceptance harness. That equivalence was re-checked for this package rather than asserted:

- `src` tree `5fe3bf9a4b1d` and `public` tree `0e621be6353d` are **identical** at `a7e2f10` and `adc599f`
- the candidate deployment serves the instrument bundle byte-identically to the measured
  one — `index.html`, `app.js` and `style.css` all MATCH by SHA-256
- the candidate deployment's own JS chunk carries the fix:
  `sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock allow-downloads"`

Production is **unmoved**: `dpl_4NmToJrCT55wwC4NPDJYqJ7Uudqb` (= `40755e8`) on all
canonical hosts. This batch deployed nothing to production.

## Original v7 vs hosted assets — every difference

| | |
|---|---|
| original `dist/` files (from the ZIP) | **21** |
| hosted files | **22** |
| present only in the original | **none** |
| hash differences on shared files | **none** |
| present only in hosted | **`THIRD_PARTY_NOTICES.txt`** |

The single difference is an addition: `THIRD_PARTY_NOTICES.txt` (**2715 bytes**,
sha256 `81b1521e8005d90a85bc3ce37d2b9276…`), which ships alongside `dist/` inside the
ZIP rather than inside `dist/`, and is hosted so the instrument's third-party notices travel
with it. Every one of the 21 original files is hosted **byte-for-byte**, with
relative paths and fonts intact. Hosted total 934,420 bytes against an
original dist of 931,705 bytes — the difference is exactly
that notices file.

The ZIP itself is untouched: sha256 `646365c4aa984854658c012049ee8e1f1a0f59cde6577b299358e10faaa3ceec`,
951,434 bytes, verified before and after this pass, and no instrument source file was modified.

## Results

| pass | result |
|---|---|
| 1. the real instrument — worlds, dials, navigation, both monitor modes, Sentient evolution | **54 / 54** — 0 failed |
| 2. sound and capture — synthesis, nine modes, file input, mic granted/denied, snapshot, recording | **28 / 28** — 0 failed |
| 3. shutdown and reopening — with sound, mic and a recording all live | **25 / 25** — 0 failed |
| 4. the launched mobile experience — operated at a real 390 CSS px | **29 / 29** — 0 failed |
| 5. the contextual journey — the instrument's own Oracle question | **12 / 12** — 0 failed |
| 5b. the return leg to Cymatics research (run separately) | **5 / 5** — 0 failed |
| shipped v7 tests, locked dependencies (`npm ci`) | 4 / 4 suites pass |
| `scripts/batch17-instrument-room.js` source invariants | 74 / 74 |

**Honest record of the journey run, as it happened.** The saved result is **12 assertions,
0 failed**. The process was then interrupted with **exit 143** at the final navigation —
after the evidence had already been written to disk, which is why the result survives.
Those 12 assertions cover the journey itself: the link anchor, the suggested question, the
context chip, a rendered answer, completeness, the model explanation, the limit stated, no
false claim of access to live sound or canvas, no invented sources, and a sentence boundary.

The **return leg is kept separate** deliberately: it was verified on its own as pass 5b
(**5 / 5** — 0 failed), precisely because the combined script could not be relied on to reach it on
this host. Its evidence is `evidence/f_results.json`.

Key measurements: 8 Sentient transitions over 165.1s at 3× across 3
worlds and 7 distinct patterns (Aether weave, Decagonal web, Golden interference, Harmonic diamond…); recorded audio
**−32.1 dBFS RMS**; teardown AudioContext `running`→`closed` and mic track `live`→`ended`;
**1.8 fps** measured at 390 CSS px on **software WebGL** (`ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero) (0x0000C0DE)), SwiftShader driver)`).

## The full matched Oracle question and answer

**Question** (the instrument's own suggested question, carried by the room's link):

> The instrument solves a model rather than measuring a real plate - what exactly is it solving, and where does that model stop being able to tell you about a physical plate?

**Context chip:** `SPEAKING ABOUT The Universal Resonator RESEARCH CONTEXT ← RETURN TO THE UNIVERSAL RESONATOR`

**Answer** (1920 characters, as rendered):

> YOU
> The instrument solves a model rather than measuring a real plate - what exactly is it solving, and where does that model stop being able to tell you about a physical plate?
> CODEX ORACLE · ORACLE
> This page belongs to the albedo, the whitening, where the raw matter of the Codex has been dissolved into pure syntax and only the articulate pattern remains. The Universal Resonator solves an idealised mathematical standing-wave problem for a driven plate or membrane. Given a driving frequency and idealised constraints, it computes the normal modes and the nodal structure, then renders that solution as tethered sand. The live monitor is a diagnostic of the model itself, not a photograph of a physical experiment. What appears on the screen is the structure of the model's own mathematics made visible.
> The model stops being able to tell you about a physical plate the moment the plate stops being ideal. A real sheet has inhomogeneities, varying thickness, internal stress, cracks, damping, temperature shifts, imperfect mounting, and a surrounding medium. The idealised solution assumes homogeneous material and clean boundary conditions. Where those assumptions hold, the model may resemble the principle at work. Where they fail, the pattern belongs to the model, not to the sheet. It cannot predict what any particular plate will do, and it is not an experimental result. The archive is explicit that this limit travels with the instrument. Idealised is not false, but it is not measurement.
> Chladni's and Jenny's patterns are real and reproducible in the laboratory. The instrument's rendering is a solved model, honest in its own domain. It can teach the grammar of vibration, and it can show how nodes and antinodes arise from a driven field. It cannot replace the plate. It tells you what an idealised driven medium must do; it does not tell you what an actual piece of matter will do until you measure one.

## Stated limits, preserved

- **Software WebGL only.** No GPU on this host; rendering is SwiftShader. The measured
  1.8 fps at 390 CSS px is a property of *this* environment.
- **Fake microphone.** The granted-mic path used Chromium's synthetic capture device, so it
  proves the instrument's handling of a granted or denied device — not that a real
  microphone works.
- **No listening test.** Whether any of it sounds right is unverified, and none is claimed;
  the instrument's own audio test says as much of itself.
- **No physical-phone performance evidence.** Device emulation at 390 CSS px with a fake
  touch digitiser is not a phone, and nothing here is generalised to real devices.

## Artifact mismatch found and corrected

Assembling this package surfaced one: the committed `evidence/oracle-journey.json` held an
**earlier** run's answer (3,269 characters) while `evidence/e_results.json` was from the
**final** run — two different runs presented as one result. The evidence file has been
replaced with the final run's answer (1,920 characters), so the delivered question and
answer now match the delivered result. That is the only amendment made in this pass beyond
the `allow-downloads` fix, and it was made precisely because an artifact mismatch was found.

Every other evidence file was hash-compared against the final artifacts and **matched**:
`a/b/c/d/e/f_results.json`, `evolution.json`, `webgl.json`, `mobile-perf.json`,
`v7-tests.txt`, `asset-manifest.json`. Files present locally but not previously committed
(`ASSET-COMPARISON.json`, `census.json`, `plate-modes.json`, `sound-modes.json`, the raw run
logs) have been added.

The full acceptance record also ships here as `BATCH17-ACCEPTANCE.md`.

## Contents

- `INTEGRATION-DELTA-vs-40755e8.md` — full source diff against the released base
- `evidence/ASSET-COMPARISON.json` — per-file hashes, original vs hosted, with the named difference
- `evidence/*_results.json` — each pass, assertion by assertion
- `evidence/oracle-journey.json` — the question, chip and full answer text
- `evidence/evolution.json`, `webgl.json`, `mobile-perf.json`, `v7-tests.txt`
- `logs/` — the raw run logs
- `captures/` — 40 readable captures

**Changes in this batch:** one — the `allow-downloads` sandbox fix in `ResonatorLoader.tsx`,
for a concrete visitor-facing defect found by exercising capture. Everything else is
verification. No production deployment and no unrelated changes.
