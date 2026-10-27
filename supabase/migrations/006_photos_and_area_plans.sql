-- Ritual Rollers: riders' park photos, and "who's riding" counts for an area (2026-10-27).
-- Run once in the Supabase SQL editor, after 004 and 005. Safe to run twice. Additive.
--
-- Dave (2026-10-27): a park-finding app where riders post photos of parks and tag the spot they plan to ride and when.
-- Plans replace sessions (the sessions tables from 004 stay, unused). Everyone sees counts; friends see names (005).

-- ── Counts for a map area: the places riders plan to be, by day. No ids, no names. ──────────
create or replace function public.plan_counts_area(min_lat double precision, min_lng double precision, max_lat double precision, max_lng double precision)
returns table (spot_slug text, park_id text, place_name text, lat double precision, lng double precision, city text, day date, part text, at_local text, riders bigint)
language sql stable security definer set search_path = public as $$
  select p.spot_slug, p.park_id, min(p.place_name), avg(p.lat), avg(p.lng), min(p.city), p.day, p.part, p.at_local, count(distinct p.rider_id)
  from public.ride_plans p
  where p.expires_at > now()
    and p.lat between min_lat and max_lat and p.lng between min_lng and max_lng
  group by p.spot_slug, p.park_id, p.day, p.part, p.at_local
  order by p.day, count(distinct p.rider_id) desc
  limit 500;
$$;
grant execute on function public.plan_counts_area(double precision, double precision, double precision, double precision) to anon, authenticated;

-- ── Riders' photos of parks ────────────────────────────────────────────────────────────────
create table if not exists public.park_photos (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  spot_slug text,
  park_id text,
  place_name text not null,
  path text not null,                   -- the file in the park-photos bucket: <rider id>/<uuid>.jpg
  width integer,
  height integer,
  caption text check (caption is null or char_length(caption) <= 200),
  status text not null default 'visible' check (status in ('visible', 'hidden')),   -- Dave hides one by setting 'hidden'
  created_at timestamptz not null default now(),
  check (spot_slug is not null or park_id is not null)
);
create index if not exists park_photos_spot_idx on public.park_photos (spot_slug, created_at desc);
create index if not exists park_photos_park_idx on public.park_photos (park_id, created_at desc);

-- Spam brake: at most 10 photos a day per rider.
create or replace function public.park_photos_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.park_photos where rider_id = new.rider_id and created_at > now() - interval '1 day') >= 10 then
    raise exception 'You can post up to 10 photos a day.';
  end if;
  new.status := 'visible';
  return new;
end;
$$;
drop trigger if exists park_photos_rate_limit on public.park_photos;
create trigger park_photos_rate_limit before insert on public.park_photos
  for each row execute procedure public.park_photos_rate_limit();

alter table public.park_photos enable row level security;
drop policy if exists "park_photos_read" on public.park_photos;
create policy "park_photos_read" on public.park_photos for select using (status = 'visible' or rider_id = auth.uid());
drop policy if exists "park_photos_insert" on public.park_photos;
create policy "park_photos_insert" on public.park_photos for insert
  with check (public.is_rider() and rider_id = auth.uid() and path like auth.uid()::text || '/%');
drop policy if exists "park_photos_delete" on public.park_photos;
create policy "park_photos_delete" on public.park_photos for delete using (rider_id = auth.uid());

-- The files: a public bucket (anyone can view), riders upload into their own folder, JPEG or WebP up to 5 MB.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('park-photos', 'park-photos', true, 5242880, array['image/jpeg', 'image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880, allowed_mime_types = array['image/jpeg', 'image/webp'];

drop policy if exists "park_photos_upload" on storage.objects;
create policy "park_photos_upload" on storage.objects for insert to authenticated
  with check (bucket_id = 'park-photos' and (storage.foldername(name))[1] = auth.uid()::text and public.is_rider());
drop policy if exists "park_photos_remove" on storage.objects;
create policy "park_photos_remove" on storage.objects for delete to authenticated
  using (bucket_id = 'park-photos' and (storage.foldername(name))[1] = auth.uid()::text);
