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

-- 3. Optional: end expired listings automatically every night. Enable
--    pg_cron first (Database → Extensions → pg_cron). cron.schedule() with a
--    job name replaces an existing job of that name, so re-running this does
--    not create duplicates. Every listing that existed when the v2 migration
--    ran expires 60 days after that, unless its owner renews it.
-- select cron.schedule('bytaren-expire-listings', '15 3 * * *', 'select public.expire_stale_listings()');
--
--    To stop it again:
-- select cron.unschedule('bytaren-expire-listings');
