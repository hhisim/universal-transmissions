-- Batch 13 test fixture: reproduce the DEPLOYED state of public.profiles and
-- public.ut_members on an isolated local cluster.
--
-- Column types, defaults, ACLs and policies are copied from the read-only
-- catalog inspection of opixpkquyapeqdceyczs. No production data is used;
-- every row here is synthetic.

drop database if exists b13test;
drop schema if exists auth cascade;

-- Supabase-shaped roles (NOLOGIN, as in production)
do $$ begin
  if not exists (select 1 from pg_roles where rolname='anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname='service_role') then create role service_role nologin bypassrls; end if;
end $$;

create database b13test;
