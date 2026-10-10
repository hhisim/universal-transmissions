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
-- VERSION NOTE
--   MAINTAIN exists only from PostgreSQL 17. Every privilege list here is built
--   at run time and extended with array_append, never with the `||` operator:
--   `text[] || 'MAINTAIN'` is parsed as anyarray || anyarray and fails with
--   "malformed array literal", which would abort this migration on PostgreSQL 17
--   while passing unnoticed on 16.
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
--    which includes MAINTAIN on PostgreSQL 17 and later. It also removes
--    column-level grants of the same name, since revoking a table-level
--    privilege revokes the corresponding column privileges.
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
-- 3. Independence for column-level grants.
--    Table-level REVOKE does remove column privileges of the same name, so this
--    block is defence in depth rather than the primary mechanism: it exists so a
--    column grant cannot survive if that behaviour is ever relied on incorrectly.
--
--    It is written as REVOKE ALL PRIVILEGES (col) ON TABLE ... deliberately.
--    The alternative form `REVOKE SELECT, INSERT, UPDATE, REFERENCES (col)`
--    binds the column list to the LAST privilege only — it reads as though the
--    list covered every privilege, and it is only correct by accident, because
--    the table-level revoke of SELECT/INSERT/UPDATE happens to cascade.
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
      'revoke all privileges (%I) on table public.%I from %s',
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
  expected int;
  detail text;
begin
  -- MAINTAIN exists only from PostgreSQL 17. array_append, never `||`.
  if current_setting('server_version_num')::int >= 170000 then
    privs := array_append(privs, 'MAINTAIN');
  end if;
  expected := array_length(privs, 1) * 2;   -- two tables
  raise notice 'Batch13: asserting % table privileges on PostgreSQL %',
    expected, current_setting('server_version');

  -- 4a. no anon/authenticated table privilege of ANY kind
  select count(*), string_agg(rr.rolname || '|' || t.tablename || '|' || p.priv, ', ')
    into n, detail
  from (values ('anon'),('authenticated')) rr(rolname)
  cross join (values ('profiles'),('ut_members')) t(tablename)
  cross join unnest(privs) p(priv)
  where has_table_privilege(rr.rolname, 'public.' || t.tablename, p.priv);
  if n > 0 then
    raise exception 'Batch13 verification failed: table privileges still held: %', detail;
  end if;

  -- 4b. no anon/authenticated privilege on ANY column, inherited access included.
  --     has_any_column_privilege also returns true when the privilege is held
  --     via a table-level grant, so this covers both routes.
  select count(*), string_agg(rr.rolname || '|' || t.tablename || '|' || p.priv, ', ')
    into n, detail
  from (values ('anon'),('authenticated')) rr(rolname)
  cross join (values ('profiles'),('ut_members')) t(tablename)
  cross join unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) p(priv)
  where has_any_column_privilege(rr.rolname, 'public.' || t.tablename, p.priv);
  if n > 0 then
    raise exception 'Batch13 verification failed: column-level access still held: %', detail;
  end if;

  -- 4c. raw attacl must also be clean, for the tables we touch
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
    raise exception 'Batch13 verification failed: attacl entries remain: %', detail;
  end if;

  -- 4d. the unrestricted policy is gone
  select count(*) into n from pg_policies
  where schemaname = 'public' and tablename = 'ut_members'
    and policyname = 'allow_authenticated_read';
  if n <> 0 then
    raise exception 'Batch13 verification failed: the unrestricted read policy is still present';
  end if;

  -- 4e. service_role must hold the COMPLETE privilege set on BOTH tables.
  --     16 on PostgreSQL 17, 14 on 16. service_role is BYPASSRLS here, so its
  --     access depends entirely on these grants.
  select count(*), string_agg(t.tablename || '|' || p.priv, ', ')
    into n, detail
  from (values ('profiles'),('ut_members')) t(tablename)
  cross join unnest(privs) p(priv)
  where has_table_privilege('service_role', 'public.' || t.tablename, p.priv);
  if n <> expected then
    raise exception
      'Batch13 verification failed: service_role holds % of % expected privileges: %',
      n, expected, detail;
  end if;

  raise notice 'Batch13: all post-conditions satisfied on PostgreSQL %',
    current_setting('server_version');
end $$;

commit;
