-- Seeds INDEPENDENTLY GRANTED column-level privileges on public.profiles and
-- public.ut_members, so the column-revocation path has something to act on.
--
-- Table-level privileges are withdrawn first: the point is to have column grants
-- that exist on their own, which is the only state in which a column-scoped
-- revoke is distinguishable from a table-level one.

revoke all privileges on table public.profiles   from anon, authenticated;
revoke all privileges on table public.ut_members from anon, authenticated;

grant select (email), insert (email), update (email), references (email)
  on table public.profiles to anon;

grant select (plan), update (plan)
  on table public.profiles to authenticated;

grant select (email)
  on table public.ut_members to anon;

grant references (email)
  on table public.ut_members to authenticated;
