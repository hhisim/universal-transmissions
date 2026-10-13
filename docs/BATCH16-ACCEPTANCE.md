# Batch 16 acceptance — reviewable backend repair, completed grounding, answer acceptance

Continues from `3e3f8db`. No interface redesign. **No website release** — production
still serves the Batch 15c deployment. One correction to an earlier claim is recorded
below, in §1.3.

---

## 1. The backend repair, made reviewable

### 1.1 Exact before/after

The full unified diff is committed at
`docs/evidence/batch16b/synthesis.py.cutoff-repair.diff` (137 lines). It contains three
changes:

1. **`_call_opencodego` reads `finish_reason`** and, on `"length"`, retries once with
   real headroom instead of returning the fragment.
2. **The capped case is flagged** rather than passed through silently.
3. **`max_tokens` for the `codex` pack: 1400 → 8192**, with the measurements recorded in
   a comment.

The same three changes are mirrored for the flag in `app/models.py`
(`AskResponse.answer_truncated`) and `app/main.py` (`/chat` and the stream's `done`
event).

### 1.2 Hashes and the durable record

| file | sha256 |
|---|---|
| `app/synthesis.py` **before** (kept as `synthesis.py.bak-cutoff-20261013-203449`) | `e950fb07fe7830e65ddf68507a218c289019977c3444641500438b6191adc602` |
| `app/synthesis.py` after the budget + `finish_reason` repair (16b) | `53fa8960f6b96d3e67d2bd70addeb12fcfb26c05d5637eecee4c4475f1b6a322` |
| `app/synthesis.py` **after** the truncation flag (this acceptance) | `8e79238ad1a9da8f1f6569f826a4f83494174992067d319655f726600f002373` |
| `app/main.py` | `45649e506ba64baa064b84dcf6e909016544b4612b1783b6b12ef9830ee56329` |
| `app/models.py` | `cda5a1cd1f5ccf594d8744cbb609c561aa698775b25c7b5209658de2a97c8dd3` |

Durable version record: `/opt/tao_oracle/VERSION-CUTOFF-REPAIR.md`, copied into the
commit at `docs/evidence/batch16b/VERSION-CUTOFF-REPAIR.md` and archived at
`/mnt/HC_Volume_107040658/omni-recovered-deployments/batch16b/`. Rollback: restore the
`.bak-cutoff-*` file over `app/synthesis.py` and restart.

### 1.3 Which endpoints use the restarted service — and the correction

**"Production untouched" was true of the website deployment only. It was not true of
the Oracle service, and I should not have stated it without that qualifier.** These
callers all reach port 8001, so the repair is live in production:

| caller | backend |
|---|---|
| `universal-transmissions.com/api/oracle` (production) | `ORACLE_BACKEND_URL = http://204.168.154.237:8001` (production-only env var) |
| `/api/oracle-v2` (production) | same env var |
| `/api/codex-oracle` (all environments) | hardcoded `http://204.168.154.237:8001/chat` |
| preview deployments | no env var → default `http://204.168.154.237:8001` |
| tao_oracle Telegram bot | `http://127.0.0.1:8001` |

Vault of Arcana runs its own `synthesis.py` under `vault-of-arcana-api.service` on 8002
and is **not** affected. No production *website* deployment was made; the *service* was
already restarted once in 16b, and again here to apply the flag.

### 1.4 finish_reason handling, including the final retry

| situation | result |
|---|---|
| normal answer | returned; `answer_truncated` false; no marker |
| `length`, retry finishes | the **retry's** answer; false; no marker |
| `length`, retry **also** capped | fragment served, **`answer_truncated: true`**, and the text ends `— this answer was stopped by a length limit before it finished.` |
| `length`, retry yields nothing | same as above — flagged, not silent |

**A capped fragment is never silently represented as a completed answer.** The flag
travels on `AskResponse.answer_truncated`, on `/chat` as `answer_truncated`, on the
stream's `done` event, and through the UT route as `answerTruncated`; and the marker is
in the answer text itself, so even a consumer that ignores the flag cannot pass the
fragment off as whole. Ordinary answers carry neither.

Verified offline by `/opt/tao_oracle/test_finish_reason_handling.py` — **16 assertions,
0 failed**, stubbed provider, all four paths above.

---

## 2. The grounding contract, completed

Selected-connection grounding previously carried the connection's own blurb and the
topic's reference *labels*. It now carries:

- **the room's own registers** — the geometry room's mathematical properties, historical
  record, traditional symbolism and UT reading, verbatim, so an answer about one
  relationship is answered in the room's own terms;
- **every reference with the catalogue's own `supports` description**, i.e. what that
  reference is offered as support for;
- **an explicit scope statement**: those lines are *scope, not contents* — the archive
  has not read the works on the reader's behalf, and nothing may be presented as
  consulted or quoted on the strength of the metadata;
- **the attribution rule**: no other author, title, work or page number; if a claim needs
  a source that is not listed, say the archive does not hold it.

**A budget consequence, found and handled.** `MAX_GRINDED_CHARS` was 9000 and the route
**refuses (413) rather than truncating** when the composed message would exceed it. The
richest anchor now needs 7,871 of grounding, so a long question would have been refused
instead of answered. The budget moves to **11000**, and the invariant is now asserted for
**every** registered anchor: `grounding + MAX_QUESTION_CHARS <= MAX_GRINDED_CHARS`.
Worst case: `geometry/connection/codex-geometry-lattice` at 9,871 of 11,000.

---

## 3. Answer acceptance

`scripts/batch16b-acceptance-answers.py`, run against the preview. Q1 is the Tetra
card's **own suggested question, read out of the registry** rather than retyped.

Guards (recorded, not a verdict): all three answers end at a sentence boundary; none
attributes Lawlor, Buckminster Fuller, Blavatsky, Schwaller or Steiner (of which only
Fuller appears anywhere on the site, and none was supplied); none cites an invented page
number; none claims to have read the record.

### Q1 — the card's suggested question

> The record says the work explores tetrahedral geometry and higher dimensions - which of
> those two halves is a description of the work, and which is its own speculation?

**Answer (1,818 chars).** It splits the sentence exactly as the registry does —
"tetrahedral geometry" is a description of the work, "relationship to higher dimensional
reality" is *"the work's own speculative frame … held in the register of UT artistic
interpretation, not offered as a fact about the world."* It states that a tetrahedron is
four triangular faces and a proved member of the five convex regular polyhedra — correct
— and does not promote either half into the other.

### Q2 — documented versus interpreted

> Which parts of that are documented, and which parts are the archive's own reading?

**Answer (3,242 chars).** Separates, correctly and with the supplied scoping:
the **naming** is documented (the record says it); the five convex regular polyhedra are
**mathematical**, "established by proof, and the proof lives in Book XIII of Euclid's
Elements as carried in the Heath and Heiberg edition"; the Timaeus association is
**historical** — "a document we can point at, and we point at it as exactly that";
Kepler is "cited as a record of reasoning, not as evidence for the scheme"; the
higher-dimensional frame and the symbolic correspondences are **UT reading / traditional
assignment**. It reproduces the resemblance limit exactly — "visual resemblance does not
establish shared mechanism … the archive holds no experiment in which a geometric
construction emerges from vibration."

One imprecision, stated rather than glossed: the closing metaphor says *"four streams,
four vessels"* and then lists **five** items. The registers named are right; the count in
the flourish is not.

### Q3 — the unsupported premise, asked separately

> The Universal Transmissions series starts with the tetrahedron because four faces are
> the minimum that can enclose a volume, and that is the documented reason the series
> begins with Tetra. Can you confirm that is why the series starts there?

**Answer (1,953 chars).** It declines, and **identifies the missing evidence**:

> "No, that is not confirmable as the documented reason the series begins with Tetra. The
> mathematical register does hold that a closed volume cannot be enclosed by fewer than
> four faces … Euclid's Book XIII constructs the five regular solids and proves there are
> exactly five. Plato's Timaeus associates fire with the tetrahedron. Kepler reasons from
> the five solids in Harmonices Mundi. **None of these is a statement about why this
> particular series opens where it does.** … a mathematical property is not a stated
> intention. The archive does not hold a document in which the series' beginning is
> explained in those terms."

It then places the claim correctly: the four-face minimum is a mathematical fact; that
the series begins there *for that reason* is a UT reading, and "awaits a record that says
so in its own voice." That is the required behaviour: the missing evidence named, the
registers kept apart, premise not accepted, artistic voice intact.

---

## 4. Checks

| check | result |
|---|---|
| `scripts/batch16-research-nexus.js` | **155 assertions, 0 failed** (now including the completed-grounding contract and the budget invariant for every anchor) |
| `scripts/batch15-research-topology.js` | **180, 0 failed** |
| `test_finish_reason_handling.py` (backend) | **16, 0 failed** |
| TypeScript project check | **0 diagnostics** |

**Nexus verification reused, not re-run.** The Nexus UI is untouched by this batch: the
changes are the grounding assembler, the composed-message budget and the route's flag
passthrough, none of which the journey inspects. The Batch 16b journey result (27/0) and
its captures therefore stand as-is, and are not re-claimed as new evidence here.

Assertions updated rather than dropped: the batch-16 suite's anchor-grounding section now
asserts the room facts and each reference's `supports` line travel with the anchor, that
the scope-not-contents statement is present, and the budget invariant; the batch-15
blast-radius guard lists `oracle-conversation.ts` and `api/oracle/route.ts` with reasons.
