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
| 14 | "Codex II + Private Archive", "Ask Hakan", "Bookmarks / favorites", "full deep synthesis" | `oracle/plans/page.tsx:18,24,45,62,64,82` | Codex II: real (23 images on disk, gated `PLAN_CHECK=["initiate"]`). Ask Hakan: **real** — live send path, see §6. Bookmarks / synthesis: 0 impl hits | **mixed** — Codex II and Ask Hakan real; bookmarks, saved trails, synthesis, matrix-depth unimplemented |
| 15 | "Your Oracle access is now unlimited." | `account/page.tsx:142` | static copy | **unverified** — no server limit exists to lift |

---

## 3. What is actually true today, stated plainly

> **Correction (this revision).** An earlier pass of this document reported "zero stale claims"
> across the checked surfaces. **That was wrong**: `/oracle/plans` still advertised
> "Ask Hakan priority channel" and "Full matrix traversal, synthesis, saved trails, and
> member tools" for Initiate at $3.99/month. The zero-stale finding applied to the homepage,
> Oracle and experience surfaces only — **not** to the purchase page, which was audited
> but not corrected in that pass. It has now been corrected; see §6 and §7.

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
| Oracle limit warning | "Daily limit reached. Create a free account for 25/day." | removed (unreachable) |
| Question allowance wording | implied a daily/paid quota | "this session" — a **client-enforced counter for the current page session**, not a server-enforced entitlement. Behaviour unchanged. |
| codex / continuum / sanctum descriptions | corpus-limited / teaser-state / deeper-only-for-paid | open-corpus description, Codex II named as the member gate |
| plans page features | bookmarks, saved trails, synthesis depth, tier-exclusive matrix depth | removed from purchase copy; retained here |
| plans page features | Ask Hakan | **kept** — it is implemented; only the *priority* claim was removed |

---

## 5. Deferred — explicitly out of scope for Batch 10

1. **Implement** the question counter the copy used to imply, or delete the tier concept. Requires
   entitlement work; not authorised.
2. **Assign `tier`** from a real session, with server-side enforcement, before any per-tier copy ships.
3. **Build** bookmarks, saved trails and synthesis if they are to be sold. Ask Hakan is built
   (`POST /api/member/message` — see §6); it needs no build work, only honest copy.
4. **Lexicon consistency** — the localisations use "Misafir", "Ücretsiz" and "Гость"; the revised
   English strings are longer, and TR/RU equivalents were composed mechanically. **A native reader
   must confirm them.**
5. `/oracle/plans` still renders plan feature matrices from `plans.ts`; its `$3.99` price, Stripe
   price id and checkout links are untouched.
6. Codex II is a genuinely paid surface and its own copy is **accurate** — left alone deliberately.

---

## 6. Initiate → Codex II / Ask Hakan: the paid linkage, traced

Three distinct evidence classes are kept separate below. **No purchase, subscription,
authenticated browser session or test email was performed.**

| Class | What it covers | What it cannot prove |
|---|---|---|
| **Code inspection** | webhook branch logic, `isPaid` predicates, route guards, the message send path | that any of it executes at runtime |
| **Live configuration read** | Vercel env targets, Stripe price object (active/$3.99/month), registered webhook endpoint + enabled events, Supabase rows | that a payment has ever completed through the flow |
| **Browser verification** | anonymous and 390px rendering of public copy; redirect behaviour | any paid or signed-in state |

### 6.1 Does checkout charge the advertised price?

| Step | Evidence | Result |
|---|---|---|
| CTA | `oracle/plans/page.tsx:354` "Upgrade to Initiate — $3.99/mo" → `handleInitiateCheckout` | — |
| Price id read | `api/billing/checkout/route.ts:28` `process.env.NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY` | — |
| Price id in **production** env | Vercel project env, target `production` + `preview` | present |
| That price in Stripe | `active: true`, **$3.99**, `recurring.interval: month` | **matches the advertised price** |
| Stripe secret key scope | Vercel env targets: `production` and `preview` both set | usable in production |
| Local `.env.local` price id | **inactive, $8.00** — a stale dev value, NOT the live price | do not trust for local runs |

### 6.2 Does a successful purchase flip the `isPaid` gate?

| Step | Evidence | Result |
|---|---|---|
| Webhook registered | `we_1TjG7KD1VUXAFjstpShNUDvo` status **enabled** → `/api/stripe-webhook` | live |
| Events subscribed | `checkout.session.completed`, `customer.subscription.created/updated/deleted` | correct set |
| Signature verification | `constructEvent` + `STRIPE_WEBHOOK_SECRET` (set for `production`) | present |
| Plan written | route writes `plan` to **both** `ut_members` and `profiles` | yes |
| Plan decision | `if (subscription.status === "active" \|\| "trialing") plan = "initiate"` | **status-based, not price-based** |
| `planFromPriceId` used? | `plans.ts` exports it; **the webhook never imports it** | **unused** |
| Gate reads | `codex-ii/page.tsx:29` — `const plan = profile?.plan || member?.plan`, then `page.tsx:30` — `const isPaid = plan && PLAN_CHECK.includes(plan)` with `PLAN_CHECK = ["initiate"]`. It consumes the value the webhook wrote: the webhook updates `profiles.plan` **and** `ut_members.plan` in the same handler, and this predicate reads `profiles.plan` first, falling back to `ut_members.plan`. Same column name, same literal `'initiate'`. | both tables, single source of truth is `profiles.plan` |
| Gate value | `PLAN_CHECK = ["initiate"]` on `codex-ii`, `gallery`, `exclusive` | exact match |

So the chain **is** complete in source: purchase → `checkout.session.completed` → subscription active
→ `plan='initiate'` written to `profiles` **and** `ut_members` → `isPaid` true → Codex II renders.

### 6.3 Does the archive material actually exist?

| Check | Evidence | Result |
|---|---|---|
| Images referenced | `CodexIIClient.tsx` maps **23** entries → `/images/codex2/page-*.jpg` | 23 |
| Images on disk | `public/images/codex2/` | **23** — all present, none missing |
| Images served | `GET /images/codex2/page-151.jpg` on production | **HTTP 200** |
| Video payload | `exclusive/CodexIIExclusiveClient.tsx`: 0 `<video>`, 0 YouTube/Vimeo, 0 `.mp4/.webm`, 0 iframes | **none** |
| Exclusive entries | 6 metadata records (`video-1`…`notes-2`) with titles/durations, no media | listed only |

### 6.4 What this does **not** prove

- **Zero subscriptions have ever been created on the production $3.99 price**, so no payment has
  traversed this path end-to-end. The webhook logic is correct by inspection; it has not been
  observed firing for a real purchase.
- The `isPaid` branches were never rendered in a browser as a paying member.
- **The images are not actually protected.** They live in `public/`, so
  `/images/codex2/*.jpg` is readable by anyone with the URL. The *route* is gated; the *files*
  are not. Copy must not imply the imagery is unavailable to non-members.
- The webhook grants `initiate` for **any** active subscription on **any** price in the account
  (there are 10 active monthly prices, $3.99–$29). Not price-scoped. Any future product must not
  assume `plan='initiate'` means only this offer.
- `POST /api/member/message` **does not authenticate** and reads `plan` from the request body, so
  the "priority" star is self-declared. It is cosmetic in the email only; the tab itself is gated
  by `isPaidPlan(profile.plan)` on the client. Only the email's priority marker is decorative —
  but the copy no longer promises priority.

---

## 6.5 Three unresolved defects (NOT fixed in this batch — code changes, not copy)

**1. `POST /api/member/message` is unauthenticated and trusts a client-supplied plan.**
The route reads `plan` from the request body, performs no token or session verification, and
has no plan check of its own; the “priority” star in the outgoing email is decided by that
self-declared string. Anyone who can reach the endpoint can post an arbitrary email body. The
member tab's UI gate (`isPaidPlan(profile.plan)` in `sanctum/member/page.tsx`) hides the form in
the browser but **does not protect the endpoint** — a direct `POST` bypasses it entirely.

**2. The webhook grants `initiate` for any active subscription, with no price-specific mapping.**
`src/app/api/stripe-webhook/route.ts` branches on `subscription.status === 'active' ||
'trialing'` only. The account holds 10 active monthly prices ($3.99–$29). `planFromPriceId()`
exists in `src/lib/plans.ts` and is **never imported by the webhook**. Any future Stripe product
therefore also grants Initiate.

**3. The Codex II archive images are publicly accessible.**
All 23 files live in `public/images/codex2/`, served as static assets — verified HTTP 200 on
production. The route is gated; the files are not. Nothing in copy may describe them as private,
protected or unavailable to non-members.

All three are out of scope for a copy batch and are recorded here for a separate fix.

---

## 7. Corrections applied in this revision

| Surface | Before this revision | Now |
|---|---|---|
| Homepage heading | "One World · Three Depths" | "One World · Shared Archive" |
| Homepage intro | "…how deeply each person can traverse, compare, save, and synthesize it." | "The correspondence archive is open to everyone. Search its symbols, follow connections, and bring a selected record into conversation with the Oracle." |
| Homepage Free card | implied saved exploration / extra allowance | "Create an account while keeping the same open access to the correspondence archive." |
| Plans — Ask Hakan card | removed in error | **restored**, reworded: "Write directly to Hakan from the member hub. Replies arrive by email." |
| Plans — Initiate features | "Ask Hakan priority channel", "Full matrix traversal, synthesis, saved trails, and member tools" | "The Codex II process archive: 23 pages of Codex II imagery" + "Ask Hakan — write directly from the member hub" + "Every correspondence system and record, open as before" |
| Plans — Guest / Free features | "limited correspondence exploration", "Bookmarks / favorites", "small allowance of resonance / reveal actions", "corpus depth is limited" | open-archive rows + "10 questions per page session" |
| Plans — signed-in banner | "Unlimited Oracle access, the full portal, and direct member privileges." | "The Codex II archive and Ask Hakan are open, alongside the correspondence archive everyone can use." |
| Plans FAQ | "Ask Hakan priority lane", "unlimited Oracle use", "Oracle usage … remains limited" | names Codex II + Ask Hakan; states the archive stays open to all |
| Member hub locked screen | "Priority Channel — Paid Members", "he responds at priority … deeper private process archive" | "Message Channel — Initiate Members", "replies arrive by email" |
| Codex II exclusive page | "Long-form videos, personal notes, and process materials that exist nowhere else." + "6 materials · Videos · Notes · Deep Cuts" | "A working list … the recordings themselves are not published yet" + "6 entries · listed, not yet published" |

| Homepage Initiate card | “Initiate adds the Codex II archive — the behind-the-scenes process material held for members” | “Initiate adds the Codex II process archive, plus Ask Hakan — write directly from the member hub.” |
| Plans page narrative | “UT membership is not just Oracle credits … correspondence depth, private archive access, orders … Initiate unlocks how deeply they can traverse and synthesize it.” | The supplied replacement introduction, verbatim |
| Plans Initiate feature | “The Codex II process archive: 23 pages of Codex II imagery” | “The Codex II process archive: Codex II process imagery” — **the 23 files are square 1000×1000 / 1200×1200 web exports named `page-151`…`page-173`, not 23 scanned pages**, so the count claim was dropped |
| Plans member-experience card | “Codex II + Private Archive” / “page imagery from the published Codex II volume” | “Codex II Process Archive” / “The Codex II process archive: Codex II process imagery.” |
| Plans Guest + Free feature | “Oracle answers grounded in the correspondence archive” | “Ask the Oracle about selected correspondence records.” — the verified entry-grounding journey |
| Plans signed-in “Current Plan” | “Free Account — 25 questions/day” / “Guest — 10 questions total” | “Free Account” / “Guest” — the allowance numbers described a quota that does not exist |
| Plans anonymous banner | listed “Codex II archive, Experience Portal, and direct member communication” | the open-archive + Initiate introduction |
| Plans Ask Hakan card | “Replies arrive by email.” | “Replies, if any, arrive by email.” — no guarantee of a reply |
| Member hub locked screen | promised “full non-timelapse long-form recordings … not available anywhere on the internet” | states the archive holds process imagery and that longer recordings are listed but **not yet published** |
| codex-ii route locked copy | “This collection is reserved for Initiate members” | “An Initiate membership is required to open this page” — describes the route gate, not file protection |
| `src/lib/plans.ts` header comment | claimed “Free: 25 questions/day (Supabase per-user counter)” | records that `dailyLimit` is **not server-enforced** and that the only real limit is the client-side per-page-session counter |

**Preserved unchanged:** `$3.99`, `priceSub`, every `cta`/`ctaHref`, `handleInitiateCheckout`,
`NEXT_PUBLIC_STRIPE_PRICE_INITIATE_MONTHLY`, `dailyLimit`/`guestTotalLimit` values, the 10-question
`atLimit` gate, `isPaidPlan`, `PLAN_CHECK`, all `src/app/api` code, the corpus, all public IDs, and
global CSS. Only copy strings and one label were touched.
---

## 8. Counter-unit verification (Batch 10 follow-up, verified live)

**Released SHA checked:** `5eb3c01` — **verdict: the counter measures QUESTIONS, one per
answered question. The "0 → 2" reading in the release report is a reporting mistake; the code is correct.**

Source: `src/app/oracle/page-client.tsx`

```
 923|  const [questionsUsed, setQuestionsUsed] = useState(0);
 935|  const atLimit = questionsUsed >= limit;
1124|    setQuestionsUsed((q) => q + 1);     // the ONLY increment site
```

It is not derived from `msgs.length`. Each question appends TWO messages (user at 1055,
oracle at 1123), so a message-based counter would advance by 2. It advances by 1.

Observed live at universal-transmissions.com/oracle, provider mocked so no real requests were spent:
`0/10` initial → **`1/10` after exactly one question** → `2/10` after a second →
NEW CONVERSATION → **`2/10` unchanged** (transcript cleared, quota not restored) →
reload → **`0/10`** → … → `10/10` → 11th attempt **blocked** (no increment, no POST,
`textarea.disabled === true`).

Resets only on page load: no `localStorage`/`sessionStorage` anywhere in `page-client.tsx`,
and `startNewConversation()` deliberately leaves `questionsUsed` untouched.

**Copy correction** (copy only — quota, history, reset and entitlement logic untouched):
`plans/page.tsx` line 403 said "Each **message** you send to the Oracle counts as one".
The word *message* named a unit that does not exist. Replaced with wording that states the
real unit, that the count lands once the answer arrives, and that New Conversation does not
restore the allowance. Line 404 (reload resets the session) was verified correct and is
unchanged. The Oracle badge, its limit banner and the EN/TR/RU equivalents already say
"questions" and are accurate — left alone.

New SHA `e05fd4b`, preview verified in the rendered DOM.
