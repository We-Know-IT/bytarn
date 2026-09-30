-- Migration 2026-09-30: v3
--
-- Run this ONCE in the Supabase SQL editor, BEFORE deploying the code that
-- uses it (publishing a listing writes the new columns). Safe to re-run.
-- It only ADDS things:
--   * columns: listings.stroller_friendly, listings.wheelchair_accessible
--   * table:   ads (sponsored slots shown on the site) + RLS policies
--   * function: record_ad_click(uuid)
--
-- The same statements are included at the end of supabase/schema.sql.

begin;

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

commit;
