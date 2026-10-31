-- "See it in your room" photo renders, 2026-10-31. NOT APPLIED. Review, then run
-- once in the Supabase SQL editor for project mvrogmmqglsrhoagfjvs.
--
-- A Pro member uploads a photo of their room and gets an AI picture of it dressed
-- in their plan (/api/photo-render). Each render spends one plan credit. Both
-- images live in the private room-photos bucket at <user_id>/<render id>/photo.jpg
-- and render.<ext>; the app reads and writes them only with the service-role key
-- and hands the owner short-lived signed links. A daily cron
-- (/api/photo-render/cleanup) deletes the files and rows once expires_at passes,
-- 14 days after the render. Until this runs, the route answers "not switched on
-- yet" before any credit is spent.
--
-- design: { "roomType": "double", "occupants": 2, "lengthFt": 15, "widthFt": 12,
--           "style": "cozy", "styleName": "Cozy Aesthetic", "items": 12 }
-- usage:  whatever AI Gateway reports for the request (tokens, cost), or null

begin;

create table public.photo_renders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'done', 'failed')),
  photo_path text,
  render_path text,
  model text not null check (char_length(model) between 1 and 120),
  design jsonb not null default '{}'::jsonb check (jsonb_typeof(design) = 'object'),
  usage jsonb,
  error text check (error is null or char_length(error) <= 500),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '14 days'
);

create index photo_renders_user_idx on public.photo_renders (user_id, created_at desc);
create index photo_renders_expiry_idx on public.photo_renders (expires_at);

alter table public.photo_renders enable row level security;

-- Owners can read their own rows; all writes go through the server.
create policy "photo renders: owners read" on public.photo_renders
  for select to authenticated using ((select auth.uid()) = user_id);

revoke all on public.photo_renders from anon;

-- Private bucket, 8 MB per file, images only. No storage policies: only the
-- service role reads or writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('room-photos', 'room-photos', false, 8388608, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

commit;
