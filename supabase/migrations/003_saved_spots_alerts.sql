-- Saved spots and condition alerts — the "tell me Tuesday that Thursday is a big dump" loop.
-- Run once in the Supabase SQL editor, after 002_scout_gear_crew.sql. Safe to re-run.
--
-- A rider saves the spots they ride (home hill, local break, the Gorge). For each saved
-- spot they can turn on alerts per sport. A scheduled job (Netlify Scheduled Function,
-- daily, early morning local) runs the forecast engine over every saved spot, finds
-- FIRING / RIDEABLE windows in the next 3 days, and emails riders who opted in — with a
-- one-tap link to post a roll call for that day. Delivery needs an email provider
-- (Resend free tier is enough) and a RESEND_API_KEY server env.

create table if not exists public.saved_spots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_slug text not null,              -- /spots/<slug> for indexed spots, or a /scout slug
  place_name text not null,
  lat double precision not null,
  lng double precision not null,
  sports text[] not null default '{}',   -- sport ids from lib/sports.ts the rider cares about here
  created_at timestamptz default now(),
  unique (user_id, place_slug)
);
create index if not exists saved_spots_user_idx on public.saved_spots (user_id);

create table if not exists public.alert_prefs (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  email text not null,                   -- where alerts go (defaults to the auth email)
  enabled boolean not null default true,
  min_status text not null default 'firing' check (min_status in ('firing', 'rideable')),
  lead_days int not null default 2 check (lead_days between 1 and 5),
  quiet_hours_start int default 22,      -- local hour; no sends between start and end
  quiet_hours_end int default 7,
  updated_at timestamptz default now()
);

-- One row per alert actually sent, so the job never double-sends for the same window
create table if not exists public.alerts_sent (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  place_slug text not null,
  sport text not null,
  window_date date not null,
  status text not null check (status in ('firing', 'rideable')),
  summary text not null,                 -- "Camp Fortune — 18 cm overnight, 42 cm base"
  sent_at timestamptz default now(),
  unique (user_id, place_slug, sport, window_date)
);

alter table public.saved_spots enable row level security;
alter table public.alert_prefs enable row level security;
alter table public.alerts_sent enable row level security;

-- Riders see and manage only their own; the scheduled job uses the service role.
drop policy if exists "saved_spots_own" on public.saved_spots;
create policy "saved_spots_own" on public.saved_spots for all
  using (user_id = auth.uid()) with check (public.is_rider() and user_id = auth.uid());

drop policy if exists "alert_prefs_own" on public.alert_prefs;
create policy "alert_prefs_own" on public.alert_prefs for all
  using (user_id = auth.uid()) with check (public.is_rider() and user_id = auth.uid());

drop policy if exists "alerts_sent_read_own" on public.alerts_sent;
create policy "alerts_sent_read_own" on public.alerts_sent for select
  using (user_id = auth.uid());
