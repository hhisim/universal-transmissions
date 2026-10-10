# Batch 10 — Access-depth promise reconciliation (review document, NOT shipped copy)

Baseline: `faf329078bc5556bbbe0ba8c39370ed8ef7fd1b4`
Branch: `omni/access-depth-copy-20261010`
Scope: copy only. No billing, entitlement, auth, DB, corpus, ID, backend, media or API changes.

This document holds the future ideas and the deferred work. Purchase copy ships only what is
verified true today.

---

## 1. The decisive implementation findings

### 1.1 The tier is pinned — `const [tier] = useState("guest")`, no setter

`src/app/oracle/page-client.tsx:924`

```ts
const [tier] = useState<"guest" | "free" | "initiate">("guest");
```

Destructured **without a setter** and never assigned anywhere in the repo. `grep -rn "setTier"` over
`src` returns only `setPlan` in `/oracle/plans`, which is a different, unrelated page state.

Consequence: **every visitor is permanently `guest`** for the life of the component. The Free and
Initiate branches of the tier badge are unreachable code.

### 1.2 There is no server-side enforcement at all

`src/app/api/oracle/route.ts` contains **no** plan / limit / quota / tier / entitlement / rate check.
The only `grep` hits for those words in that file are the words "resolvable" and "deliberately" inside
prose comments. No other route handler enforces a quota either.

The counter is therefore **cosmetic**: `questionsUsed` starts at `0` in component state, is never
persisted (there is **no `localStorage`** anywhere in `page-client.tsx`), and increments only via
`setQuestionsUsed((q) => q + 1)` after a successful answer. It resets to 0 on every page load, and it
never reaches the limit in ordinary use.

### 1.3 The corpus is already fully open to everyone

`OracleCorrespondenceDock.tsx` imports `@/lib/codex-data` directly, with **no auth guard** on the
component or on `/experience/correspondence-continuum`. Every visitor can browse all 27 systems and
all 824 records today.

Verified in the live product (Batch 9, production): a guest reached gold → 48 of 462 matches,
progressive reveal to all 462, and DEITIES → CRYSTALS returning exactly 51 records, with no
account.

### 1.4 Codex II is the one real gated surface

`src/app/sanctum/member/codex-ii/page.tsx` genuinely redirects unauthenticated visitors and branches
on `isPaid` for the paid body. This is the **only** promised capability with working enforcement, and
it is enforcement by route, not by a quota.

---

## 2. Promise → implementation table

| # | Promise (current copy) | Where | Implementation | Status |
|---|---|---|---|---|
| 1 | "10 questions total. No account needed." | `plans.ts:26` | `dailyLimit: 10`, client-only | **unverified / cosmetic** — no server gate, resets per load |
| 2 | "25 questions per day. Create an account to unlock more." | `plans.ts:32` | `dailyLimit: 25` | **unavailable** — tier pinned to guest |
| 3 | "Unlimited questions. All languages, all Oracle modes." | `plans.ts:39` | `dailyLimit: 'unlimited'` | **unavailable** — tier pinned to guest |
| 4 | "Guest · {n}/10 today" / "Free · {n}/25 today" / "Initiate · Unlimited" | `page-client.tsx:117,138,159`; `oracle-v2/page.tsx:41,74,107` | renders `tier` | **misleading** — only the Guest string can ever render |
| 5 | "Daily limit reached. Create a free account for 25/day." | `page-client.tsx:1629` | `atLimit` branch | **unreachable** — requires `questionsUsed >= 10` in one page session |
| 6 | Guest is a "corpus-limited explorer… a very small number of advanced actions" | `page.tsx:252` | — | **inaccurate** — corpus is fully open; limits do not exist |
| 7 | Free gets "more entries unlocked, bookmarks, and a few deeper reveals / resonance actions" | `page.tsx:258` | bookmarks: 0 impl hits outside copy | **unimplemented** |
| 8 | Initiate gets "unlimited node opening, synthesis depth, saved trails, private archive access" | `page.tsx:263` | savedTrail/saveTrail: **0 hits** | **unimplemented** (private archive = Codex II is real) |
| 9 | "Initiate: full matrix access, unlimited deep reveals, resonance, synthesis, saved trails" | `experience/correspondence-codex/page.tsx:28` | — | **unimplemented** |
| 10 | "Guest: … teaser-state corpus access, and a small number of real interactions" | `experience/correspondence-codex/page.tsx:26` | — | **inaccurate** — no teaser state exists |
| 11 | "open a limited set of entries… Free expands depth and saved pathways. Initiate unlocks the full matrix and unlimited synthesis" | `experience/correspondence-continuum/page.tsx:28` | — | **unimplemented / inaccurate** |
| 12 | "Guests should feel the real world with limited reveals and compares… Initiate unlocks the full correspondence matrix, synthesis depth, and member archive." | `sanctum/member/page.tsx:563` | — | **inaccurate** (member archive = Codex II, real) |
| 13 | "Unlimited Access" badge on every Experience tool | `sanctum/member/page.tsx:608` | static string in `EXPERIENCE_TOOLS` map | **misleading** — tools are the same pages every visitor already has |
| 14 | "Codex II + Private Archive", "Ask Hakan", "Bookmarks / favorites", "full deep synthesis" | `oracle/plans/page.tsx:18,24,45,62,64,82` | Codex II: real. Ask Hakan / bookmarks / synthesis: 0 impl hits | **mixed** — Codex II real, the rest unimplemented |
| 15 | "Your Oracle access is now unlimited." | `account/page.tsx:142` | static copy | **unverified** — no server limit exists to lift |

---

## 3. What is actually true today, stated plainly

- Every visitor — signed out — can browse **all 27 systems and all 824 records**, run Oracle answers,
  search, reveal, Inspect, and use EN/TR/RU.
- Questions are **not limited in any enforced sense**. There is no server quota and no persistent
  counter.
- An account exists and works, and **Initiate does gate the Codex II archive** by route.
- Languages (EN/TR/RU) and Oracle modes are available to every visitor today, so they are not a
  paid differentiator and must not be sold as one.

---

## 4. Copy dispositions applied

Replaced with verified descriptions, keeping UT's voice. No invented replacement benefits, and no
cosmetic counter described as an enforced limit.

| Surface | Before | After |
|---|---|---|
| Homepage Guest | "A visually complete but corpus-limited explorer…" | "Everything the correspondence codex holds — all 27 systems, all 824 records — open to read without an account." |
| Homepage Free | "The same world, broader access: … bookmarks, and a few deeper reveals" | "The same access, plus an account: your membership is recognised when you return, and Initiate opens the Codex II archive." |
| Homepage Initiate | "The full correspondence matrix: unlimited node opening, synthesis depth, saved trails, private archive access…" | "Initiate adds the Codex II archive — behind-the-scenes process material held for members. The correspondence codex itself stays open to everyone." |
| `plans.ts` Guest | "10 questions total. No account needed." | "The full correspondence codex and the Oracle, no account needed." |
| `plans.ts` Free | "25 questions per day. Create an account to unlock more." | "The same open access, with an account that recognises your membership." |
| `plans.ts` Initiate | "Unlimited questions. All languages, all Oracle modes." | "Adds the Codex II archive. All languages and Oracle modes stay open to everyone." |
| Oracle tier badge | "Guest · {n}/10 today" | "Correspondence codex — open to all" |
| Oracle limit warning | "Daily limit reached. Create a free account for 25/day." | removed (unreachable; counter is not an enforced limit) |
| codex / continuum / sanctum descriptions | corpus-limited / teaser-state / deeper-only-for-paid | open-corpus description, Codex II named as the member gate |
| plans page features | bookmarks, saved trails, Ask Hakan, synthesis depth | removed from purchase copy; retained here |

---

## 5. Deferred — explicitly out of scope for Batch 10

1. **Implement** the question counter the copy used to imply, or delete the tier concept. Requires
   entitlement work; not authorised.
2. **Assign `tier`** from a real session, with server-side enforcement, before any per-tier copy ships.
3. **Build** bookmarks, saved trails, Ask Hakan and synthesis if they are to be sold.
4. **Lexicon consistency** — the localisations use "Misafir", "Ücretsiz" and "Гость"; the revised
   English strings are longer, and TR/RU equivalents were composed mechanically. **A native reader
   must confirm them.**
5. `/oracle/plans` still renders plan feature matrices from `plans.ts`; its `$3.99` price, Stripe
   price id and checkout links are untouched.
6. Codex II is a genuinely paid surface and its own copy is **accurate** — left alone deliberately.