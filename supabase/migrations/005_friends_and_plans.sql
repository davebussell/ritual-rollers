-- Ritual Rollers: friends, and "I'll be here" plans that only friends can put a name to (2026-10-27).
-- Run once in the Supabase SQL editor, after 004 (it uses public.is_rider()). Safe to run twice. Additive.
--
-- Dave's rule: riders can let people know they'll be at a park, but only signed-in friends see who.
-- Everyone else sees a count ("3 riders plan to be here Saturday afternoon"), never names.
-- Still no private messages.

-- ── Friends ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.friendships (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'accepted')),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  primary key (requester_id, addressee_id),
  check (requester_id <> addressee_id)
);
-- one friendship per pair, whichever way it was asked
create unique index if not exists friendships_pair_idx on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);

-- Are two riders friends (an accepted request either way)?
create or replace function public.are_friends(a uuid, b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.friendships f
    where f.status = 'accepted'
      and ((f.requester_id = a and f.addressee_id = b) or (f.requester_id = b and f.addressee_id = a))
  );
$$;

-- Spam brake: at most 30 friend requests a day.
create or replace function public.friendships_rate_limit()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.friendships where requester_id = new.requester_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'You can send up to 30 friend requests a day.';
  end if;
  return new;
end;
$$;
drop trigger if exists friendships_rate_limit on public.friendships;
create trigger friendships_rate_limit before insert on public.friendships
  for each row execute procedure public.friendships_rate_limit();

-- Accepting sets accepted_at; nothing else about a request can change.
create or replace function public.friendships_accept()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.requester_id <> old.requester_id or new.addressee_id <> old.addressee_id then
    raise exception 'A friend request can only be accepted.';
  end if;
  if new.status = 'accepted' and old.status = 'pending' then new.accepted_at := now(); end if;
  return new;
end;
$$;
drop trigger if exists friendships_accept on public.friendships;
create trigger friendships_accept before update on public.friendships
  for each row execute procedure public.friendships_accept();

alter table public.friendships enable row level security;
drop policy if exists "friendships_read" on public.friendships;
create policy "friendships_read" on public.friendships for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());
drop policy if exists "friendships_insert" on public.friendships;
create policy "friendships_insert" on public.friendships for insert
  with check (public.is_rider() and requester_id = auth.uid() and status = 'pending');
drop policy if exists "friendships_accept" on public.friendships;
create policy "friendships_accept" on public.friendships for update
  using (addressee_id = auth.uid() and status = 'pending') with check (addressee_id = auth.uid() and status = 'accepted');
drop policy if exists "friendships_delete" on public.friendships;
create policy "friendships_delete" on public.friendships for delete
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- ── Plans: "I'll be here" ───────────────────────────────────────────────────────────────
create table if not exists public.ride_plans (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.profiles(id) on delete cascade,
  spot_slug text,                       -- a featured spot, or
  park_id text,                         -- a mapped park
  place_name text not null,
  city text,                            -- the city hub slug it belongs to
  lat double precision not null,
  lng double precision not null,
  day date not null,                    -- the day, at the spot
  part text not null check (part in ('morning', 'afternoon', 'evening', 'time')),
  at_local text check (at_local is null or at_local ~ '^[0-2][0-9]:[0-5][0-9]$'),   -- 'HH:MM' at the spot, when part = 'time'
  note text check (note is null or char_length(note) <= 140),
  expires_at timestamptz not null,      -- the end of that day at the spot; gone from every list after
  created_at timestamptz not null default now(),
  check (spot_slug is not null or park_id is not null)
);
create index if not exists ride_plans_spot_idx on public.ride_plans (spot_slug, expires_at);
create index if not exists ride_plans_park_idx on public.ride_plans (park_id, expires_at);
create index if not exists ride_plans_rider_idx on public.ride_plans (rider_id, expires_at);

-- Spam brake: at most 10 plans coming up per rider, and nothing more than two weeks out.
create or replace function public.ride_plans_limits()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.ride_plans where rider_id = new.rider_id and expires_at > now()) >= 10 then
    raise exception 'You can have up to 10 plans coming up.';
  end if;
  if new.expires_at > now() + interval '15 days' or new.expires_at < now() then
    raise exception 'Plans are for the next two weeks.';
  end if;
  return new;
end;
$$;
drop trigger if exists ride_plans_limits on public.ride_plans;
create trigger ride_plans_limits before insert on public.ride_plans
  for each row execute procedure public.ride_plans_limits();

alter table public.ride_plans enable row level security;
-- Names: your own plans, and your friends' plans. Nobody else reads a row.
drop policy if exists "ride_plans_read" on public.ride_plans;
create policy "ride_plans_read" on public.ride_plans for select
  using (rider_id = auth.uid() or public.are_friends(auth.uid(), rider_id));
drop policy if exists "ride_plans_insert" on public.ride_plans;
create policy "ride_plans_insert" on public.ride_plans for insert
  with check (public.is_rider() and rider_id = auth.uid());
drop policy if exists "ride_plans_delete" on public.ride_plans;
create policy "ride_plans_delete" on public.ride_plans for delete using (rider_id = auth.uid());

-- Counts for everyone: how many riders plan to be at a place, by day and part of day. No ids, no names.
create or replace function public.plan_counts(p_spot text, p_park text)
returns table (day date, part text, at_local text, riders bigint)
language sql stable security definer set search_path = public as $$
  select p.day, p.part, p.at_local, count(distinct p.rider_id)
  from public.ride_plans p
  where p.expires_at > now()
    and ((p_spot is not null and p.spot_slug = p_spot) or (p_park is not null and p.park_id = p_park))
  group by p.day, p.part, p.at_local
  order by p.day, p.part, p.at_local;
$$;
grant execute on function public.plan_counts(text, text) to anon, authenticated;
grant execute on function public.are_friends(uuid, uuid) to authenticated;
