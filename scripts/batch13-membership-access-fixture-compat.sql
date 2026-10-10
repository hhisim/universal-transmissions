-- Batch 13 compatibility fixture: the dependent object that could be affected by
-- withdrawing privileges on public.profiles.
--
-- public.conversations holds a foreign key to profiles(user_id). It is NOT used
-- by the Universal Transmissions app (no .from("conversations") anywhere in
-- src/) — it belongs to a sibling application on the same Supabase project. It
-- is reproduced here only to prove the revoke does not break it.
--
-- Real shape from information_schema.columns; FK and policy from pg_constraint
-- and pg_policies.

create table public.conversations (
  id              uuid        not null default gen_random_uuid(),
  user_id         uuid,
  tradition       text        not null default 'hermetic',
  mode            text        not null default 'standard',
  title           text,
  summary         text,
  started_at      timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  message_count   integer     not null default 0,
  is_starred      boolean     not null default false,
  is_archived     boolean     not null default false,
  daily_type      text,
  metadata        jsonb,
  constraint conversations_pkey primary key (id),
  constraint conversations_user_id_fkey foreign key (user_id)
    references public.profiles(user_id) on delete cascade
);

grant all on public.conversations to anon, authenticated, service_role;
alter table public.conversations enable row level security;

create policy users_own_conversations on public.conversations
  for all to public
  using (auth.uid() = user_id);
