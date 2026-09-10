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

create policy "Profiles are viewable by everyone"
  on profiles for select using (true);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create function handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name)
  values (new.id, coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)));
  return new;
end;
$$ language plpgsql security definer;

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

create policy "Active listings are viewable by everyone"
  on listings for select using (status = 'aktiv' or user_id = auth.uid());

create policy "Users can insert their own listings"
  on listings for insert with check (auth.uid() = user_id);

create policy "Users can update their own listings"
  on listings for update using (auth.uid() = user_id);

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

create policy "Participants can view their conversations"
  on conversations for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversations.id and cp.user_id = auth.uid()
    )
  );

create policy "Participants can view participant rows"
  on conversation_participants for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = conversation_participants.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "Participants can view messages"
  on messages for select using (
    exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

create policy "Participants can send messages"
  on messages for insert with check (
    auth.uid() = sender_id
    and exists (
      select 1 from conversation_participants cp
      where cp.conversation_id = messages.conversation_id and cp.user_id = auth.uid()
    )
  );

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

create policy "Users can create reports"
  on reports for insert with check (auth.uid() = reporter_id);

create policy "Users can view their own reports"
  on reports for select using (auth.uid() = reporter_id);
