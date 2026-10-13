-- ============================================================================
-- batch14ax-verdict-components.sql
--
-- DIAGNOSTIC for a red verdict. The postflight's Q90 returns a single boolean;
-- this file re-evaluates the same ten conditions SEPARATELY and lists only the
-- ones that do NOT hold, so a failed gate names its cause instead of just saying
-- "false".
--
-- SELECT-only, no side effects, safe to run against production. It is a harness
-- aid, not part of the release gate: batch14ax-install-bundle-validate.sh and
-- batch14ax-gate-negatives.sh both run it automatically when the verdict is not
-- `t`.
--
-- Output: one row per failing condition (empty result = every condition holds).
-- ============================================================================
with c as (
  select 1 as n, 'authority column exists on both tables with type timestamptz' as component,
    (select count(*) = 2 from pg_attribute a
      where a.attrelid in ('public.ut_members'::regclass, 'public.profiles'::regclass)
        and a.attname = 'entitlement_authority_at' and a.attnum > 0 and not a.attisdropped
        and format_type(a.atttypid, a.atttypmod) = 'timestamp with time zone') as holds
  union all select 2, 'address index structure (table, one key, no predicate, flags, expression)',
    (select count(*) = 1 from pg_index i
       join pg_class ic on ic.oid = i.indexrelid
       join pg_class t2 on t2.oid = i.indrelid
       join pg_namespace n on n.oid = ic.relnamespace
      where n.nspname = 'public' and ic.relname = 'ut_members_email_lower_key'
        and t2.relname = 'ut_members'
        and i.indisunique and i.indisvalid and i.indisready and i.indislive
        and i.indnkeyatts = 1 and i.indnatts = 1 and i.indpred is null
        and replace(pg_get_expr(i.indexprs, i.indrelid), ' ', '')
            in ('lower(btrim(email))','lower(btrim((email)::text))'))
  union all select 3, 'the complete retained surface: exact signatures (10)',
    (select count(*) = 4 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public'
        and (p.proname, pg_get_function_identity_arguments(p.oid)) in (
              ('apply_lifecycle_update','p_targets jsonb'),
              ('apply_lifecycle_update_sync','p_targets jsonb'),
              ('apply_lifecycle_update_sync_global','p_targets jsonb'),
              ('b14ac_install_trigger','p_mode text')))
  union all select 4, 'security mode + pinned search_path + owner + ACLs (all 10 retained functions)',
       (select count(*) = 10 from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
          join (values
                  ('apply_lifecycle_update',             true,  true),
                  ('apply_lifecycle_update_sync',        false, false),
                  ('apply_lifecycle_update_sync_global', false, true),
                  ('b14ab_acquire_global_lock',          false, true),
                  ('b14ab_linkage_global_key',           false, true),
                  ('b14ab_linkage_key',                  false, false),
                  ('b14ac_install_trigger',              false, false),
                  ('b14ac_linkage_keys_for_payload',     false, false),
                  ('b14ac_trg_stmt_exclusive',           false, false),
                  ('b14ac_trg_stmt_shared',              false, false)
               ) e(proname, is_definer, svc) on e.proname = p.proname
         where n.nspname = 'public'
           and pg_get_userbyid(p.proowner) = 'postgres'
           and replace(array_to_string(p.proconfig, ','), ' ', '') = 'search_path=pg_catalog,public'
           and p.prosecdef = e.is_definer
           and has_function_privilege('service_role', p.oid, 'EXECUTE') = e.svc
           and not has_function_privilege('anon', p.oid, 'EXECUTE')
           and not has_function_privilege('authenticated', p.oid, 'EXECUTE')
           and not (p.proacl is null
                    or exists (select 1 from aclexplode(p.proacl) x
                                where x.grantee = 0 and x.privilege_type = 'EXECUTE')))
union all select 5, 'trigger installer present, owned by postgres, not callable by an app role',
    (select count(*) = 1 from pg_proc p
       join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = 'b14ac_install_trigger'
        and pg_get_function_identity_arguments(p.oid) = 'p_mode text'
        and pg_get_userbyid(p.proowner) = 'postgres'
        and not has_function_privilege('anon', p.oid, 'EXECUTE')
        and not has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  union all select 6, 'ENABLED BEFORE STATEMENT trigger for INSERT+UPDATE on BOTH tables',
    (select count(*) = 2 from pg_trigger t
       join pg_class c on c.oid = t.tgrelid
       join pg_namespace n on n.oid = c.relnamespace
       join pg_proc p on p.oid = t.tgfoid
      where n.nspname = 'public' and c.relname in ('ut_members','profiles')
        and not t.tgisinternal and t.tgname = 'b14ac_stmt_trg'
        and t.tgenabled = 'O'
        and (t.tgtype & 1) = 0 and (t.tgtype & 2) = 2
        and (t.tgtype & 4) = 4 and (t.tgtype & 16) = 16
        and p.proname = 'b14ac_trg_stmt_exclusive')
  union all select 7, 'effective TABLE access withdrawn from anon/authenticated',
    (select count(*) = 0 from
       (values ('anon'),('authenticated')) r(role_name)
       cross join (values ('ut_members'),('profiles')) t(tablename)
       cross join (select unnest(
          case when current_setting('server_version_num')::int >= 170000
               then array_append(array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER'],'MAINTAIN')
               else array['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']
          end) as priv) p
      where has_table_privilege(r.role_name, 'public.' || t.tablename, p.priv))
  union all select 8, 'effective COLUMN access withdrawn from anon/authenticated',
    (select count(*) = 0 from
       (values ('anon'),('authenticated')) r(role_name)
       cross join (select attrelid, attname from pg_attribute
                    where attrelid in ('public.ut_members'::regclass,'public.profiles'::regclass)
                      and attnum > 0 and not attisdropped) a
       cross join (select unnest(array['SELECT','INSERT','UPDATE','REFERENCES']) as priv) p
      where has_column_privilege(r.role_name, a.attrelid, a.attname, p.priv))
  union all select 9, 'no PUBLIC grant on tables, columns or any bundle-owned function',
    ((select count(*) = 0 from information_schema.role_table_grants
       where table_schema = 'public' and table_name in ('ut_members','profiles') and grantee = 'PUBLIC')
     and (select count(*) = 0 from information_schema.column_privileges
       where table_schema = 'public' and table_name in ('ut_members','profiles') and grantee = 'PUBLIC')
     and (select count(*) = 0 from pg_proc p
            join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%'))
union all select 10, 'RLS enabled on both tables, withdrawn policy absent, no anon/authenticated policy',
    ((select count(*) = 2 from pg_class c
        join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relname in ('ut_members','profiles') and c.relrowsecurity)
     and (select count(*) = 0 from pg_policies
       where schemaname = 'public' and policyname = 'allow_authenticated_read')
     and (select count(*) = 0 from pg_policies
       where schemaname = 'public' and tablename in ('ut_members','profiles')
         and (roles::text[] && array['anon','authenticated','public'])))
 union all select 11, 'the 7 Batch 14ab prototype entry points are ABSENT',
       (to_regprocedure('public.b14ab_install_trigger(text)') is null
        and to_regprocedure('public.b14ab_trg_row()') is null
        and to_regprocedure('public.b14ab_trg_stmt()') is null
        and to_regprocedure('public.b14ab_lifecycle_apply(text,text,text,text,bigint[],text,text)') is null
        and to_regprocedure('public.b14ab_lifecycle_apply_nosync(text,text,text,text,bigint[],text,text)') is null
        and to_regprocedure('public.b14ab_acquire_linkage_locks(text,text,text,text)') is null
        and to_regprocedure('public.b14ab_linkage_keys(text,text,text,text)') is null)
 union all select 12, 'no unexpected bundle-owned function present',
       (select count(*) = 0 from pg_proc p
          join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public'
           and (p.proname like 'b14a%' or p.proname like 'apply_lifecycle_update%')
           and (p.proname, pg_get_function_identity_arguments(p.oid)) not in (
                 ('apply_lifecycle_update', 'p_targets jsonb'),
                 ('apply_lifecycle_update_sync', 'p_targets jsonb'),
                 ('apply_lifecycle_update_sync_global', 'p_targets jsonb'),
                 ('b14ab_acquire_global_lock', 'p_shared boolean'),
                 ('b14ab_linkage_global_key', ''),
                 ('b14ab_linkage_key', 'p_kind text, p_value text'),
                 ('b14ac_install_trigger', 'p_mode text'),
                 ('b14ac_linkage_keys_for_payload', 'p_targets jsonb'),
                 ('b14ac_trg_stmt_exclusive', ''),
                 ('b14ac_trg_stmt_shared', '')))
)
select n as component_no, component, holds
from c
where not holds
order by n;

-- ---------------------------------------------------------------------------
-- DETAIL for the function-level conditions: the raw facts behind component 3/4/5,
-- so a red gate names the function that drifted rather than only the condition.
-- Always printed; harmless when everything holds.
-- ---------------------------------------------------------------------------
select p.proname                                                          as function_name,
       pg_get_userbyid(p.proowner)                                        as owner,
       case when p.prosecdef then 'DEFINER' else 'INVOKER' end            as security_mode,
       coalesce(replace(array_to_string(p.proconfig, ','), ' ', ''), '<unset>') as search_path,
       coalesce(p.proacl::text, '<default: PUBLIC EXECUTE>')              as acl,
       has_function_privilege('service_role', p.oid, 'EXECUTE')           as service_role_execute,
       has_function_privilege('anon', p.oid, 'EXECUTE')                   as anon_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('apply_lifecycle_update',
                    'apply_lifecycle_update_sync',
                    'apply_lifecycle_update_sync_global',
                    'b14ac_install_trigger')
order by 1;
