-- Hyresvägen database schema
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
-- invitee must already have a Hyresvägen account (no email-sending
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
    raise exception 'Ingen användare med den e-postadressen hittades. Personen måste skapa ett konto på Hyresvägen först.';
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

-- ═══════════════════════════════════════════════════════════════════════
-- v2: publish fixes, listing lifecycle, video, family accounts, admin,
-- SMTP settings. Everything below is idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Profiles: self-heal missing rows ────────────────────────────────────
-- listings.user_id references profiles(id), so a user without a profile
-- row (created before the trigger existed, or if it failed) could never
-- publish — the insert failed on the foreign key. Let users create their
-- own row, and backfill any that are missing.
drop policy if exists "Users can insert their own profile" on profiles;
create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

insert into profiles (id, name)
select u.id, coalesce(nullif(u.raw_user_meta_data->>'name', ''), split_part(u.email, '@', 1), 'Användare')
from auth.users u
where not exists (select 1 from profiles p where p.id = u.id);

alter table profiles add column if not exists is_admin boolean not null default false;
alter table profiles add column if not exists notify_email boolean not null default true;

-- is_admin can only be granted from the SQL editor / service role:
--   update profiles set is_admin = true where id = '<user-id>';
create or replace function prevent_self_admin()
returns trigger as $$
begin
  if new.is_admin is distinct from old.is_admin and auth.uid() is not null then
    raise exception 'is_admin kan inte ändras från klienten.';
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists profiles_prevent_self_admin on profiles;
create trigger profiles_prevent_self_admin
  before update on profiles
  for each row execute procedure prevent_self_admin();

create or replace function is_admin()
returns boolean as $$
  select coalesce((select is_admin from profiles where id = auth.uid()), false);
$$ language sql stable security definer set search_path = public;

-- ─── Listings: video, views, expiry ──────────────────────────────────────
alter table listings add column if not exists video_url text;
alter table listings add column if not exists view_count integer not null default 0;

-- Listings expire 60 days after they were last published/renewed, so the
-- feed doesn't fill up with stale ads nobody answers. When the column is
-- first added, every existing listing gets a full 60 days from now (the
-- default is evaluated once, at add time) — nothing is retired by the
-- migration itself. Cleaning up old listings is a separate, deliberate
-- step: see supabase/cleanup_old_listings.sql.
alter table listings add column if not exists expires_at timestamptz not null default (now() + interval '60 days');

create index if not exists listings_expires_at_idx on listings (expires_at);

create or replace function expire_stale_listings()
returns integer as $$
declare
  n integer;
begin
  update listings set status = 'avslutad', updated_at = now()
  where status in ('aktiv', 'pausad') and expires_at < now();
  get diagnostics n = row_count;
  return n;
end;
$$ language plpgsql security definer set search_path = public;

-- Not scheduled here: running expire_stale_listings() nightly with pg_cron
-- is an opt-in step in supabase/cleanup_old_listings.sql. Without it,
-- expired listings are still hidden from the feed by the app.

-- Anyone may count a view (no auth needed), but only by one at a time.
create or replace function increment_listing_view(p_listing_id uuid)
returns void as $$
  update listings set view_count = view_count + 1 where id = p_listing_id and status = 'aktiv';
$$ language sql security definer set search_path = public;

grant execute on function increment_listing_view(uuid) to anon, authenticated;

-- ─── Family accounts (households) ────────────────────────────────────────
-- A household groups people who live together. Every member can see and
-- manage every other member's listings (edit, pause, renew, delete), so a
-- family can run its ads together. A user belongs to at most one household.
-- All writes go through the security-definer functions below.
create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households (id) on delete cascade,
  user_id uuid not null references profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create unique index if not exists household_members_one_per_user on household_members (user_id);

create table if not exists household_invites (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households (id) on delete cascade,
  email text not null,
  token uuid not null unique default gen_random_uuid(),
  invited_by uuid not null references profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  accepted_at timestamptz
);

alter table households enable row level security;
alter table household_members enable row level security;
alter table household_invites enable row level security;

create or replace function my_household_id()
returns uuid as $$
  select household_id from household_members where user_id = auth.uid();
$$ language sql stable security definer set search_path = public;

create or replace function shares_household(p_other uuid)
returns boolean as $$
  select exists (
    select 1 from household_members a
    join household_members b on a.household_id = b.household_id
    where a.user_id = auth.uid() and b.user_id = p_other
  );
$$ language sql stable security definer set search_path = public;

drop policy if exists "Members can view their household" on households;
create policy "Members can view their household"
  on households for select using (id = my_household_id());

drop policy if exists "Members can view household members" on household_members;
create policy "Members can view household members"
  on household_members for select using (household_id = my_household_id());

drop policy if exists "Members can view household invites" on household_invites;
create policy "Members can view household invites"
  on household_invites for select using (household_id = my_household_id());

create or replace function create_household(p_name text)
returns uuid as $$
declare
  v_id uuid;
begin
  if auth.uid() is null then raise exception 'Du måste vara inloggad.'; end if;
  if my_household_id() is not null then
    raise exception 'Du är redan med i ett familjekonto.';
  end if;
  insert into households (name, created_by) values (coalesce(nullif(trim(p_name), ''), 'Mitt hushåll'), auth.uid())
  returning id into v_id;
  insert into household_members (household_id, user_id, role) values (v_id, auth.uid(), 'owner');
  return v_id;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function rename_household(p_name text)
returns void as $$
begin
  update households set name = coalesce(nullif(trim(p_name), ''), name)
  where id = my_household_id()
    and exists (select 1 from household_members where user_id = auth.uid() and role = 'owner');
end;
$$ language plpgsql security definer set search_path = public;

-- Returns the invite token; the app emails it as a link.
create or replace function invite_household_member(p_email text)
returns uuid as $$
declare
  v_household uuid := my_household_id();
  v_token uuid;
  v_email text := lower(trim(p_email));
begin
  if v_household is null then raise exception 'Skapa ett familjekonto först.'; end if;
  if v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'Ogiltig e-postadress.'; end if;
  if exists (
    select 1 from household_members m join auth.users u on u.id = m.user_id
    where m.household_id = v_household and lower(u.email) = v_email
  ) then
    raise exception 'Personen är redan med i familjekontot.';
  end if;

  select token into v_token from household_invites
  where household_id = v_household and email = v_email and accepted_at is null;
  if v_token is null then
    insert into household_invites (household_id, email, invited_by)
    values (v_household, v_email, auth.uid())
    returning token into v_token;
  end if;
  return v_token;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function revoke_household_invite(p_invite_id uuid)
returns void as $$
begin
  delete from household_invites where id = p_invite_id and household_id = my_household_id() and accepted_at is null;
end;
$$ language plpgsql security definer set search_path = public;

-- Details shown on the accept page before the user commits.
create or replace function household_invite_info(p_token uuid)
returns table (household_name text, invited_by_name text, email text, accepted boolean) as $$
  select h.name, p.name, i.email, i.accepted_at is not null
  from household_invites i
  join households h on h.id = i.household_id
  join profiles p on p.id = i.invited_by
  where i.token = p_token;
$$ language sql stable security definer set search_path = public;

create or replace function accept_household_invite(p_token uuid)
returns uuid as $$
declare
  v_invite household_invites%rowtype;
  v_email text;
begin
  if auth.uid() is null then raise exception 'Du måste vara inloggad.'; end if;
  select * into v_invite from household_invites where token = p_token;
  if v_invite.id is null then raise exception 'Inbjudan hittades inte.'; end if;
  if v_invite.accepted_at is not null then raise exception 'Inbjudan är redan använd.'; end if;

  select lower(email) into v_email from auth.users where id = auth.uid();
  if v_email is distinct from v_invite.email then
    raise exception 'Inbjudan skickades till %. Logga in med den e-postadressen för att gå med.', v_invite.email;
  end if;
  if my_household_id() is not null then
    raise exception 'Du är redan med i ett familjekonto. Lämna det först.';
  end if;

  insert into household_members (household_id, user_id, role) values (v_invite.household_id, auth.uid(), 'member');
  update household_invites set accepted_at = now() where id = v_invite.id;
  return v_invite.household_id;
end;
$$ language plpgsql security definer set search_path = public;

-- Leaving as the last member deletes the household; if the owner leaves,
-- the longest-standing member takes over.
create or replace function leave_household()
returns void as $$
declare
  v_household uuid := my_household_id();
  v_was_owner boolean;
begin
  if v_household is null then return; end if;
  select role = 'owner' into v_was_owner from household_members where household_id = v_household and user_id = auth.uid();
  delete from household_members where household_id = v_household and user_id = auth.uid();
  if not exists (select 1 from household_members where household_id = v_household) then
    delete from households where id = v_household;
  elsif v_was_owner then
    update household_members set role = 'owner'
    where household_id = v_household
      and user_id = (select user_id from household_members where household_id = v_household order by created_at limit 1);
  end if;
end;
$$ language plpgsql security definer set search_path = public;

create or replace function remove_household_member(p_user_id uuid)
returns void as $$
begin
  if not exists (
    select 1 from household_members where user_id = auth.uid() and household_id = my_household_id() and role = 'owner'
  ) then
    raise exception 'Endast familjekontots ägare kan ta bort medlemmar.';
  end if;
  if p_user_id = auth.uid() then raise exception 'Använd "Lämna familjekontot" för att ta bort dig själv.'; end if;
  delete from household_members where household_id = my_household_id() and user_id = p_user_id;
end;
$$ language plpgsql security definer set search_path = public;

-- ─── Listing access: owner, collaborators, household, admins ─────────────
-- The original policies were mutually recursive: listings' select policy
-- queried listing_collaborators, whose select policy queried listings.
-- Postgres rejects that with "infinite recursion detected in policy for
-- relation listings", so every read of listings — and every insert that
-- returns the new row, which is how the app publishes — failed. These
-- security-definer helpers read the other table without applying its RLS,
-- which breaks the cycle.
create or replace function is_listing_collaborator(p_listing_id uuid)
returns boolean as $$
  select exists (select 1 from listing_collaborators where listing_id = p_listing_id and user_id = auth.uid());
$$ language sql stable security definer set search_path = public;

create or replace function owns_listing(p_listing_id uuid)
returns boolean as $$
  select exists (select 1 from listings where id = p_listing_id and user_id = auth.uid());
$$ language sql stable security definer set search_path = public;

drop policy if exists "Owners and collaborators can view collaborators" on listing_collaborators;
create policy "Owners and collaborators can view collaborators"
  on listing_collaborators for select using (auth.uid() = user_id or owns_listing(listing_id));

drop policy if exists "Owners can remove collaborators" on listing_collaborators;
create policy "Owners can remove collaborators"
  on listing_collaborators for delete using (owns_listing(listing_id));

drop policy if exists "Active listings are viewable by everyone" on listings;
create policy "Active listings are viewable by everyone"
  on listings for select using (
    status = 'aktiv'
    or user_id = auth.uid()
    or is_listing_collaborator(id)
    or shares_household(user_id)
    or is_admin()
  );

drop policy if exists "Owners and collaborators can update listings" on listings;
create policy "Owners and collaborators can update listings"
  on listings for update using (
    auth.uid() = user_id
    or is_listing_collaborator(id)
    or shares_household(user_id)
    or is_admin()
  );

drop policy if exists "Owners and collaborators can delete listings" on listings;
create policy "Owners and collaborators can delete listings"
  on listings for delete using (
    auth.uid() = user_id
    or is_listing_collaborator(id)
    or shares_household(user_id)
    or is_admin()
  );

drop policy if exists "Admins can view all reports" on reports;
create policy "Admins can view all reports"
  on reports for select using (is_admin());

drop policy if exists "Admins can delete reports" on reports;
create policy "Admins can delete reports"
  on reports for delete using (is_admin());

-- ─── Storage: listing videos ─────────────────────────────────────────────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('listing-videos', 'listing-videos', true, 104857600, array['video/mp4', 'video/webm', 'video/quicktime'])
on conflict (id) do nothing;

-- Image bucket: create it if it's missing (a missing bucket made every
-- image upload fail, and the form used to require an image). An existing
-- bucket is left exactly as configured.
insert into storage.buckets (id, name, public, file_size_limit)
values ('listing-images', 'listing-images', true, 10485760)
on conflict (id) do nothing;

drop policy if exists "Public read listing videos" on storage.objects;
create policy "Public read listing videos"
  on storage.objects for select using (bucket_id = 'listing-videos');

drop policy if exists "Users can upload their own listing videos" on storage.objects;
create policy "Users can upload their own listing videos"
  on storage.objects for insert with check (
    bucket_id = 'listing-videos' and auth.uid()::text = (storage.foldername(name))[1]
  );

drop policy if exists "Users can delete their own listing videos" on storage.objects;
create policy "Users can delete their own listing videos"
  on storage.objects for delete using (
    bucket_id = 'listing-videos' and auth.uid()::text = (storage.foldername(name))[1]
  );

-- ─── SMTP settings ───────────────────────────────────────────────────────
-- Single-row table edited from /admin/installningar. No client can read it
-- (no select policy) — the server reads it with the service role key, and
-- the admin UI only ever learns whether a password is set, never its value.
-- SMTP_* environment variables, when set, take precedence over this row.
create table if not exists smtp_settings (
  id integer primary key default 1 check (id = 1),
  host text not null default 'smtp.gmail.com',
  port integer not null default 465,
  secure boolean not null default true,
  username text not null default '',
  password text not null default '',
  from_name text not null default 'Hyresvägen',
  from_email text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);

alter table smtp_settings enable row level security;
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

-- ═══════════════════════════════════════════════════════════════════════
-- v3 (supabase/migrations/20260930_v3.sql): accessibility amenities, ads
-- ═══════════════════════════════════════════════════════════════════════

-- ─── Accessibility amenities ─────────────────────────────────────────────
alter table listings add column if not exists stroller_friendly boolean not null default false;
alter table listings add column if not exists wheelchair_accessible boolean not null default false;

-- ─── Sponsored ads ───────────────────────────────────────────────────────
-- Direct deals with advertisers (movers, storage, cleaning, …). Rows are
-- managed by admins (profiles.is_admin) at /admin/annonsorer or in the
-- Supabase table editor. The site only shows rows that are active and
-- within their optional start/end dates.
create table if not exists ads (
  id uuid primary key default gen_random_uuid(),
  advertiser text not null,
  headline text not null,
  body text,
  image_url text,
  link_url text not null check (link_url ~* '^https?://'),
  placement text not null check (placement in ('listing_grid', 'listing_detail', 'home')),
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  clicks integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists ads_placement_idx on ads (placement) where active;

alter table ads enable row level security;

drop policy if exists "Live ads are viewable by everyone" on ads;
create policy "Live ads are viewable by everyone"
  on ads for select using (
    (active
      and (starts_at is null or starts_at <= now())
      and (ends_at is null or ends_at > now()))
    or exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin)
  );

drop policy if exists "Admins manage ads" on ads;
create policy "Admins manage ads"
  on ads for all
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.is_admin));

-- Anyone (signed in or not) can register a click, but only by +1 on a live
-- ad — the counter itself isn't writable by clients.
create or replace function record_ad_click(p_ad_id uuid)
returns void as $$
  update ads set clicks = clicks + 1
  where id = p_ad_id
    and active
    and (starts_at is null or starts_at <= now())
    and (ends_at is null or ends_at > now());
$$ language sql security definer set search_path = public;

grant execute on function record_ad_click(uuid) to anon, authenticated;

