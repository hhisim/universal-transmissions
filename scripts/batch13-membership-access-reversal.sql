-- Batch 13 REVERSAL — restores the pre-migration state of these two tables.
--
-- THIS IS NOT A SAFE ROLLBACK. Applying it reintroduces:
--   * cross-member disclosure — every authenticated user can read every row of
--     public.ut_members, including stored Stripe customer identifiers;
--   * anonymous TRUNCATE — anon and authenticated regain the TRUNCATE privilege,
--     which row level security does not restrict, so either role can empty both
--     tables outright.
--
-- It exists to demonstrate that the verification harness detects the defect if
-- it returns (mutation testing), and as the literal inverse for an incident
-- where restoring prior behaviour is explicitly chosen over the security fix.

grant all privileges on table public.ut_members to anon, authenticated;
grant all privileges on table public.profiles   to anon, authenticated;

drop policy if exists "allow_authenticated_read" on public.ut_members;
create policy "allow_authenticated_read" on public.ut_members
  for select to public
  using (auth.uid() is not null);
