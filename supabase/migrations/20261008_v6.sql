-- Migration 2026-10-08: v6
--
-- Run AFTER 20261008_v5.sql, in the Supabase SQL editor. Safe to re-run.
-- Changes no existing data. It adds:
--   * saved_searches.notify, profiles.notify_matches / notify_interests and
--     table listing_notifications — e-mail alerts for new matching listings
--     and interest
--   * tables user_blocks and user_reports — blocking and reporting users;
--     the "send message" policy and get_or_create_conversation() now refuse
--     when either side has blocked the other
--
-- The same statements are included at the end of supabase/schema.sql.

begin;

-- ─── v6: alerts & notifications, blocking & reporting users ─────────────

-- Saved searches move from the browser into the database so we can e-mail
-- "new listing matches your search". notify=false keeps a search silent.
alter table saved_searches add column if not exists notify boolean not null default true;

-- Per-kind e-mail opt-outs (notify_email already covers chat messages).
alter table profiles add column if not exists notify_matches boolean not null default true;
alter table profiles add column if not exists notify_interests boolean not null default true;

-- One e-mail per listing per recipient, whatever made them match (saved
-- search, swap preferences). Written and read only by the server (service
-- role): RLS on, no policies.
create table if not exists listing_notifications (
  listing_id uuid not null references listings (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  kind text not null,
  sent_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);
alter table listing_notifications enable row level security;

-- Blocking: a blocked user can't start or continue a conversation with the
-- person who blocked them (either direction is enough to stop messages).
create table if not exists user_blocks (
  blocker_id uuid not null references profiles (id) on delete cascade,
  blocked_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table user_blocks enable row level security;

drop policy if exists "Users manage their own blocks" on user_blocks;
create policy "Users manage their own blocks"
  on user_blocks for all using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

create or replace function is_blocked_between(p_a uuid, p_b uuid)
returns boolean as $$
  select exists (
    select 1 from user_blocks
    where (blocker_id = p_a and blocked_id = p_b) or (blocker_id = p_b and blocked_id = p_a)
  );
$$ language sql stable security definer set search_path = public;

-- True when the caller and any other participant have blocked each other.
create or replace function conversation_blocked(p_conversation_id uuid)
returns boolean as $$
  select exists (
    select 1 from conversation_participants p
    where p.conversation_id = p_conversation_id
      and p.user_id <> auth.uid()
      and is_blocked_between(auth.uid(), p.user_id)
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "Participants can send messages" on messages;
create policy "Participants can send messages"
  on messages for insert with check (
    auth.uid() = sender_id
    and is_conversation_participant(conversation_id)
    and not conversation_blocked(conversation_id)
  );

create or replace function get_or_create_conversation(p_listing_id uuid, p_other_user_id uuid)
returns uuid as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Du måste vara inloggad.'; end if;
  if p_other_user_id is null or p_other_user_id = auth.uid() then
    raise exception 'Du kan inte skicka meddelande till dig själv.';
  end if;
  if not exists (select 1 from profiles where id = p_other_user_id) then
    raise exception 'Mottagaren finns inte.';
  end if;
  if is_blocked_between(auth.uid(), p_other_user_id) then
    raise exception 'Du kan inte skicka meddelanden till den här användaren.';
  end if;

  select c.id into v_id
  from conversations c
  where c.listing_id is not distinct from p_listing_id
    and exists (select 1 from conversation_participants p where p.conversation_id = c.id and p.user_id = auth.uid())
    and exists (select 1 from conversation_participants p where p.conversation_id = c.id and p.user_id = p_other_user_id)
  order by c.created_at
  limit 1;
  if v_id is not null then return v_id; end if;

  insert into conversations (listing_id) values (p_listing_id) returning id into v_id;
  insert into conversation_participants (conversation_id, user_id)
  values (v_id, auth.uid()), (v_id, p_other_user_id);
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Reporting a person (from a chat or profile), reviewed by admins.
create table if not exists user_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references profiles (id) on delete cascade,
  reported_id uuid not null references profiles (id) on delete cascade,
  conversation_id uuid references conversations (id) on delete set null,
  reason text not null check (length(trim(reason)) between 3 and 2000),
  created_at timestamptz not null default now(),
  check (reporter_id <> reported_id)
);
alter table user_reports enable row level security;

drop policy if exists "Users can report other users" on user_reports;
create policy "Users can report other users"
  on user_reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "Reporters and admins can view user reports" on user_reports;
create policy "Reporters and admins can view user reports"
  on user_reports for select using (auth.uid() = reporter_id or is_admin());

drop policy if exists "Admins can delete user reports" on user_reports;
create policy "Admins can delete user reports"
  on user_reports for delete using (is_admin());

commit;
