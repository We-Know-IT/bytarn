-- Migration 2026-09-29: v2.1 (PR #12)
--
-- Run AFTER 20260929_v2.sql. Safe to re-run. It changes no data: it only
-- adds two functions and replaces six RLS policies on conversations,
-- conversation_participants and messages with equivalent ones that don't
-- recurse. Fixes "infinite recursion detected in policy for relation
-- conversation_participants", which broke the inbox, chats and sending
-- messages, and starting a new conversation from a listing.
-- The same statements are included at the end of supabase/schema.sql.

begin;

-- ─── v2.1: messaging RLS and conversation start ──────────────────────────
-- conversation_participants' select policy queried conversation_participants
-- itself, and the conversations/messages policies went through it, so every
-- read of conversations, participants or messages failed with "infinite
-- recursion detected in policy for relation conversation_participants".
-- A security-definer helper reads the table without re-applying its RLS.
create or replace function is_conversation_participant(p_conversation_id uuid)
returns boolean as $$
  select exists (
    select 1 from conversation_participants
    where conversation_id = p_conversation_id and user_id = auth.uid()
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "Participants can view their conversations" on conversations;
create policy "Participants can view their conversations"
  on conversations for select using (is_conversation_participant(id));

drop policy if exists "Participants can view participant rows" on conversation_participants;
create policy "Participants can view participant rows"
  on conversation_participants for select using (is_conversation_participant(conversation_id));

drop policy if exists "Users can add participants to their conversations" on conversation_participants;
create policy "Users can add participants to their conversations"
  on conversation_participants for insert with check (
    user_id = auth.uid() or is_conversation_participant(conversation_id)
  );

drop policy if exists "Participants can view messages" on messages;
create policy "Participants can view messages"
  on messages for select using (is_conversation_participant(conversation_id));

drop policy if exists "Participants can send messages" on messages;
create policy "Participants can send messages"
  on messages for insert with check (auth.uid() = sender_id and is_conversation_participant(conversation_id));

drop policy if exists "Recipients can mark messages as read" on messages;
create policy "Recipients can mark messages as read"
  on messages for update using (is_conversation_participant(conversation_id));

-- Starting a conversation used to be three client inserts, and the first
-- one (insert conversation … returning id) was rejected because the caller
-- wasn't a participant yet and so couldn't read the row back. This does
-- the lookup-or-create atomically.
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

commit;
