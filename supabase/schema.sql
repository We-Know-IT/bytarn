-- Bytaren database schema
-- Run this once against a Supabase project (SQL editor, or `supabase db push`).

create extension if not exists "pgcrypto";

-- ─── Profiles ────────────────────────────────────────────────────────────
-- One row per auth.users entry, created automatically by a trigger below.
create table if not exists profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  avatar_url text,
  bio text,
  home_address text,
  home_district text,
  home_lat double precision,
  home_lng double precision,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

drop policy if exists "Profiles are viewable by everyone" on profiles;
create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

drop policy if exists "Users can update their own profile" on profiles;
create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create or replace function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─── Listings ────────────────────────────────────────────────────────────
create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  title text not null,
  description text not null default '',
  rooms numeric not null,
  rent integer not null,
  area numeric not null,
  district text not null,
  address text not null,
  lat double precision not null,
  lng double precision not null,
  images text[] not null default '{}',
  status text not null default 'aktiv' check (status in ('aktiv', 'pausad', 'avslutad')),
  floor integer,
  elevator boolean default false,
  balcony boolean default false,
  furnished boolean default false,
  pets_allowed boolean default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_status_idx on listings (status);
create index if not exists listings_district_idx on listings (district);
create index if not exists listings_user_id_idx on listings (user_id);

alter table listings enable row level security;

drop policy if exists "Active listings are viewable by everyone" on listings;
create policy "Active listings are viewable by everyone"
  on listings for select using (status = 'aktiv' or user_id = auth.uid());

drop policy if exists "Users can insert their own listings" on listings;
create policy "Users can insert their own listings"
  on listings for insert with check (auth.uid() = user_id);

drop policy if exists "Users can update their own listings" on listings;
create policy "Users can update their own listings"
  on listings for update using (auth.uid() = user_id);

drop policy if exists "Users can delete their own listings" on listings;
create policy "Users can delete their own listings"
  on listings for delete using (auth.uid() = user_id);

-- ─── Favorites ───────────────────────────────────────────────────────────
create table if not exists favorites (
  user_id uuid not null references profiles (id) on delete cascade,
  listing_id uuid not null references listings (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

alter table favorites enable row level security;

drop policy if exists "Users manage their own favorites" on favorites;
create policy "Users manage their own favorites"
  on favorites for all using (auth.uid() = user_id);

-- ─── Saved searches ──────────────────────────────────────────────────────
create table if not exists saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  name text not null,
  districts text[] not null default '{}',
  rooms integer[] not null default '{}',
  max_rent integer,
  created_at timestamptz not null default now()
);

alter table saved_searches enable row level security;

drop policy if exists "Users manage their own saved searches" on saved_searches;
create policy "Users manage their own saved searches"
  on saved_searches for all using (auth.uid() = user_id);

-- ─── Conversations & messages ────────────────────────────────────────────
create table if not exists conversations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings (id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists conversation_participants (
  conversation_id uuid not null references conversations (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  primary key (conversation_id, user_id)
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references conversations (id) on delete cascade,
  sender_id uuid not null references profiles (id) on delete cascade,
  content text not null,
  image_url text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_id_idx on messages (conversation_id);

alter table conversations enable row level security;
alter table conversation_participants enable row level security;
alter table messages enable row level security;

drop policy if exists "Participants can view their conversations" on conversations;
create policy "Participants can view their conversations"
  on conversations for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

-- Any signed-in user can start a conversation (e.g. by contacting a
-- listing's owner) — access to it is controlled by conversation_participants.
drop policy if exists "Users can start conversations" on conversations;
create policy "Users can start conversations"
  on conversations for insert with check (auth.uid() is not null);

drop policy if exists "Participants can view participant rows" on conversation_participants;
create policy "Participants can view participant rows"
  on conversation_participants for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id and cp.user_id = auth.uid()
    )
  );

-- A user can add themselves to a conversation, or add someone else once
-- they're already a participant (so: add yourself first, then the other
-- person, as two separate inserts — see getOrCreateConversation()).
drop policy if exists "Users can add participants to their conversations" on conversation_participants;
create policy "Users can add participants to their conversations"
  on conversation_participants for insert with check (
    user_id = auth.uid()
    or exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can view messages" on messages;
create policy "Participants can view messages"
  on messages for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Participants can send messages" on messages;
create policy "Participants can send messages"
  on messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

drop policy if exists "Recipients can mark messages as read" on messages;
create policy "Recipients can mark messages as read"
  on messages for update using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

-- ─── Reports ─────────────────────────────────────────────────────────────
-- Backs the "Rapportera annons" button — lets a signed-in user flag a
-- listing for review. No admin UI reads this yet; it's stored for manual
-- review until a moderation workflow exists.
create table if not exists reports (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  reporter_id uuid not null references profiles (id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

alter table reports enable row level security;

drop policy if exists "Users can create reports" on reports;
create policy "Users can create reports"
  on reports for insert with check (auth.uid() = reporter_id);

drop policy if exists "Users can view their own reports" on reports;
create policy "Users can view their own reports"
  on reports for select using (auth.uid() = reporter_id);

-- ─── Listing collaborators ───────────────────────────────────────────────
-- Lets a listing's owner share management of it with someone else (e.g. a
-- partner) — collaborators can edit/pause/delete the listing alongside the
-- owner. Invited by email via invite_collaborator_by_email() below; the
-- invitee must already have a Bytaren account (no email-sending
-- infrastructure exists to invite someone who doesn't).
create table if not exists listing_collaborators (
  listing_id uuid not null references listings (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (listing_id, user_id)
);

alter table listing_collaborators enable row level security;

drop policy if exists "Owners and collaborators can view collaborators" on listing_collaborators;
create policy "Owners and collaborators can view collaborators"
  on listing_collaborators for select using (
    auth.uid() = user_id
    or exists (select 1 from listings l where l.id = listing_collaborators.listing_id and l.user_id = auth.uid())
  );

drop policy if exists "Owners can remove collaborators" on listing_collaborators;
create policy "Owners can remove collaborators"
  on listing_collaborators for delete using (
    exists (select 1 from listings l where l.id = listing_collaborators.listing_id and l.user_id = auth.uid())
  );

-- Widen listing access so a collaborator can see/edit/pause/delete a
-- listing exactly like its owner can.
drop policy if exists "Active listings are viewable by everyone" on listings;
create policy "Active listings are viewable by everyone"
  on listings for select using (
    status = 'aktiv'
    or user_id = auth.uid()
    or exists (select 1 from listing_collaborators lc where lc.listing_id = listings.id and lc.user_id = auth.uid())
  );

drop policy if exists "Users can update their own listings" on listings;
drop policy if exists "Owners and collaborators can update listings" on listings;
create policy "Owners and collaborators can update listings"
  on listings for update using (
    auth.uid() = user_id
    or exists (select 1 from listing_collaborators lc where lc.listing_id = listings.id and lc.user_id = auth.uid())
  );

drop policy if exists "Users can delete their own listings" on listings;
drop policy if exists "Owners and collaborators can delete listings" on listings;
create policy "Owners and collaborators can delete listings"
  on listings for delete using (
    auth.uid() = user_id
    or exists (select 1 from listing_collaborators lc where lc.listing_id = listings.id and lc.user_id = auth.uid())
  );

-- Runs as the table owner so it can look up auth.users by email (not
-- otherwise exposed to clients) while still checking the caller actually
-- owns the listing before adding anyone.
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
    raise exception 'Ingen användare med den e-postadressen hittades. Personen måste skapa ett konto på Bytaren först.';
  end if;

  insert into listing_collaborators (listing_id, user_id)
  values (p_listing_id, v_user_id)
  on conflict do nothing;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── Interest / mutual match ─────────────────────────────────────────────
-- Backs "Visa intresse": a user marking interest in someone else's
-- listing. Two users interested in each other's listings is a mutual
-- match (checked client-side by comparing each side's interest rows).
create table if not exists interests (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references listings (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (listing_id, user_id)
);

alter table interests enable row level security;

drop policy if exists "Users can express interest" on interests;
create policy "Users can express interest"
  on interests for insert with check (auth.uid() = user_id);

drop policy if exists "Users can remove their interest" on interests;
create policy "Users can remove their interest"
  on interests for delete using (auth.uid() = user_id);

drop policy if exists "Users can view interest on their own listings or their own interests" on interests;
create policy "Users can view interest on their own listings or their own interests"
  on interests for select using (
    auth.uid() = user_id
    or exists (select 1 from listings l where l.id = interests.listing_id and l.user_id = auth.uid())
  );

-- ─── Storage: listing images & avatars ───────────────────────────────────
-- Both public-read buckets; uploads are namespaced by uploader id
-- (<user_id>/<filename>) and that prefix is enforced by the write policies.
insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Public read listing images" on storage.objects;
create policy "Public read listing images"
  on storage.objects for select using (bucket_id = 'listing-images');

drop policy if exists "Users can upload their own listing images" on storage.objects;
create policy "Users can upload their own listing images"
  on storage.objects for insert with check (
    bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own listing images" on storage.objects;
create policy "Users can delete their own listing images"
  on storage.objects for delete using (
    bucket_id = 'listing-images' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Public read avatars" on storage.objects;
create policy "Public read avatars"
  on storage.objects for select using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert with check (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete using (
    bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]
  );
