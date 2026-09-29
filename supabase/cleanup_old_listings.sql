-- Optional, deliberate cleanup of old listings. Run AFTER
-- migrations/20260929_v2.sql, one step at a time, in the SQL editor.
-- Nothing is deleted: listings are only set to status 'avslutad', which
-- hides them from the feed. Owners can re-publish them from
-- Annonshanteraren (/annonshanterare).

-- 1. Preview: active or paused listings not updated for 60+ days.
select id, title, status, user_id, created_at, updated_at
from listings
where status in ('aktiv', 'pausad')
  and greatest(created_at, updated_at) < now() - interval '60 days'
order by updated_at;

-- 2. If the list above looks right, end them:
-- update listings
-- set status = 'avslutad', updated_at = now()
-- where status in ('aktiv', 'pausad')
--   and greatest(created_at, updated_at) < now() - interval '60 days';

-- 3. Optional: have expired listings ended every night. Enable pg_cron
--    first (Database → Extensions → pg_cron). With the v2 migration every
--    existing listing expires 60 days after the migration ran, so nothing
--    is ended before then unless the owner lets it lapse.
-- select cron.schedule('bytaren-expire-listings', '15 3 * * *', 'select public.expire_stale_listings()');
