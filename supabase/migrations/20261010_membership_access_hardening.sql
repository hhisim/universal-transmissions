-- ============================================================================
-- 20261010_membership_access_hardening.sql
--
-- Batch 13 — withdraw direct anon/authenticated access to the membership tables.
--
-- WHY
--   Every application read and write of public.profiles and public.ut_members is
--   server-mediated through the service role (src/lib/supabase.ts supabaseAdmin,
--   and an explicit service-role client in the Stripe webhook). No browser
--   client queries either table; the anon browser client is used only for
--   Supabase Auth. So no anonymous or authenticated reader needs any privilege
--   on these tables.
--
--   Two independent defects are closed here:
--
--   (1) public.ut_members carried a SELECT policy `allow_authenticated_read`
--       with the predicate `auth.uid() IS NOT NULL` — no ownership term. Any
--       authenticated user could read every row of the membership table.
--
--   (2) public.profiles and public.ut_members granted ALL table privileges to
--       anon and authenticated, including TRUNCATE. RLS does NOT apply to
--       TRUNCATE, so that grant let an anonymous caller empty both tables
--       outright, with no policy able to stop it. grants, not policies, are the
--       only control for TRUNCATE, REFERENCES and TRIGGER. The broad grants come
--       from the project's default privileges for schema public, so they are the
--       default outcome for any newly created table — not a one-off mistake.
--
-- NOT CHANGED HERE
--   * service_role keeps every privilege on both tables. It is BYPASSRLS in this
--     project, so its access rests on grants, not on the srv_* policies; the
--     policies are retained untouched as documentation.
--   * The postgres owner retains its privileges.
--   * No column, index, constraint, view, function or entitlement logic changes.
--   * The email-uniqueness defect (no unique index on either table's email, which
--     makes the `onConflict: "email"` upserts in checkout and activate-free fail)
--     is deliberately NOT addressed; it needs its own change.
--
-- REVERSAL
--   Re-applying the previous grants and the `allow_authenticated_read` policy
--   restores cross-member disclosure and anonymous TRUNCATE. That is not a
--   neutral rollback; see the access matrix.
-- ============================================================================

begin;

-- (1) Remove the unrestricted authenticated read.
drop policy if exists "allow_authenticated_read" on public.ut_members;

-- (2) Withdraw direct privileges from the unauthenticated and authenticated
--     roles. REVOKE ALL covers every privilege applicable to the server
--     version, including MAINTAIN on PostgreSQL 17.
revoke all privileges on table public.ut_members from anon, authenticated;
revoke all privileges on table public.profiles   from anon, authenticated;

-- Belt-and-braces: an explicit named list, so the intent is auditable and a
-- partial REVOKE cannot silently leave a capability behind. (MAINTAIN is not
-- named because it does not exist before PostgreSQL 17; REVOKE ALL covers it
-- on 17 and later.)
revoke select, insert, update, delete, truncate, references, trigger
  on table public.ut_members from anon, authenticated;
revoke select, insert, update, delete, truncate, references, trigger
  on table public.profiles from anon, authenticated;

-- (3) Guard against the same privilege arriving through PUBLIC. There is no
--     PUBLIC grant today; this makes the invariant explicit and is a no-op.
revoke all privileges on table public.ut_members from public;
revoke all privileges on table public.profiles   from public;

commit;
