-- Migration 2026-10-12: v7
--
-- Run AFTER 20261008_v6.sql, in the Supabase SQL editor. Safe to re-run.
-- Changes no existing data. It:
--   * stops counting a listing's views when its owner opens it
--   * adds listing_stats(uuid[]) — per-listing counts of favourites,
--     interest and conversations, for listings the caller may manage
--     (owner, collaborator or same family account). Favourites are private
--     to whoever saved them, so the count needs a security definer function.
--
-- The same statements are included at the end of supabase/schema.sql.

begin;

create or replace function increment_listing_view(p_listing_id uuid)
returns void as $$
  update listings set view_count = view_count + 1
  where id = p_listing_id
    and status = 'aktiv'
    and (auth.uid() is null or user_id <> auth.uid());
$$ language sql security definer set search_path = public;

grant execute on function increment_listing_view(uuid) to anon, authenticated;

create or replace function listing_stats(p_listing_ids uuid[])
returns table (listing_id uuid, favorites integer, interests integer, conversations integer) as $$
  select
    l.id,
    (select count(*) from favorites f where f.listing_id = l.id)::integer,
    (select count(*) from interests i where i.listing_id = l.id)::integer,
    (select count(*) from conversations c where c.listing_id = l.id)::integer
  from listings l
  where l.id = any(p_listing_ids)
    and (
      l.user_id = auth.uid()
      or shares_household(l.user_id)
      or exists (select 1 from listing_collaborators lc where lc.listing_id = l.id and lc.user_id = auth.uid())
    );
$$ language sql stable security definer set search_path = public;

grant execute on function listing_stats(uuid[]) to authenticated;

commit;
