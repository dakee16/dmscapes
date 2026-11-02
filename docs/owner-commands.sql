-- dormscape: commands for the Supabase SQL editor (project mvrogmmqglsrhoagfjvs).
-- NOT a migration. Copy one command at a time, change the values in quotes, then Run.
-- The tables come from docs/migrations/20261102_growth_loops.sql and 20261103_creators_avatars.sql.


-- ─── Creators ────────────────────────────────────────────────────────────────
-- Each application also arrives by email. Open their profile (instagram.com/<handle>
-- or tiktok.com/@<handle>), check the follower count and that the bio shows their DS- code.

-- Applications waiting for review, oldest first. Copy the user_id of the one to approve:
-- handles aren't unique (anyone can apply with someone else's handle), so only approve the
-- application whose code you actually saw in that account's bio.
select c.user_id, c.applied_at, p.username, c.platform, c.handle, c.followers, c.verify_code
from public.creators c join public.profiles p on p.id = c.user_id
where c.status = 'pending' order by c.applied_at;

-- Approve: adds the Creator badge and their code (dormscape.us/c/<username>, 200 uses unless you set more):
update public.creators set status = 'approved' where user_id = '00000000-0000-0000-0000-000000000000';

-- Reject, or take creator status away later (removes the badge, switches their code off):
update public.creators set status = 'rejected' where user_id = '00000000-0000-0000-0000-000000000000';

-- Every creator and their status:
select p.username, c.platform, c.handle, c.followers, c.status, c.applied_at, c.reviewed_at
from public.creators c join public.profiles p on p.id = c.user_id
order by c.applied_at desc;


-- ─── Creator codes (free Plus, once per account) ─────────────────────────────

-- Add a code by hand (lowercase; null instead of 200 = no limit, null date = never ends):
insert into public.creator_codes (code, creator, max_redemptions, expires_at)
values ('jane', 'Jane Doe (@janedorms)', 200, '2027-06-30');

-- Give a creator's code more (or fewer) uses than the default 200:
update public.creator_codes set max_redemptions = 1000 where code = 'jane';

-- Switch a code off, or back on:
update public.creator_codes set active = false where code = 'jane';
update public.creator_codes set active = true where code = 'jane';

-- How many people used each code:
select code, count(*) from public.creator_redemptions group by code order by 2 desc;


-- ─── Hall gallery ────────────────────────────────────────────────────────────

-- Layouts in one hall's gallery, newest first (the dorm id is in the hall page's address):
select id, name, gallery_at from public.saved_rooms
where dorm_id = 'atherton-hall' and gallery_at is not null and gallery_hidden_at is null
order by gallery_at desc;

-- Take one layout out of the gallery (id from the query above):
update public.saved_rooms set gallery_hidden_at = now() where id = 'AbC123xyz0';


-- ─── Security checks ─────────────────────────────────────────────────────────

-- Who may read or write storage files directly. For the avatars bucket there should be NO
-- insert, update or delete policy: only the server uploads photos.
select policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'storage' and tablename = 'objects';
