-- Batch 14 — reversal of the ut_members address-uniqueness backstop.
--
-- This is NOT a dangerous reversal: dropping the index removes a data-integrity
-- guard, it does not restore any disclosure or destructive privilege. The
-- application repair stands on its own, because the writers read first and then
-- insert or update explicitly rather than relying on a conflict target.
--
-- Dropping the index does re-open the possibility of two rows sharing one
-- address, which would make member lookups ambiguous, so it is a loss of
-- integrity rather than a restoration of safety.

begin;
drop index if exists public.ut_members_email_lower_key;
commit;
