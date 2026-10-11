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

  -- An object already carrying the expected name is NOT accepted as the
  -- required constraint. If it exists and is not exactly the index this
  -- migration creates, abort rather than build on top of an unknown object.
  declare
    existing_def text;
    existing_n   integer;
  begin
    select count(*), min(pg_get_indexdef(i.indexrelid))
      into existing_n, existing_def
      from pg_index i
      join pg_class ic on ic.oid = i.indexrelid
      join pg_namespace n2 on n2.oid = ic.relnamespace
     where n2.nspname = 'public' and ic.relname = 'ut_members_email_lower_key';

    if existing_n > 0 and existing_def not like '%lower(btrim(email))%' then
      raise exception
        'BATCH14 ABORT: an index named ut_members_email_lower_key already exists with an unexpected definition: %', existing_def;
    end if;
  end;

  raise notice 'BATCH14 preflight passed: no nulls, no case-normalised duplicates, no non-canonical addresses';
end
$batch14_preflight$;

-- ------------------------------------------------------------------- index --
create unique index if not exists ut_members_email_lower_key
  on public.ut_members (lower(btrim(email)));

-- -------------------------------------------------------------- postflight --
do $batch14_postflight$
declare
  idx_count    integer;
  idx_unique   boolean;
  idx_valid    boolean;
  idx_live     boolean;
  idx_def      text;
  idx_expr     text;
  still_dupes  integer;
begin
  -- A name is not a constraint. Assert the index is unique, valid, live, and
  -- that its expression really is lower(btrim(email)). An index left INVALID by
  -- a failed concurrent build, or one created with a different expression under
  -- the same name, must not be mistaken for the required constraint.
  select count(*) into idx_count from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_namespace n2 on n2.oid = ic.relnamespace
   where n2.nspname = 'public' and ic.relname = 'ut_members_email_lower_key';

  if idx_count <> 1 then
    raise exception 'BATCH14 ABORT: expected exactly one index named ut_members_email_lower_key, found %', idx_count;
  end if;

  select i.indisunique, i.indisvalid, i.indislive, pg_get_indexdef(i.indexrelid)
    into idx_unique, idx_valid, idx_live, idx_def
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_namespace n2 on n2.oid = ic.relnamespace
   where n2.nspname = 'public' and ic.relname = 'ut_members_email_lower_key';

  if not idx_unique then
    raise exception 'BATCH14 ABORT: the index exists but is NOT unique; the write contract would not be enforced';
  end if;
  if not idx_valid then
    raise exception 'BATCH14 ABORT: the index exists but is INVALID (a failed build leaves this state); it does not enforce anything';
  end if;
  if not idx_live then
    raise exception 'BATCH14 ABORT: the index is not live';
  end if;

  -- Compare the expression the planner recorded, not a substring of the text.
  select pg_get_expr(i.indexprs, i.indrelid) into idx_expr
    from pg_index i
    join pg_class ic on ic.oid = i.indexrelid
    join pg_namespace n2 on n2.oid = ic.relnamespace
   where n2.nspname = 'public' and ic.relname = 'ut_members_email_lower_key';

  if idx_expr is null
     or replace(idx_expr, ' ', '') not in ('lower(btrim(email))', 'lower(btrim((email)::text))') then
    raise exception 'BATCH14 ABORT: the index expression is %, not lower(btrim(email)); it does not implement the intended rule', coalesce(idx_expr, '<none>');
  end if;

  select count(*) into still_dupes
    from (select lower(btrim(email)) k, count(*) c
            from public.ut_members group by 1 having count(*) > 1) s;
  if still_dupes > 0 then
    raise exception 'BATCH14 ABORT: % duplicate group(s) remain after the index build', still_dupes;
  end if;

  raise notice 'BATCH14 postflight passed: a valid, live, unique index on lower(btrim(email)) is present';
end
$batch14_postflight$;

commit;
