-- Migration 2026-10-07: v4
--
-- Run AFTER 20260930_v3.sql, in the Supabase SQL editor. Safe to re-run.
-- Changes no existing data. It adds:
--   * table swap_preferences (what each user is looking for) + RLS — matching
--   * messages to the supabase_realtime publication + an unread index — live chat
--   * the Hyresvägen name in one database error message and the SMTP sender default
-- (An existing smtp_settings row keeps its sender name; change it at
-- /admin/installningar.)
--
-- The same statements are included at the end of supabase/schema.sql.

begin;

-- ─── v4: swap preferences (matching), live chat, rename ──────────────────
-- What a user is looking for in a swap. Read by the matching in
-- src/lib/matching.ts: a listing is scored against the viewer's wishes,
-- and the viewer's own listing against the listing owner's wishes, which
-- together give the mutual match score. Readable by any signed-in user
-- (it's needed to score the other side); only the owner can write it.
create table if not exists swap_preferences (
  user_id uuid primary key references profiles (id) on delete cascade,
  districts text[] not null default '{}',   -- empty = any district
  rooms integer[] not null default '{}',    -- acceptable room counts, 5 = 5 or more; empty = any
  max_rent integer,
  min_area integer,
  needs_elevator boolean not null default false,
  needs_balcony boolean not null default false,
  needs_pets boolean not null default false,
  needs_wheelchair boolean not null default false,
  needs_stroller boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table swap_preferences enable row level security;

drop policy if exists "Signed-in users can read swap preferences" on swap_preferences;
create policy "Signed-in users can read swap preferences"
  on swap_preferences for select using (auth.uid() is not null);

drop policy if exists "Users manage their own swap preferences" on swap_preferences;
create policy "Users manage their own swap preferences"
  on swap_preferences for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Live chat: stream new and updated (read) messages over Supabase Realtime.
-- Realtime still applies the messages RLS policies, so subscribers only
-- receive rows from conversations they take part in.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'messages'
     ) then
    alter publication supabase_realtime add table messages;
  end if;
end $$;

create index if not exists messages_unread_idx on messages (conversation_id) where read = false;

-- Rename to Hyresvägen: user-facing text stored in the database.
create or replace function invite_collaborator_by_email(p_listing_id uuid, p_email text)
returns void as $$
declare
  v_user_id uuid;
begin
  if not exists (select 1 from listings where id = p_listing_id and user_id = auth.uid()) then
    raise exception 'Endast annonsens ägare kan bjuda in medannonsörer.';
  end if;

  select id into v_user_id from auth.users where email = p_email;
  if v_user_id is null then
    raise exception 'Ingen användare med den e-postadressen hittades. Personen måste skapa ett konto på Hyresvägen först.';
  end if;

  insert into listing_collaborators (listing_id, user_id)
  values (p_listing_id, v_user_id)
  on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

alter table smtp_settings alter column from_name set default 'Hyresvägen';

commit;
