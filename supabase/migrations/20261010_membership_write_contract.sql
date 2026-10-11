-- Batch 14 — membership write contract: address uniqueness backstop
--
-- Scope: public.ut_members ONLY.
--
-- Why only ut_members:
--   * ut_members.email is NOT NULL and its primary key is a generated uuid, so
--     an application row is insert-complete and the address is the de facto
--     identity used by every caller (checkout, webhook, plan-status, member).
--   * public.profiles is keyed by user_id (uuid NOT NULL, no default) while
--     every handler looks it up by email, and only 11 of its 19 deployed rows
--     carry a user_id that exists in auth.users. That table's identity contract
--     is genuinely ambiguous, so no uniqueness constraint is added to it here.
--     See docs/BATCH14-MEMBERSHIP-WRITE-CONTRACT.md.
--
-- Why this is a functional index on lower(btrim(email)) and not UNIQUE(email):
--   The handlers normalise the address with lower(trim()) before writing, and
--   two of them historically compared with different casing. A case-sensitive
--   constraint would allow "A@x.com" and "a@x.com" to coexist while the
--   application treats them as one member. This index makes the database agree
--   with the application.
--
--   After the Batch 14 repair NO handler uses a PostgREST conflict target any
--   more: the writers read first and then insert or update explicitly. So no
--   `onConflict: "email"` target has to match this index. If a future caller
--   wants `on_conflict=email`, it needs a plain `UNIQUE(email)` column index
--   instead, because ON CONFLICT inference cannot target an expression index.
--
-- This migration changes no rows, no columns, no ownership and no policies.
-- It is idempotent. It aborts rather than guessing when existing data would be
-- incompatible.

begin;

-- Bounded waits: this is a metadata/index build, so it must not sit behind a
-- long-running transaction indefinitely.
set local lock_timeout = '10s';
set local statement_timeout = '120s';

-- ---------------------------------------------------------------- preflight --
do $batch14_preflight$
declare
  dup_groups   integer;
  dup_rows     integer;
  drift_rows   integer;
  null_rows    integer;
begin
  -- Every existing row must be present, because the index is built over the
  -- whole table and a NULL would only be tolerated, not verified.
  select count(*) into null_rows
    from public.ut_members where email is null;
  if null_rows > 0 then
    raise exception
      'BATCH14 ABORT: ut_members.email is nullable in this database but % row(s) are NULL; the write contract assumes a present address', null_rows;
  end if;

  -- Case-normalised duplicates would make the new index impossible to create.
  -- Report the shape of the conflict, never the addresses themselves.
  select count(*), coalesce(sum(c), 0) into dup_groups, dup_rows
    from (select lower(btrim(email)) k, count(*) c
            from public.ut_members
           where email is not null and btrim(email) <> ''
           group by 1 having count(*) > 1) s;
  if dup_groups > 0 then
    raise exception
      'BATCH14 ABORT: % case-normalised duplicate group(s) covering % row(s) exist in ut_members; resolve the identity conflict before applying this migration',
      dup_groups, dup_rows;
  end if;

  -- Rows whose stored address is not already in canonical form would not be
  -- found by a normalised lookup, so the application could create a second row
  -- for the same person once uniqueness is enforced.
  select count(*) into drift_rows
    from public.ut_members
   where email is not null and email <> lower(btrim(email));
  if drift_rows > 0 then
    raise exception
      'BATCH14 ABORT: % ut_members row(s) store a non-canonical address (not lower(btrim(email))); normalise or accept them explicitly before enforcing uniqueness', drift_rows;
  end if;

  raise notice 'BATCH14 preflight passed: no nulls, no case-normalised duplicates, no non-canonical addresses';
end
$batch14_preflight$;

-- ------------------------------------------------------------------- index --
create unique index if not exists ut_members_email_lower_key
  on public.ut_members (lower(btrim(email)));

-- -------------------------------------------------------------- postflight --
do $batch14_postflight$
declare
  idx_present boolean;
  still_dupes integer;
begin
  select exists (
    select 1 from pg_indexes
     where schemaname = 'public'
       and tablename = 'ut_members'
       and indexname = 'ut_members_email_lower_key'
  ) into idx_present;
  if not idx_present then
    raise exception 'BATCH14 ABORT: the uniqueness index was not created';
  end if;

  select count(*) into still_dupes
    from (select lower(btrim(email)) k, count(*) c
            from public.ut_members group by 1 having count(*) > 1) s;
  if still_dupes > 0 then
    raise exception 'BATCH14 ABORT: % duplicate group(s) remain after the index build', still_dupes;
  end if;

  raise notice 'BATCH14 postflight passed: ut_members enforces case-insensitive address uniqueness';
end
$batch14_postflight$;

commit;
