-- Run this in your Supabase SQL editor

-- Profiles (extends auth.users)
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  bio text,
  avatar_url text,
  created_at timestamptz default now()
);

-- Trips
create table public.trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text,
  cover_photo_id uuid,
  is_public boolean default true,
  upvotes_count int default 0,
  country_code varchar(2),
  activity_tags text[] default '{}',
  created_at timestamptz default now()
);

-- Migration: add country_code if running against existing DB
-- alter table public.trips add column if not exists country_code varchar(2);

-- Migration: add activity_tags array
-- alter table public.trips add column if not exists activity_tags text[] default '{}';

-- Trip collaborators (users tagged on a trip)
create table public.trip_collaborators (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  unique(trip_id, user_id)
);

-- Enable RLS
alter table public.trip_collaborators enable row level security;

-- Policies: readable by anyone who can see the trip, insertable by trip owner
create policy "collabs_read" on public.trip_collaborators for select using (
  exists (select 1 from public.trips t where t.id = trip_id and (t.is_public = true or t.owner_id = auth.uid()))
);
create policy "collabs_insert" on public.trip_collaborators for insert with check (
  exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
);
create policy "collabs_delete" on public.trip_collaborators for delete using (
  exists (select 1 from public.trips t where t.id = trip_id and t.owner_id = auth.uid())
);

-- Migration: add is_recreation and recreation_ref to trips
-- alter table public.trips add column if not exists is_recreation boolean default false;
-- alter table public.trips add column if not exists recreation_ref text;

-- Trip photos
create table public.trip_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  lat double precision,
  lng double precision,
  taken_at timestamptz,
  caption text,
  sequence_order int default 0,
  created_at timestamptz default now()
);

-- Add cover_photo_id FK after trip_photos exists
alter table public.trips
  add constraint trips_cover_photo_id_fkey
  foreign key (cover_photo_id) references public.trip_photos(id) on delete set null;

-- Follows
create table public.follows (
  follower_id uuid references public.profiles(id) on delete cascade,
  following_id uuid references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (follower_id, following_id)
);

-- Upvotes
create table public.upvotes (
  user_id uuid references public.profiles(id) on delete cascade,
  trip_id uuid references public.trips(id) on delete cascade,
  primary key (user_id, trip_id)
);

-- Auto-create profile on first sign-in (magic link creates user row on first use)
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  base_username text;
  final_username text;
  suffix int := 0;
begin
  base_username := coalesce(
    new.raw_user_meta_data->>'username',
    split_part(new.email, '@', 1),
    'explorer_' || substr(new.id::text, 1, 8)
  );

  -- Ensure username is non-empty (anonymous users have no email)
  if base_username = '' then
    base_username := 'explorer_' || substr(new.id::text, 1, 8);
  end if;
  -- Ensure username is unique by appending a number if needed
  final_username := base_username;
  loop
    exit when not exists (select 1 from public.profiles where username = final_username);
    suffix := suffix + 1;
    final_username := base_username || suffix::text;
  end loop;
  insert into public.profiles (id, username)
  values (new.id, final_username)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Trigger to keep upvotes_count in sync
create or replace function public.update_upvotes_count()
returns trigger language plpgsql as $$
begin
  if TG_OP = 'INSERT' then
    update public.trips set upvotes_count = upvotes_count + 1 where id = new.trip_id;
  elsif TG_OP = 'DELETE' then
    update public.trips set upvotes_count = upvotes_count - 1 where id = old.trip_id;
  end if;
  return null;
end;
$$;

create trigger on_upvote_change
  after insert or delete on public.upvotes
  for each row execute procedure public.update_upvotes_count();

-- RLS Policies
alter table public.profiles enable row level security;
alter table public.trips enable row level security;
alter table public.trip_photos enable row level security;
alter table public.follows enable row level security;
alter table public.upvotes enable row level security;

-- Profiles: anyone can read, only owner can update
create policy "profiles_read" on public.profiles for select using (true);
create policy "profiles_update" on public.profiles for update using (auth.uid() = id);

-- Trips: public trips readable by all, owner can do anything
create policy "trips_read_public" on public.trips for select using (is_public = true or auth.uid() = owner_id);
create policy "trips_insert" on public.trips for insert with check (auth.uid() = owner_id);
create policy "trips_update" on public.trips for update using (auth.uid() = owner_id);
create policy "trips_delete" on public.trips for delete using (auth.uid() = owner_id);

-- Trip photos: readable if trip is public, authenticated users can insert
create policy "trip_photos_read" on public.trip_photos for select using (
  exists (select 1 from public.trips t where t.id = trip_id and (t.is_public = true or t.owner_id = auth.uid()))
);
create policy "trip_photos_insert" on public.trip_photos for insert with check (auth.uid() = uploader_id);
create policy "trip_photos_delete" on public.trip_photos for delete using (auth.uid() = uploader_id);

-- Follows: anyone can read, authenticated users manage their own
create policy "follows_read" on public.follows for select using (true);
create policy "follows_insert" on public.follows for insert with check (auth.uid() = follower_id);
create policy "follows_delete" on public.follows for delete using (auth.uid() = follower_id);

-- Upvotes: anyone can read, authenticated users manage their own
create policy "upvotes_read" on public.upvotes for select using (true);
create policy "upvotes_insert" on public.upvotes for insert with check (auth.uid() = user_id);
create policy "upvotes_delete" on public.upvotes for delete using (auth.uid() = user_id);

-- Storage bucket (run in Supabase dashboard or via API)
-- Create bucket named "trip-photos" with public access

-- Anonymous auth (required for guest posting)
-- Supabase dashboard → Authentication → Settings → Enable Anonymous sign-ins (toggle ON)
-- This lets visitors publish trips without an account; anonymous sessions can later be
-- linked to a real account via supabase.auth.linkIdentity() or a normal sign-up flow.

-- Auth settings (Supabase dashboard → Authentication → Providers)
-- Enable "Email" provider, turn ON "Enable magic link" (passwordless)
-- Set Site URL to your domain (e.g. http://localhost:3000 for dev)
-- Add http://localhost:3000/auth/callback to "Redirect URLs"
