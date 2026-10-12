-- Scout · Gear · Crew — phase 2 and 3 tables.
-- Run once in the Supabase SQL editor. Safe to re-run (IF NOT EXISTS everywhere).
--
-- Writes to `places` and `spot_cache` come from the server using the service role key
-- (bypasses RLS). Community writes (gear shops, confirmations, roll calls) are gated to
-- signed-in, non-anonymous riders; everything is publicly readable.

-- ── Places: a stable identity for every spot that has been scouted ──────────────
create table if not exists public.places (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  country_code varchar(2),
  lat double precision not null,
  lng double precision not null,
  created_at timestamptz default now(),
  last_scouted_at timestamptz default now()
);

-- ── Spot cache: map-data results per place so the report never waits on Overpass ──
create table if not exists public.spot_cache (
  key text primary key,            -- e.g. 'spots:36.014,-5.604:40' or 'gear:…'
  payload jsonb not null,
  expires_at timestamptz not null,
  updated_at timestamptz default now()
);

-- ── Gear directory: seeded from OpenStreetMap, grown and confirmed by riders ─────
create table if not exists public.gear_shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  lat double precision not null,
  lng double precision not null,
  sports text[] default '{}',       -- sport ids from lib/sports.ts, e.g. {kite,wing,surf}
  services text[] default '{}',     -- any of: rent, buy, lessons, guide
  website text,
  phone text,
  hours text,
  source text not null default 'community' check (source in ('osm', 'community')),
  osm_id text unique,               -- 'node-123' / 'way-456' when seeded from OSM
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists gear_shops_lat_lng_idx on public.gear_shops (lat, lng);

create table if not exists public.gear_confirmations (
  shop_id uuid references public.gear_shops(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  note text,
  created_at timestamptz default now(),
  primary key (shop_id, user_id)
);

-- ── Roll calls: "Tarifa, 20–27 Sep, kiting, intermediate — who's in?" ───────────
create table if not exists public.crew_calls (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  place_slug text not null,
  place_name text not null,
  lat double precision not null,
  lng double precision not null,
  sport text not null,              -- sport id from lib/sports.ts
  starts_on date not null,
  ends_on date not null,
  level text check (level in ('beginner', 'intermediate', 'advanced', 'all')),
  note text,
  created_at timestamptz default now(),
  check (ends_on >= starts_on)
);
create index if not exists crew_calls_place_idx on public.crew_calls (place_slug, starts_on);

create table if not exists public.crew_call_members (
  call_id uuid references public.crew_calls(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (call_id, user_id)
);

-- ── Row-level security ──────────────────────────────────────────────────────────
alter table public.places enable row level security;
alter table public.spot_cache enable row level security;
alter table public.gear_shops enable row level security;
alter table public.gear_confirmations enable row level security;
alter table public.crew_calls enable row level security;
alter table public.crew_call_members enable row level security;

-- A signed-in rider who is not a guest (anonymous) session
create or replace function public.is_rider()
returns boolean language sql stable as $$
  select auth.uid() is not null
     and coalesce((auth.jwt() ->> 'is_anonymous')::boolean, false) = false
$$;

-- places / spot_cache: public read; only the service role writes
drop policy if exists "places_read" on public.places;
create policy "places_read" on public.places for select using (true);
drop policy if exists "spot_cache_read" on public.spot_cache;
create policy "spot_cache_read" on public.spot_cache for select using (true);

-- gear_shops: public read; riders add, and edit what they added
drop policy if exists "gear_shops_read" on public.gear_shops;
create policy "gear_shops_read" on public.gear_shops for select using (true);
drop policy if exists "gear_shops_insert" on public.gear_shops;
create policy "gear_shops_insert" on public.gear_shops for insert
  with check (public.is_rider() and added_by = auth.uid() and source = 'community');
drop policy if exists "gear_shops_update" on public.gear_shops;
create policy "gear_shops_update" on public.gear_shops for update
  using (public.is_rider() and added_by = auth.uid());
drop policy if exists "gear_shops_delete" on public.gear_shops;
create policy "gear_shops_delete" on public.gear_shops for delete
  using (public.is_rider() and added_by = auth.uid());

-- gear_confirmations: public read; riders confirm once per shop, and can withdraw
drop policy if exists "gear_confirmations_read" on public.gear_confirmations;
create policy "gear_confirmations_read" on public.gear_confirmations for select using (true);
drop policy if exists "gear_confirmations_insert" on public.gear_confirmations;
create policy "gear_confirmations_insert" on public.gear_confirmations for insert
  with check (public.is_rider() and user_id = auth.uid());
drop policy if exists "gear_confirmations_delete" on public.gear_confirmations;
create policy "gear_confirmations_delete" on public.gear_confirmations for delete
  using (user_id = auth.uid());

-- crew_calls: public read; riders post, and manage their own
drop policy if exists "crew_calls_read" on public.crew_calls;
create policy "crew_calls_read" on public.crew_calls for select using (true);
drop policy if exists "crew_calls_insert" on public.crew_calls;
create policy "crew_calls_insert" on public.crew_calls for insert
  with check (public.is_rider() and owner_id = auth.uid());
drop policy if exists "crew_calls_update" on public.crew_calls;
create policy "crew_calls_update" on public.crew_calls for update
  using (owner_id = auth.uid());
drop policy if exists "crew_calls_delete" on public.crew_calls;
create policy "crew_calls_delete" on public.crew_calls for delete
  using (owner_id = auth.uid());

-- crew_call_members: public read; riders join and leave for themselves
drop policy if exists "crew_call_members_read" on public.crew_call_members;
create policy "crew_call_members_read" on public.crew_call_members for select using (true);
drop policy if exists "crew_call_members_insert" on public.crew_call_members;
create policy "crew_call_members_insert" on public.crew_call_members for insert
  with check (public.is_rider() and user_id = auth.uid());
drop policy if exists "crew_call_members_delete" on public.crew_call_members;
create policy "crew_call_members_delete" on public.crew_call_members for delete
  using (user_id = auth.uid());
