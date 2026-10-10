-- ============================================================================
-- batch13-membership-access-verify-production.sql
--
-- READ-ONLY verification for production. Every statement here is a SELECT
-- against pg_catalog / pg_policies / privilege-testing functions.
--
-- It reads no member rows, changes nothing, takes no lock that blocks writers,
-- and is safe to run repeatedly at any time.
--
-- DO NOT CONFUSE THIS with scripts/batch13-membership-access-verify.sh or
-- ...-tests.py: those build a throw-away database and deliberately perform
-- DESTRUCTIVE probes (TRUNCATE inside a rolled-back transaction, synthetic
-- inserts). They must never be pointed at production.
--
-- Version-aware: MAINTAIN only exists from PostgreSQL 17. The privilege list is
-- built from the running server version, so this file is correct on 16 and 17.
-- (The isolated fixture ran on PostgreSQL 16 and therefore could not test
-- MAINTAIN; production is PostgreSQL 17.6 and V1/V4 do cover it there.)
-- ============================================================================

\echo '=== V0. server version ==='
select current_setting('server_version')    as server_version,
       current_setting('server_version_num') as server_version_num;

-- The eight table privileges, filtered to those that exist on this server.
create temporary view b13_privs as
select unnest(
         array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
         || case when current_setting('server_version_num')::int >= 170000
                 then array['MAINTAIN'] else array[]::text[] end
       ) as priv;

\echo '=== V1. table privileges held by anon / authenticated  (EXPECT 0 ROWS) ==='
select r.rolname, t.tablename, p.priv
from (values ('anon'),('authenticated')) r(rolname)
cross join (values ('profiles'),('ut_members')) t(tablename)
cross join b13_privs p
where has_table_privilege(r.rolname, 'public.' || t.tablename, p.priv)
order by 1, 2, 3;

\echo '=== V2. independently granted COLUMN privileges for anon/authenticated/PUBLIC  (EXPECT 0 ROWS) ==='
select c.relname, a.attname,
       case when x.grantee = 0 then 'PUBLIC' else pg_get_userbyid(x.grantee) end as grantee,
       x.privilege_type
from pg_attribute a
join pg_class c on c.oid = a.attrelid
join pg_namespace ns on ns.oid = c.relnamespace
cross join lateral aclexplode(a.attacl) x
where ns.nspname = 'public'
  and c.relname in ('profiles', 'ut_members')
  and a.attnum > 0 and a.attacl is not null
  and (x.grantee = 0 or pg_get_userbyid(x.grantee) in ('anon', 'authenticated'))
order by 1, 2, 4;

\echo '=== V3. the unrestricted read policy  (EXPECT 0 ROWS) ==='
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'ut_members'
  and policyname = 'allow_authenticated_read';

\echo '=== V3b. every remaining policy on the two tables (informational) ==='
select tablename, policyname, cmd, roles::text as roles, qual
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'ut_members')
order by 1, 2;

\echo '=== V4. service_role must still hold everything  (EXPECT 16 ROWS on PG17, 14 on PG16) ==='
select r.rolname, t.tablename, p.priv
from (values ('service_role')) r(rolname)
cross join (values ('profiles'),('ut_members')) t(tablename)
cross join b13_privs p
where has_table_privilege(r.rolname, 'public.' || t.tablename, p.priv)
order by 1, 2, 3;

\echo '=== V4b. summary counts: which roles hold ANY privilege on these tables  (EXPECT ONLY postgres + service_role) ==='
select rr.rolname,
       count(*) filter (where has_table_privilege(rr.rolname, 'public.profiles',   p.priv))   as on_profiles,
       count(*) filter (where has_table_privilege(rr.rolname, 'public.ut_members', p.priv))   as on_ut_members
from pg_roles rr
cross join b13_privs p
where rr.rolname in ('anon','authenticated','service_role','postgres','PUBLIC')
group by rr.rolname
order by 1;

\echo '=== V5. PUBLIC grants on either table  (EXPECT 0 ROWS) ==='
select t.tablename, p.priv
from (values ('profiles'),('ut_members')) t(tablename)
cross join b13_privs p
where has_table_privilege('public', 'public.' || t.tablename, p.priv)
order by 1, 2;

\echo '=== V6. role inheritance that could re-grant access  (EXPECT no membership for anon/authenticated) ==='
select r.rolname as member, g.rolname as granted_role
from pg_auth_members m
join pg_roles r on r.oid = m.member
join pg_roles g on g.oid = m.roleid
where r.rolname in ('anon', 'authenticated')
order by 1, 2;

\echo '=== V7. can anon / authenticated log in directly?  (EXPECT rolcanlogin = false) ==='
select rolname, rolcanlogin, rolsuper, rolbypassrls
from pg_roles where rolname in ('anon', 'authenticated', 'service_role')
order by 1;

\echo '=== V8. functions anon/authenticated may EXECUTE  (confirms the reachability analysis) ==='
select n.nspname as schema, p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public','graphql_public')
  and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
order by 1, 2;

drop view b13_privs;

-- ---------------------------------------------------------------------------
-- Reading the result:
--   V1, V2, V3, V5 empty                      -> the revocation is effective
--   V4 shows service_role holding all privs   -> server-mediated access intact
--   V4b lists only postgres and service_role  -> no other role can reach them
--   V6, V7 empty / false                      -> no inheritance or login path
-- Any other result means the migration did not take effect as intended; do not
-- proceed, and re-run the isolated suite before touching production again.
-- ---------------------------------------------------------------------------
