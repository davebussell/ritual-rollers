-- Ritual Rollers: rider profiles, sessions, "I'm in" and comments (2026-10-27).
-- Run once in the Supabase SQL editor (Dashboard → SQL Editor → paste → Run). Safe to run twice.
-- Additive: it adds columns to profiles and new tables; nothing existing is dropped or rewritten.
-- It replaces the drafts 002 (crew calls) and 003 (dry-ground alerts), which were never needed and are retired;
-- if 002 was ever run, its tables simply sit unused.

-- ── Rider profiles ───────────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists disciplines text[] not null default '{}',     -- skateboard, roller, inline, scooter, bmx, mtb
  add column if not exists level text,                                    -- new | learning | comfortable | advanced
  add column if not exists home_city text,                                -- a city hub slug (data/cities.json)
  add column if not exists home_spots text[] not null default '{}',       -- spot slugs (data/spots.json) or park ids
  add column if not exists open_to_ride boolean not null default false,   -- listed on /riders
  add column if not exists age_confirmed_at timestamptz;                  -- when the rider confirmed they are 16 or older

-- New accounts used to get their email's local part as a public username. Use a neutral handle instead;
-- riders pick their own when they set up their profile.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  final_username text;
begin
  loop
    final_username := 'rider_' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
    exit when not exists (select 1 from public.profiles where username = final_username);
  end loop;
  insert into public.profiles (id, username) values (new.id, final_username) on conflict (id) do nothing;
  return new;
end;
$$;

-- A rider: signed in with a real account (not anonymous) and confirmed 16+.
create or replace function public.is_rider()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.age_confirmed_at is not null and coalesce(u.is_anonymous, false) = false
  );
$$;

-- ── Sessions: "I'm riding here, then — come along" ───────────────────────────
create table if not exists public.ride_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 3 and 80),
  notes text check (notes is null or char_length(notes) <= 1000),
  spot_slug text,                       -- a featured spot, or
  park_id text,                         -- a mapped park
  place_name text not null,             -- the spot's name, as shown
  city text,                            -- the city hub slug it belongs to
  lat double precision not null,
  lng double precision not null,
  starts_at timestamptz not null,       -- for sorting and "upcoming"
  starts_local text not null,           -- 'YYYY-MM-DDTHH:MM' wall-clock time at the spot, for display
  disciplines text[] not null default '{}',
  level text not null default 'all' check (level in ('all', 'new', 'learning', 'comfortable', 'advanced')),
  beginners_welcome boolean not null default false,
  cancelled boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists ride_sessions_starts_idx on public.ride_sessions (starts_at);
create index if not exists ride_sessions_city_idx on public.ride_sessions (city, starts_at);
create index if not exists ride_sessions_spot_idx on public.ride_sessions (spot_slug, starts_at);

create table if not exists public.ride_session_riders (
  session_id uuid not null references public.ride_sessions(id) on delete cascade,
  rider_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (session_id, rider_id)
);

create table if not exists public.ride_session_comments (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.ride_sessions(id) on delete cascade,
  rider_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 500),
  created_at timestamptz not null default now()
);
create index if not exists ride_session_comments_idx on public.ride_session_comments (session_id, created_at);

-- Spam brake: at most 6 new sessions per rider per day.
create or replace function public.ride_sessions_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.ride_sessions where host_id = new.host_id and created_at > now() - interval '1 day') >= 6 then
    raise exception 'You can post up to 6 sessions a day.';
  end if;
  return new;
end;
$$;
drop trigger if exists ride_sessions_rate_limit on public.ride_sessions;
create trigger ride_sessions_rate_limit before insert on public.ride_sessions
  for each row execute procedure public.ride_sessions_rate_limit();

-- ── Who can do what ──────────────────────────────────────────────────────────
alter table public.ride_sessions enable row level security;
alter table public.ride_session_riders enable row level security;
alter table public.ride_session_comments enable row level security;

drop policy if exists "ride_sessions_read" on public.ride_sessions;
create policy "ride_sessions_read" on public.ride_sessions for select using (true);
drop policy if exists "ride_sessions_insert" on public.ride_sessions;
create policy "ride_sessions_insert" on public.ride_sessions for insert
  with check (public.is_rider() and host_id = auth.uid() and starts_at > now() - interval '1 hour');
drop policy if exists "ride_sessions_update" on public.ride_sessions;
create policy "ride_sessions_update" on public.ride_sessions for update
  using (host_id = auth.uid()) with check (host_id = auth.uid());
drop policy if exists "ride_sessions_delete" on public.ride_sessions;
create policy "ride_sessions_delete" on public.ride_sessions for delete using (host_id = auth.uid());

drop policy if exists "ride_session_riders_read" on public.ride_session_riders;
create policy "ride_session_riders_read" on public.ride_session_riders for select using (true);
drop policy if exists "ride_session_riders_insert" on public.ride_session_riders;
create policy "ride_session_riders_insert" on public.ride_session_riders for insert
  with check (public.is_rider() and rider_id = auth.uid());
drop policy if exists "ride_session_riders_delete" on public.ride_session_riders;
create policy "ride_session_riders_delete" on public.ride_session_riders for delete using (rider_id = auth.uid());

drop policy if exists "ride_session_comments_read" on public.ride_session_comments;
create policy "ride_session_comments_read" on public.ride_session_comments for select using (true);
drop policy if exists "ride_session_comments_insert" on public.ride_session_comments;
create policy "ride_session_comments_insert" on public.ride_session_comments for insert
  with check (public.is_rider() and rider_id = auth.uid());
drop policy if exists "ride_session_comments_delete" on public.ride_session_comments;
create policy "ride_session_comments_delete" on public.ride_session_comments for delete using (
  rider_id = auth.uid()
  or exists (select 1 from public.ride_sessions s where s.id = session_id and s.host_id = auth.uid())
);
