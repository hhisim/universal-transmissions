\set ON_ERROR_STOP off
\pset pager off

\echo ============================================================
\echo PROBES AS DEPLOYED (no unique index on email)
\echo ============================================================

do $$
begin
  begin
    insert into public.ut_members (email, plan) values ('synthetic-c@example.invalid','free')
      on conflict (email) do update set plan = excluded.plan;
    raise notice 'P1 ut_members upsert onConflict(email) ............ SUCCEEDED (unexpected)';
  exception when others then
    raise notice 'P1 ut_members upsert onConflict(email) ............ FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;

do $$
begin
  begin
    insert into public.profiles (email, plan) values ('synthetic-c@example.invalid','free')
      on conflict (email) do update set plan = excluded.plan;
    raise notice 'P2 profiles upsert onConflict(email) .............. SUCCEEDED (unexpected)';
  exception when others then
    raise notice 'P2 profiles upsert onConflict(email) .............. FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;

do $$
begin
  begin
    insert into public.profiles (email, plan) values ('synthetic-d@example.invalid','free');
    raise notice 'P3 profiles insert without user_id ................ SUCCEEDED (unexpected)';
  exception when others then
    raise notice 'P3 profiles insert without user_id ................ FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;

\echo
\echo --- read-then-write works WITHOUT any unique index ---
do $$
declare r public.ut_members;
begin
  select * into r from public.ut_members where email = 'synthetic-b@example.invalid' limit 2;
  if r.id is null then
    insert into public.ut_members (email, plan) values ('synthetic-b@example.invalid','free');
    raise notice 'P4 backtrack insert (no existing row) ............ SUCCEEDED';
  else
    update public.ut_members set plan = 'free' where id = r.id;
    raise notice 'P4 backtrack update existing row ................. SUCCEEDED (row found)';
  end if;
end $$;

do $$
declare r public.ut_members;
begin
  select * into r from public.ut_members where email = 'synthetic-new@example.invalid' limit 2;
  if r.id is null then
    insert into public.ut_members (email, plan) values ('synthetic-new@example.invalid','free');
    raise notice 'P5 backtrack insert for absent row ............... SUCCEEDED';
  else
    raise notice 'P5 backtrack insert for absent row ............... found a row (unexpected)';
  end if;
end $$;

\echo
\echo ============================================================
\echo DUPLICATE DETECTION (the "two rows, fail closed" case)
\echo ============================================================
insert into public.ut_members (email, plan) values ('synthetic-dup@example.invalid','guest');
insert into public.ut_members (email, plan) values ('synthetic-dup@example.invalid','guest');
do $$
declare n integer;
begin
  select count(*) into n from public.ut_members where email = 'synthetic-dup@example.invalid';
  raise notice 'P6 rows matching one address ..................... % (a reader taking limit 2 sees >1 and must fail closed)', n;
end $$;
delete from public.ut_members where email = 'synthetic-dup@example.invalid';
