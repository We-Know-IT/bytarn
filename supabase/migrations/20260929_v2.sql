-- Migration 2026-09-29: v2 (PR #12)
--
-- Run this ONCE in the Supabase SQL editor against a database that already
-- has the original schema (profiles, listings, favorites, conversations,
-- reports, listing_collaborators, interests, storage buckets). It is also
-- safe to re-run. It only ADDS things:
--   * columns: listings.video_url, view_count, expires_at;
--              profiles.is_admin, notify_email
--   * tables:  households, household_members, household_invites, smtp_settings
--   * functions, a profiles trigger, RLS policies and the listing-videos bucket
--     (an existing bucket with that name is left untouched)
-- It schedules no pg_cron job; that is an opt-in step in
-- supabase/cleanup_old_listings.sql.
-- It also fixes the recursive RLS policies between listings and
-- listing_collaborators ("infinite recursion detected in policy for relation
-- listings"), which made reading and publishing listings fail.
-- It does not change or end any existing listing: every existing listing
-- gets expires_at = now() + 60 days. Old listings are cleaned up separately
-- and deliberately with supabase/cleanup_old_listings.sql.
--
-- The same statements are included at the end of supabase/schema.sql.

begin;

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
  from_name text not null default 'Bytaren',
  from_email text not null default '',
  updated_at timestamptz not null default now(),
  updated_by uuid references profiles (id) on delete set null
);

alter table smtp_settings enable row level security;

commit;
