# Tao Oracle — answer-cutoff repair and truncation flag

Service: `tao-oracle-api.service` (`/opt/tao_oracle`, uvicorn on **0.0.0.0:8001**)
Reason: answers reaching visitors cut off mid-sentence.
Applied: 2026-10-13. This file is the durable record; it is not generated.

## Files and hashes

| file | sha256 |
|---|---|
| `app/synthesis.py` **before** (kept as `app/synthesis.py.bak-cutoff-20261013-203449`) | `e950fb07fe7830e65ddf68507a218c289019977c3444641500438b6191adc602` |
| `app/synthesis.py` after the budget + `finish_reason` repair (batch 16b) | `53fa8960f6b96d3e67d2bd70addeb12fcfb26c05d5637eecee4c4475f1b6a322` |
| `app/synthesis.py` **after** the truncation flag (batch 16 acceptance) | `8e79238ad1a9da8f1f6569f826a4f83494174992067d319655f726600f002373` |
| `app/main.py` **after** | `45649e506ba64baa064b84dcf6e909016544b4612b1783b6b12ef9830ee56329` |
| `app/models.py` **after** | `cda5a1cd1f5ccf594d8744cbb609c561aa698775b25c7b5209658de2a97c8dd3` |

Verify with `sha256sum app/synthesis.py app/main.py app/models.py`.

Rollback: restore the `.bak-cutoff-*` file over `app/synthesis.py` and restart. The
backup predates both the timeout and the flag work.

## What was wrong

`codex` ran with `max_tokens = 1400`. The primary hop (`deepseek-v4.1-flash`) emits a
`reasoning_content` chain of thought billed from the **same** `max_tokens` pool, so on
a grounding-heavy question the reasoning could consume the entire budget. Only **empty**
content was retried; `finish_reason` was never read. The retry then ran at 4096, which
also capped — and the capped fragment was returned to the visitor as if complete.

Measured against the live provider on the real grounding:

| budget | finish_reason | completion tokens | reasoning | content |
|---|---|---|---|---|
| 1400 | `length` | 1400 | 1400 | **0 chars** (empty → triggered the old retry) |
| 4096 | `length` | 4096 | 3806 | **1251 chars, cut mid-sentence** |
| 8192 | `stop` | 4192 | 3660 | 2456 chars, complete |
| 16384 | `stop` | 3294 | 2732 | 2693 chars, complete |

Live effect before the repair: 1 of 4 responses to the same question ended mid-sentence
at 2,771 characters. After: 0 of 6.

## What it does now

1. **`max_tokens = 8192` for the `codex` pack** (was 1400); other packs unchanged at 900.
   The cap bills only what is generated, so a larger ceiling does not by itself cost more.
2. **`finish_reason` is read.** On `"length"`, the hop retries once at
   `max(max_tokens * 2, 16384)` instead of passing the fragment through.
3. **The capped case is no longer silent.** If the retry *also* reaches its limit — or
   the retry yields nothing and the fragment is all there is — then:
   - `_state["truncated"] = True` is set;
   - `AskResponse.answer_truncated` is `True`;
   - `/chat` returns `"answer_truncated": true`;
   - `/chat/stream` carries `answer_truncated` on its `done` event;
   - `/ask` carries it via the response model;
   - and the answer text itself ends with
     `— this answer was stopped by a length limit before it finished.`

   So a fragment cannot be mistaken for a completed answer by any consumer, including
   one that ignores the flag. Ordinary answers carry neither the flag nor the marker.

Verified offline by `test_finish_reason_handling.py` (16 assertions, stubbed provider)
covering: a normal answer; capped-then-finished; capped-then-capped (**flagged**);
capped-then-empty (**flagged**); flag and marker present on the response object; and no
marker on an ordinary answer.

## Scope of the change

**Correction to an earlier claim.** "Production untouched" was true of the *website
deployment* only — no release was made. It was **not** true of the Oracle service. These
callers all reach this port, so the repair is live in production:

| caller | backend |
|---|---|
| `universal-transmissions.com/api/oracle` (production) | `ORACLE_BACKEND_URL = http://204.168.154.237:8001` |
| `/api/oracle-v2` (production) | same env var |
| `/api/codex-oracle` (all environments) | hardcoded `http://204.168.154.237:8001/chat` |
| preview deployments | no env var set → default `http://204.168.154.237:8001` |
| tao_oracle Telegram bot | `http://127.0.0.1:8001` |

Vault of Arcana runs its **own** `synthesis.py` under `vault-of-arcana-api.service` on
8002 and is **not** affected.

## Restart history

- 2026-10-13 ~20:35 UTC — restart to apply the budget + `finish_reason` repair.
- 2026-10-13 ~21:0x UTC — restart to apply the truncation flag and the visible marker;
  health checked after each (`{"status":"healthy","version":"3.2.0"}`).
