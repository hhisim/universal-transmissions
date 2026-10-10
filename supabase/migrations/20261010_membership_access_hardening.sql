-- ============================================================================
-- 20261010_membership_access_hardening.sql
--
-- Batch 13 — withdraw direct anon/authenticated access to the membership tables.
-- Targets ONLY public.profiles and public.ut_members in this project.
--
-- WHY
--   Every application read and write of these two tables is server-mediated
--   through the service role (src/lib/supabase.ts supabaseAdmin, and an explicit
--   service-role client in the Stripe webhook). No browser client in this
--   application queries either table; the anon browser client is used only for
--   Supabase Auth. No anonymous or authenticated reader therefore needs any
--   privilege on them.
--
--   Two independent defects are closed:
--
--   (1) public.ut_members carried a SELECT policy `allow_authenticated_read`
--       with the predicate `auth.uid() IS NOT NULL` — no ownership term. Any
--       authenticated user could read every row of the membership table.
--
--   (2) public.profiles and public.ut_members granted ALL table privileges to
--       anon and authenticated. Row level security is not the only relevant
--       control: TRUNCATE is not subject to RLS, so a role holding that
--       privilege can empty the table regardless of any policy. The same applies
--       to REFERENCES and TRIGGER. These grants come from the project's default
--       privileges for schema public, so they are the default outcome for any
--       newly created table rather than a one-off mistake.
--
--       Demonstrated scope: an isolated database session executing as anon could
--       TRUNCATE the fixture tables. No HTTP or RPC path to TRUNCATE was found
--       (see the access document); the privilege is removed because it is
--       unnecessary, not because a reachable exploit was proven.
--
-- NOT CHANGED HERE
--   * service_role keeps every privilege on both tables. It is BYPASSRLS in this
--     project, so its access rests on grants, not on the srv_* policies; the
--     policies are retained untouched.
--   * The postgres owner retains its privileges.
--   * No row, column, index, constraint, view, function, ownership or default
--     privilege is modified.
--   * The email-uniqueness defect (no unique index on either table's email) is
--     deliberately not addressed; it needs its own change.
--   * The sibling project mqixjzolgrdzbwzkrzxz (arcana-vault) is not touched.
--
-- REVERSAL
--   Re-applying the previous grants and the read policy restores cross-member
--   disclosure and the TRUNCATE privilege. That is not a neutral rollback.
-- ============================================================================

begin;

-- Fail fast rather than queue behind long-running production traffic: DROP POLICY
-- and REVOKE take ACCESS EXCLUSIVE locks on these tables. If the lock cannot be
-- taken inside the bound the whole transaction rolls back and nothing changes.
set local lock_timeout = '10s';
set local statement_timeout = '60s';

-- ---------------------------------------------------------------------------
-- 0. Preconditions. Refuse to run if the catalog does not look the way this
--    migration was written against, rather than silently doing something else.
-- ---------------------------------------------------------------------------
do $$
declare
  n int;
  bad text;
begin
  select count(*) into n
  from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind = 'r'
    and c.relname in ('profiles', 'ut_members');
  if n <> 2 then
    raise exception
      'Batch13 abort: expected both public.profiles and public.ut_members to exist as tables, found %', n;
  end if;

  select count(*) into n
  from pg_class c join pg_namespace ns on ns.oid = c.relnamespace
  where ns.nspname = 'public' and c.relkind = 'r'
    and c.relname in ('profiles', 'ut_members') and not c.relrowsecurity;
  if n <> 0 then
    raise exception
      'Batch13 abort: % of the target tables have row level security disabled', n;
  end if;

  -- If the unrestricted policy is present it must be the one this migration
  -- was written to remove. A differently-defined policy of the same name means
  -- the catalog has drifted; stop and let a human look.
  select string_agg(p.polname || ' -> ' || coalesce(pg_get_expr(p.polqual, p.polrelid), 'NULL'), '; ')
    into bad
  from pg_policy p join pg_class c on c.oid = p.polrelid
  where c.relname = 'ut_members'
    and p.polname = 'allow_authenticated_read'
    and coalesce(pg_get_expr(p.polqual, p.polrelid), '') <> '(auth.uid() IS NOT NULL)';
  if bad is not null then
    raise exception 'Batch13 abort: allow_authenticated_read has an unexpected definition: %', bad;
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 1. Remove the unrestricted authenticated read.
-- ---------------------------------------------------------------------------
drop policy if exists "allow_authenticated_read" on public.ut_members;

-- ---------------------------------------------------------------------------
-- 2. Withdraw table privileges from the unauthenticated and authenticated roles.
--    REVOKE ALL covers every privilege applicable to the running server version,
--    which includes MAINTAIN on PostgreSQL 17 and later.
-- ---------------------------------------------------------------------------
revoke all privileges on table public.ut_members from anon, authenticated, public;
revoke all privileges on table public.profiles   from anon, authenticated, public;

-- Named list as well, so the intent is auditable and a partial REVOKE cannot
-- leave a capability behind silently. MAINTAIN is deliberately not named: it does
-- not exist before PostgreSQL 17, and REVOKE ALL covers it where it does exist.
revoke select, insert, update, delete, truncate, references, trigger
  on table public.ut_members from anon, authenticated;
revoke select, insert, update, delete, truncate, references, trigger
  on table public.profiles from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Independently granted COLUMN privileges.
--    A table-level REVOKE does not remove privileges granted on individual
--    columns, and none of these tables has any today. This block removes them if
--    they ever appear, so the migration cannot be defeated by a column grant.
-- ---------------------------------------------------------------------------
do $$
declare
  r record;
  n int := 0;
begin
  for r in
    select c.relname as tbl,
           a.attname  as col,
           case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee
    from pg_attribute a
    join pg_class c on c.oid = a.attrelid
    join pg_namespace ns on ns.oid = c.relnamespace
    cross join lateral aclexplode(a.attacl) x
    where ns.nspname = 'public'
      and c.relname in ('profiles', 'ut_members')
      and c.relkind = 'r' and a.attnum > 0 and a.attacl is not null
      and (x.grantee = 0 or pg_get_userbyid(x.grantee) in ('anon', 'authenticated'))
  loop
    execute format(
      'revoke select, insert, update, references (%I) on table public.%I from %s',
      r.col, r.tbl,
      case when r.grantee = 'PUBLIC' then 'public' else quote_ident(r.grantee) end);
    n := n + 1;
    raise notice 'Batch13: revoked column privileges on public.%.% from %', r.tbl, r.col, r.grantee;
  end loop;
  raise notice 'Batch13: column-level revocations performed: %', n;
end $$;

-- ---------------------------------------------------------------------------
-- 4. Post-conditions. If any of these fail the whole transaction rolls back, so
--    a partial or ineffective application can never be committed.
-- ---------------------------------------------------------------------------
do $$
declare
  privs text[] := array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'];
  n int;
  detail text;
begin
  -- MAINTAIN exists only from PostgreSQL 17; include it where it does.
  if current_setting('server_version_num')::int >= 170000 then
    privs := privs || 'MAINTAIN';
  end if;

  select count(*), string_agg(rr.rolname || '|' || t.tablename || '|' || p.priv, ', ')
    into n, detail
  from (values ('anon'),('authenticated')) rr(rolname)
  cross join (values ('profiles'),('ut_members')) t(tablename)
  cross join unnest(privs) p(priv)
  where has_table_privilege(rr.rolname, 'public.' || t.tablename, p.priv);
  if n > 0 then
    raise exception 'Batch13 verification failed: table privileges still held: %', detail;
  end if;

  select count(*), string_agg(c.relname || '.' || a.attname, ', ')
    into n, detail
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace ns on ns.oid = c.relnamespace
  cross join lateral aclexplode(a.attacl) x
  where ns.nspname = 'public' and c.relname in ('profiles', 'ut_members')
    and a.attnum > 0 and a.attacl is not null
    and (x.grantee = 0 or pg_get_userbyid(x.grantee) in ('anon', 'authenticated'));
  if n > 0 then
    raise exception 'Batch13 verification failed: column privileges still held: %', detail;
  end if;

  select count(*) into n from pg_policies
  where schemaname = 'public' and tablename = 'ut_members'
    and policyname = 'allow_authenticated_read';
  if n <> 0 then
    raise exception 'Batch13 verification failed: the unrestricted read policy is still present';
  end if;

  -- service_role is BYPASSRLS here, so its access depends on these grants.
  select count(*) into n
  from (values ('profiles'),('ut_members')) t(tablename)
  cross join unnest(array['SELECT','INSERT','UPDATE','DELETE']) p(priv)
  where has_table_privilege('service_role', 'public.' || t.tablename, p.priv);
  if n <> 8 then
    raise exception
      'Batch13 verification failed: service_role lost access (expected 8 privileges, found %)', n;
  end if;

  raise notice 'Batch13: post-conditions satisfied on PostgreSQL %',
    current_setting('server_version');
end $$;

commit;
