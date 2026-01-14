/*
  Alli AI Chat (separate tables; does NOT modify your existing tables)

  Your Supabase already has:
    - public.profiles
    - public.conversations
    - public.messages
    - and other log tables

  This migration creates NEW tables just for the ChatGPT-style mobile chat:
    - public.alli_ai_conversations
    - public.alli_ai_messages

  Safe to run even if the tables already exist (uses IF NOT EXISTS).
*/

create extension if not exists "pgcrypto";

-- Conversations (one thread per user; you can have many)
create table if not exists public.alli_ai_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  title text not null default 'New chat',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists alli_ai_conversations_user_id_idx
  on public.alli_ai_conversations (user_id);

create index if not exists alli_ai_conversations_updated_at_idx
  on public.alli_ai_conversations (updated_at desc);

-- Messages
create table if not exists public.alli_ai_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.alli_ai_conversations (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('system', 'user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists alli_ai_messages_conversation_id_created_at_idx
  on public.alli_ai_messages (conversation_id, created_at);

create index if not exists alli_ai_messages_user_id_idx
  on public.alli_ai_messages (user_id);

-- updated_at trigger (use unique names to avoid clobbering existing functions)
create or replace function public.alli_ai_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists alli_ai_set_conversations_updated_at on public.alli_ai_conversations;
create trigger alli_ai_set_conversations_updated_at
before update on public.alli_ai_conversations
for each row
execute function public.alli_ai_set_updated_at();

-- Touch conversation when a message is inserted
create or replace function public.alli_ai_touch_conversation()
returns trigger
language plpgsql
as $$
begin
  update public.alli_ai_conversations
    set updated_at = now()
    where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists alli_ai_touch_conversation_on_message_insert on public.alli_ai_messages;
create trigger alli_ai_touch_conversation_on_message_insert
after insert on public.alli_ai_messages
for each row
execute function public.alli_ai_touch_conversation();

-- RLS
alter table public.alli_ai_conversations enable row level security;
alter table public.alli_ai_messages enable row level security;

-- Conversations policies
drop policy if exists "alli_ai_conversations_select_own" on public.alli_ai_conversations;
create policy "alli_ai_conversations_select_own"
on public.alli_ai_conversations
for select
using (user_id = auth.uid());

drop policy if exists "alli_ai_conversations_insert_own" on public.alli_ai_conversations;
create policy "alli_ai_conversations_insert_own"
on public.alli_ai_conversations
for insert
with check (user_id = auth.uid());

drop policy if exists "alli_ai_conversations_update_own" on public.alli_ai_conversations;
create policy "alli_ai_conversations_update_own"
on public.alli_ai_conversations
for update
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "alli_ai_conversations_delete_own" on public.alli_ai_conversations;
create policy "alli_ai_conversations_delete_own"
on public.alli_ai_conversations
for delete
using (user_id = auth.uid());

-- Messages policies
drop policy if exists "alli_ai_messages_select_own" on public.alli_ai_messages;
create policy "alli_ai_messages_select_own"
on public.alli_ai_messages
for select
using (user_id = auth.uid());

drop policy if exists "alli_ai_messages_insert_own" on public.alli_ai_messages;
create policy "alli_ai_messages_insert_own"
on public.alli_ai_messages
for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.alli_ai_conversations c
    where c.id = conversation_id
      and c.user_id = auth.uid()
  )
);

drop policy if exists "alli_ai_messages_delete_own" on public.alli_ai_messages;
create policy "alli_ai_messages_delete_own"
on public.alli_ai_messages
for delete
using (user_id = auth.uid());


