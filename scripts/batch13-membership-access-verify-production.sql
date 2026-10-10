-- ============================================================================
-- batch13-membership-access-verify-production.sql
--
-- READ-ONLY verification for production.
--
-- Every statement is a single SELECT against pg_catalog / pg_policies and the
-- has_*_privilege() functions. There is no CREATE, no DROP, no temporary object,
-- no DDL and no psql meta-command: the file is executable through any SQL
-- interface, including the Supabase management query endpoint. No member rows are
-- read and nothing blocks writers.
--
-- Run each statement individually and check its own result — a success marker is
-- not a substitute for every statement executing.
--
-- Expected results are in the comment above each statement.
--
-- Version-aware: MAINTAIN exists only from PostgreSQL 17. The privilege list is
-- built with array_append inside the CASE expression, never with the `||`
-- operator, because `text[] || 'MAINTAIN'` is parsed as anyarray || anyarray and
-- raises "malformed array literal". (The isolated fixture runs PostgreSQL 16 and
-- therefore does not exercise the MAINTAIN branch; production is 17.6.)
--
-- Statement inventory (each is independently runnable):
--   V0   server version
--   V1   table privileges held by anon/authenticated        expect 0 rows
--   V2   raw column ACL entries for anon/authenticated      expect 0 rows
--   V2b  effective column access, inheritance-aware         expect 0 rows
--   V3   the unrestricted read policy                       expect 0 rows
--   V3b  every remaining policy on the two tables           informational
--   V4   service_role retains the full privilege set        expect 16 rows (PG17)
--   V4b  which roles hold any privilege                     only postgres + service_role
--   V5   PUBLIC grants on either table                      expect 0 rows
--   V6   role inheritance into anon/authenticated           expect 0 rows
--   V7   login capability of the three roles                anon/authenticated = false
--   V8   functions anon/authenticated may EXECUTE           informational
-- ============================================================================


-- V0 ---------------------------------------------------------------------------
-- expect one row; server_version mentions 17.x on production.
select current_setting('server_version')     as server_version,
       current_setting('server_version_num') as server_version_num;


-- V1 ---------------------------------------------------------------------------
-- expect 0 rows.
with privs as (
  select unnest(
    case when current_setting('server_version_num')::int >= 170000
         then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'], 'MAINTAIN')
         else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
    end
  ) as priv
)
select r.rolname, t.tablename, p.priv
from (values ('anon'),('authenticated')) r(rolname)
cross join (values ('profiles'),('ut_members')) t(tablename)
cross join privs p
where has_table_privilege(r.rolname, 'public.' || t.tablename, p.priv)
order by 1, 2, 3;


-- V2 ---------------------------------------------------------------------------
-- expect 0 rows. Raw column ACL entries naming anon, authenticated or PUBLIC.
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


-- V2b --------------------------------------------------------------------------
-- expect 0 rows. Effective column access, including access obtained through a
-- table-level grant. This is the check that does not rely on attacl inspection.
select r.rolname, t.tablename, p.priv
from (values ('anon'),('authenticated')) r(rolname)
cross join (values ('profiles'),('ut_members')) t(tablename)
cross join unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) p(priv)
where has_any_column_privilege(r.rolname, 'public.' || t.tablename, p.priv)
order by 1, 2, 3;


-- V3 ---------------------------------------------------------------------------
-- expect 0 rows.
select tablename, policyname, cmd, qual
from pg_policies
where schemaname = 'public'
  and tablename = 'ut_members'
  and policyname = 'allow_authenticated_read';


-- V3b --------------------------------------------------------------------------
-- informational: expect the three service-role policies and nothing else.
select tablename, policyname, cmd, roles::text as roles, qual
from pg_policies
where schemaname = 'public' and tablename in ('profiles', 'ut_members')
order by 1, 2;


-- V4 ---------------------------------------------------------------------------
-- expect 16 rows on PG17 (8 privileges x 2 tables), 14 on PG16.
with privs as (
  select unnest(
    case when current_setting('server_version_num')::int >= 170000
         then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'], 'MAINTAIN')
         else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
    end
  ) as priv
)
select t.tablename, p.priv
from (values ('profiles'),('ut_members')) t(tablename)
cross join privs p
where has_table_privilege('service_role', 'public.' || t.tablename, p.priv)
order by 1, 2;


-- V4b --------------------------------------------------------------------------
-- expect only postgres and service_role with non-zero counts; anon and
-- authenticated must be 0.
with privs as (
  select unnest(
    case when current_setting('server_version_num')::int >= 170000
         then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'], 'MAINTAIN')
         else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
    end
  ) as priv
)
select rr.rolname,
       count(*) filter (where has_table_privilege(rr.rolname, 'public.profiles',   p.priv)) as on_profiles,
       count(*) filter (where has_table_privilege(rr.rolname, 'public.ut_members', p.priv)) as on_ut_members
from (values ('anon'),('authenticated'),('service_role'),('postgres')) rr(rolname)
cross join privs p
group by rr.rolname
order by 1;


-- V5 ---------------------------------------------------------------------------
-- expect 0 rows.
with privs as (
  select unnest(
    case when current_setting('server_version_num')::int >= 170000
         then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'], 'MAINTAIN')
         else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
    end
  ) as priv
)
select t.tablename, p.priv
from (values ('profiles'),('ut_members')) t(tablename)
cross join privs p
where has_table_privilege('public', 'public.' || t.tablename, p.priv)
order by 1, 2;


-- V6 ---------------------------------------------------------------------------
-- expect 0 rows: neither role inherits from anything.
select r.rolname as member, g.rolname as granted_role
from pg_auth_members m
join pg_roles r on r.oid = m.member
join pg_roles g on g.oid = m.roleid
where r.rolname in ('anon', 'authenticated')
order by 1, 2;


-- V7 ---------------------------------------------------------------------------
-- expect anon and authenticated with rolcanlogin = false.
select rolname, rolcanlogin, rolsuper, rolbypassrls
from pg_roles
where rolname in ('anon', 'authenticated', 'service_role')
order by 1;


-- V8 ---------------------------------------------------------------------------
-- informational: the functions those roles may execute. None performs TRUNCATE
-- or builds dynamic SQL, which is what makes an HTTP/RPC path to TRUNCATE absent.
select n.nspname as schema, p.proname,
       has_function_privilege('anon', p.oid, 'EXECUTE')          as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'graphql_public')
  and (has_function_privilege('anon', p.oid, 'EXECUTE')
       or has_function_privilege('authenticated', p.oid, 'EXECUTE'))
order by 1, 2;
