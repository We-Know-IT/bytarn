-- Migration 2026-10-08: v5
--
-- Run AFTER 20261007_v4.sql, in the Supabase SQL editor. Safe to re-run.
-- Changes no data. Makes households survive when their creator deletes
-- their account (households.created_by: on delete set null instead of
-- cascade), which the new "Radera konto" feature relies on.
--
-- The same statements are included at the end of supabase/schema.sql.

begin;

-- ─── v5: account deletion ────────────────────────────────────────────────
-- households.created_by cascaded on delete, so when the person who created
-- a family account deleted their account, the whole household — and every
-- other member's membership — went with it. Keep the household; ownership
-- is handed over by leave_household() before the account is removed.
alter table households alter column created_by drop not null;
alter table households drop constraint if exists households_created_by_fkey;
alter table households
  add constraint households_created_by_fkey
  foreign key (created_by) references profiles (id) on delete set null;

commit;
