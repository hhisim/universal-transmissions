# Universal Transmissions Rebuild / Fix Implementation Plan

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** Turn Universal Transmissions into a coherent, production-safe membership + experience platform with unified navigation, gating, billing, member access, research interlinking, and stable Oracle/Codex/Continuum experiences across desktop and mobile.

**Architecture:** Consolidate all site chrome and entitlement logic into shared layers instead of page-local duplication and ad hoc fetches. Treat `/sanctum/member` as the single membership hub, `/api/billing/*` + `/api/stripe-webhook` as the canonical subscription pipeline, `/api/session` + Supabase as the canonical session bridge, and Oracle/Codex/Continuum as product surfaces consuming one shared entitlement model.

**Tech Stack:** Next.js App Router, React, TypeScript, Supabase, Stripe, serverless API routes, Vercel.

---

## Current context / assumptions

- Working repo: `/home/prime/.openclaw/workspace/universal-transmissions`
- Root layout currently renders shared `<Navigation />` and `<Footer />`
- Many individual pages also render `<Navigation />` and `<Footer />`, causing duplicate site chrome
- Stripe is present in this repo for product checkout and subscriptions, but the membership UX and entitlement model are inconsistent
- UT appears to use its own Supabase project; do **not** merge with Vault of Arcana data or assumptions
- Existing membership surfaces/routes already exist and should be preserved where possible:
  - `/oracle`
  - `/oracle/plans`
  - `/sanctum/member`
  - `/sanctum/orders`
  - `/experience/correspondence-codex`
  - `/experience/correspondence-continuum`
  - `/experience/cymatic-tonoscope`
  - `/experience/cymatic-3d`
  - `/research/*`
- User priorities from chat:
  - unified gating for Oracle / Correspondence Codex / Continuum / Codex II / Ask Hakan
  - lighter gating for mobile Codex than desktop Continuum
  - mobile-friendly light Oracle page
  - plans page must sell portal/member experience, not just Oracle
  - research pages need enrichment and cross-links
  - double footer must be fixed
  - Correspondence Codex loading problem must be fixed
  - backend parity: Correspondence Codex should use same backend family as UT Oracle

---

## Route inventory and target behavior

### Public discovery / core brand
- `/`
- `/origin`
- `/about`
- `/gallery`
- `/gallery/[slug]`
- `/gallery/prismatic`
- `/gallery/bio-energetic-vortexes`
- `/journal`
- `/journal/[slug]`
- `/store`
- `/store/[slug]`
- `/newsletter`
- `/connect`
- `/privacy`

### Research
- `/research`
- `/research/cymatics`
- `/research/linguistics`
- `/research/symbolism`
- `/research/geometry`

### Oracle / membership acquisition
- `/oracle`
- `/oracle-v2`
- `/oracle/plans`
- `/signup`
- `/login`
- `/account`
- `/member` -> `/sanctum/member`

### Membership / experience portal
- `/sanctum`
- `/sanctum/member`
- `/sanctum/orders`
- `/sanctum/success`
- `/sanctum/[slug]`
- `/experience/correspondence-codex`
- `/experience/correspondence-continuum`
- `/experience/cymatic-tonoscope`
- `/experience/cymatic-3d`

---

## Shared architecture target

### A. Single site chrome owner
**Canonical owner:** `src/app/layout.tsx`

Rules:
- root layout owns global `<Navigation />` and `<Footer />`
- regular pages must not render page-local nav/footer duplicates
- exceptions only via dedicated nested layout if a route truly needs a custom shell

### B. Single session / entitlement pipeline
**Canonical path:**
- client auth state -> `src/app/api/session/route.ts`
- membership data -> `ut_members` in UT Supabase
- Oracle profile enrichment -> `profiles` when needed
- billing state -> Stripe customer/subscription IDs stored in `ut_members`

### C. Single billing pipeline
**Canonical paths:**
- `src/app/api/billing/session/route.ts`
- `src/app/api/billing/checkout/route.ts`
- `src/app/api/stripe-webhook/route.ts`
- `src/lib/stripe.ts`

### D. Single experience-gating model
Create one shared helper layer used by:
- `/sanctum/member`
- `/oracle`
- `/experience/correspondence-codex`
- `/experience/correspondence-continuum`
- Ask Hakan / Codex II surfaces

### E. Product-surface split
- **Correspondence Codex** = mobile-friendly, lighter, easier/free access
- **Correspondence Continuum** = desktop/laptop oriented, advanced, more restrictive
- **Oracle** = full immersive desktop surface + separate lightweight mobile surface

---

## Implementation phases

## Phase 1 — Structural integrity and obvious UX defects
1. Add regression check for duplicate site chrome in `scripts/check-no-duplicate-site-chrome.mjs`
2. Remove duplicate nav/footer from route pages because root layout already owns them
3. Normalize metadata/base URLs in `src/app/layout.tsx`

## Phase 2 — Session, membership, and gating foundation
4. Audit and centralize session source of truth in `src/app/api/session/route.ts`, `src/lib/auth.ts`, `src/lib/supabase*.ts`, and middleware
5. Create `src/lib/entitlements.ts`
6. Add reusable gate UI components for locked / free / paid states

## Phase 3 — Stripe and membership sync
7. Normalize Stripe membership products/prices separate from one-time store products
8. Harden `/api/billing/checkout`
9. Harden `/api/billing/session`
10. Harden `/api/stripe-webhook`
11. Separate one-time orders from subscription/member state in Sanctum

## Phase 4 — Oracle / Codex / Continuum architecture
12. Unify backend family for Oracle + Codex (`/api/oracle`, `/api/oracle-v2`, `/api/codex-oracle`)
13. Fix Correspondence Codex loading state with timeout/error fallback
14. Add desktop warning + mobile fallback CTA to Continuum
15. Build lightweight mobile Oracle route
16. Reduce heavy background/effects on mobile

## Phase 5 — Membership portal content and route coherence
17. Rewrite plans page around the full member experience
18. Strengthen `/sanctum/member` as the true portal hub
19. Formalize Ask Hakan/member messaging as first-class feature

## Phase 6 — Research enrichment and cross-linking
20. Turn research hub into a real discovery funnel
21. Add coming-soon cards for Tonoscope + 3D Cymatic Engine
22. Add Codex/Continuum demo cards to linguistics/symbolism/geometry
23. Cross-pollinate research, gallery, journal, store, Oracle, and Vault of Arcana links

## Phase 7 — Contact and newsletter reliability
24. Verify `/api/newsletter` end-to-end
25. Verify `/connect` + `/api/contact` end-to-end

---

## Validation strategy
- `node scripts/check-no-duplicate-site-chrome.mjs`
- `npm run build`
- route-by-route smoke checks on `/oracle`, `/oracle/plans`, `/sanctum/member`, `/sanctum/orders`, `/experience/*`, `/research/*`, `/connect`, `/newsletter`
- Stripe checks for checkout, webhook sync, and one-time order preservation

---

## Recommended execution order
1. Fix duplicate site chrome
2. Stabilize session and entitlement model
3. Harden billing/webhook/member sync
4. Fix Codex loader and Continuum warnings
5. Build mobile Oracle
6. Rewrite plans and member portal
7. Enrich research/interlinking
8. Final contact/newsletter hardening

---

## First executable task
**Start with the double-footer/double-nav regression and fix.** It is confirmed by code inspection, visible to users immediately, low-risk, and establishes the shared-layout rule the rest of the rebuild depends on.
