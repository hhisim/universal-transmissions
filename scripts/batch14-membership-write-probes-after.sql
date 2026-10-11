\pset pager off
\echo ============================================================
\echo PROBES AFTER THE MIGRATION (functional unique index present)
\echo ============================================================

do $$
begin
  begin
    insert into public.ut_members (email, plan) values ('synthetic-c@example.invalid','free')
      on conflict (email) do update set plan = excluded.plan;
    raise notice 'Q1 onConflict(email) against an EXPRESSION index ..... SUCCEEDED (unexpected)';
  exception when others then
    raise notice 'Q1 onConflict(email) against an EXPRESSION index ..... FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;

do $$
begin
  begin
    insert into public.ut_members (email, plan) values ('SYNTHETIC-A@EXAMPLE.INVALID','free');
    raise notice 'Q2 case-variant of an existing address .............. SUCCEEDED (unexpected)';
  exception when unique_violation then
    raise notice 'Q2 case-variant of an existing address .............. BLOCKED 23505 (case-insensitive uniqueness enforced)';
  when others then
    raise notice 'Q2 case-variant of an existing address .............. FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;

do $$
begin
  begin
    insert into public.ut_members (email, plan) values ('  synthetic-a@example.invalid  ','free');
    raise notice 'Q3 whitespace variant of an existing address ........ SUCCEEDED (unexpected)';
  exception when unique_violation then
    raise notice 'Q3 whitespace variant of an existing address ........ BLOCKED 23505';
  when others then
    raise notice 'Q3 whitespace variant of an existing address ........ FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;

do $$
begin
  insert into public.ut_members (email, plan) values ('synthetic-fresh@example.invalid','free');
  raise notice 'Q4 genuinely new address ............................ SUCCEEDED (distinct address still insertable)';
end $$;

do $$
begin
  begin
    insert into public.profiles (email, plan) values ('synthetic-e@example.invalid','free');
    raise notice 'Q5 profiles insert without user_id after migration ... SUCCEEDED (unexpected)';
  exception when others then
    raise notice 'Q5 profiles insert without user_id after migration ... FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;

do $$
begin
  begin
    insert into public.profiles (user_id, email, plan)
      values ('33333333-3333-3333-3333-333333333333','synthetic-f@example.invalid','free');
    raise notice 'Q6 profiles insert WITH user_id ..................... SUCCEEDED (the schema-backed key works)';
  exception when others then
    raise notice 'Q6 profiles insert WITH user_id ..................... FAILED % : %', SQLSTATE, SQLERRM;
  end;
end $$;
