# Ritual Rollers

**ritualrollers.com: find a park to ride.** Skateparks, pump tracks, BMX tracks and bike parks across Canada, the US and
Mexico, for skateboards, roller and inline skates, scooters, BMX and mountain bikes. Every park has a 3D map, photos of
people riding it where we have them, and who's riding it this week. Riders tag the spot they're riding and when, add
friends, and post their own photos. Races and contests are organised by place, with sourced results.

Dave's calls on 2026-10-27: no conditions, weather or temperature anywhere; the 3D ride game was dropped the same day it
shipped ("a bust"), and sessions were folded into plans ("tag a spot").

Next.js 16 (App Router) + Tailwind 4, Supabase for accounts, plans, friends and photos, MapLibre for the 3D park maps,
Leaflet for the flat city maps.

```
npm ci
npm run dev        # http://localhost:3000 (set NEXT_PUBLIC_SUPABASE_URL and _PUBLISHABLE_KEY; a placeholder URL works and shows the sample state)
npm run build      # prebuild copies MapLibre's worker into public/maplibre/
npm test           # tests/*.test.ts: samples, cities, crews, formatting, maps, profiles, plans
node tests/shots.mjs http://localhost:3000 /tmp/shots / /cities/ottawa   # screenshots at 375 and 1280, flags sideways scroll
```

## What's on it
- **Spots and parks** (`/spots`, `/spots/[slug]`, `/parks/[id]`): 370 researched spots plus every mapped park. Each page:
  a banner photo when we have one, photos of people riding it, the park in 3D, who's riding it this week, races held
  there, riders who ride it, crews and shops nearby.
- **3D park maps** (`components/ParkMap3D.tsx`): MapLibre GL with OpenFreeMap's vector tiles (OpenStreetMap; 3D
  buildings), terrain and hillshade from the AWS Terrain Tiles (terrarium, no key), the park's outline and every trail or
  track line on top, framed as close as the whole park fits. Tilt, spin and zoom; tap a trail for its elevation profile
  (climb, drop, steepest 30 m, coloured by grade; `lib/profile.ts`), then "Fly it" sweeps the camera down the line.
  US parks get a satellite option (USGS orthoimagery, public domain, about 2 m). Heights are exaggerated ×1.2–2.2 by
  the park's relief and the map says so. No WebGL: the flat Leaflet trail map instead. MapLibre's worker is served from
  `public/maplibre/` (`scripts/copy-maplibre-worker.mjs`, run before dev and build; the bundler can't find it otherwise).
- **Tag a spot / Who's riding** (`/tag`, `/riding`, "Who's riding" on city, near and park pages): a rider picks a park,
  a day in the next week and a rough time. Everyone sees counts; the rider's signed-in friends see names
  (`plan_counts()`, `plan_counts_area()`, row-level security on `ride_plans`). Old `/sessions` URLs redirect.
- **Friends** (`/riders/[username]`, `/me`): request and accept; a red count in the header shows waiting requests.
- **Photos**: openly licensed photos of people riding (below), and riders' own uploads (resized to 1600 px and
  re-encoded in the browser, which drops location data; consent box; report link; Dave hides one by setting
  `park_photos.status = 'hidden'`).
- **Races and contests** (`/events`, `/events/[slug]`, `/athletes/[slug]`): downhill and street luge, skate contests,
  BMX and bike park events by place, each event's course or park in 3D, results by year with a source for every line,
  and the riders (adults only, public results only), starting with Kolby Parks.
- **Crews** (`/crews`), **Riders** (`/riders`, noindex rider pages), **Cities** (`/cities`, `/near/[place]`),
  **Shops and companies** on city pages, **Guidelines** (`/guidelines`).

## Photos (2026-10-27)
Dave wants authentic shots of people riding the parks, vintage first. Only photos we're allowed to republish:
public domain, CC0, CC BY, CC BY-SA, or an Open Government Licence, each credited with its licence and a link to its
source. Never NC/ND, never all-rights-reserved, never copied from Instagram, TikTok, Facebook or news sites.
- Research: `research/photos/BRIEF.md`, results in `research/photos/*.json`.
- Build: `node scripts/build-photos.mjs research/photos/*.json` re-checks every Wikimedia Commons file's licence, author
  and date against the Commons API, drops anything not allowed, photos whose subject is a child, and photos not matched
  to a park, downloads each once (cache in `.cache/photos`, git-ignored), and writes `public/photos/<id>.jpg` (1600 px)
  and `<id>-640.jpg` plus `data/photos.json`.
- Parks with photos are the featured parks (home page "Parks, ridden", page banners).
- Social media photos: only with the photographer's permission. Dave sends the requests
  (`research/photos/permission-requests.md` lists posts per park and a draft message); approved photos are added to
  a research file with `"licence": "Used with permission"` and the permission noted, and the build script must be
  told to accept them (it doesn't yet).

## People and safety (Dave's decisions, 2026-10-27)
- Accounts are 16+: riders confirm their birth year and that they're 16 or older; only the fact (`age_confirmed_at`)
  is stored. Anyone can browse.
- No private messages. Riders reach each other through friends and tagged spots.
- Friends and plans (Dave, 2026-10-27): riders send friend requests from rider pages and accept them on `/me` (a red
  count in the header shows waiting requests). On any spot or park, a rider can say "I'll be here" for a day in the
  next week (morning, afternoon, evening or a time, plus an optional note). Everyone sees how many riders plan to come
  (`plan_counts()`, no ids); only the rider and their signed-in friends see who (row-level security on `ride_plans`).
  Plans disappear after their day. Friends still can't message each other.
- Report links on photos, profiles and rider pages go to the Netlify Form `report` (emails Dave). At most 10 plans
  coming up and 10 photos a day per rider (database triggers).
- New accounts get a neutral `rider_xxxxxx` username (they used to get their email's local part) until the rider picks one.

## Data
- **Rider profiles** (and the retired sessions tables): Supabase, `supabase/migrations/004_riders_and_sessions.sql`
  (additive; Dave runs it in the SQL editor). Until it's run, posting says "opens soon" and pages show samples.
- **Friends and plans**: `supabase/migrations/005_friends_and_plans.sql` (after 004; additive). Until it's run, spot
  pages leave out "Who's coming" and rider pages say friends open soon.
- **Samples** (`lib/sample.ts`): 45 made-up riders and sample plans (one place per wheel per sample city, at real spots,
  always this week, always tagged Sample). They fill lists that have fewer than 3 real entries and give way as real ones arrive.
- **Featured spots**: `data/spots.json`, built by `node scripts/build-spots.mjs research/spots/*.json` (sources,
  briefs and gaps in `research/spots/`). Never add a spot without a real source; leave out anything closed.
- **Every mapped park**: `data/parks.json`, from OpenStreetMap via the "Refresh parks" GitHub Action
  (`scripts/fetch-skateparks.mjs`). Their outlines and lines: `public/lines/` and `data/lines-index.json`
  (`scripts/fetch-lines.mjs`, same Action).
- **Shops**: `data/shops.json`, from OpenStreetMap (`scripts/fetch-shops.mjs`, same Action): `shop=bicycle` → bike;
  skate shops by `shop=skate…`, `shop=sports` + `sport=skateboard|roller_skating|inline`, or a skate or board shop
  name; hockey and figure skating shops and big-box chains are left out. Shops without a name are skipped.
- **Companies**: `data/companies.json`, built by `node scripts/build-companies.mjs research/companies/*.json` (brief in
  `research/companies/BRIEF.md`). Every company has its own link, a source and evidence of activity in 2025–26.
  City pages show those within 80 km, or the three nearest within 400 km.
- **Cities**: `data/cities.json`, built by `node scripts/build-cities.mjs` (metro list in the script; Nominatim
  results cached in `research/cities/geocode.json`).
- **Crews**: `data/crews.json`, built by `node scripts/build-crews.mjs research/crews/*.json` (brief in
  `research/crews/BRIEF.md`). New and updated crews come in through the Netlify Form `crew` (`/crews/add`); check the
  group's own page, add it to a research file, rebuild.
- **Plans, friends, photos**: `supabase/migrations/005_friends_and_plans.sql` then `006_photos_and_area_plans.sql`
  (after 004; additive; Dave runs them). Until they're run, tagging and photo uploads say they open soon and lists show
  samples.
- **Races and riders**: `data/events.json`, `data/athletes.json`, built by `node scripts/build-events.mjs` from
  `research/events/events.json` and `riders.json` (brief in `research/events/BRIEF.md`). Every result needs a source;
  riders without a sourced result are dropped.
- **Legacy**: `data/legacy-spot-slugs.json` (636 outdoor-sport spots from before 2026-10-26) redirect to `/spots`;
  old pages from the conditions and trips versions redirect in `next.config.ts`.

## Look
Concrete and curb paint: asphalt `#1F201C`, concrete `#E5E4DF`, flyer `#FBFBF8`, curb yellow `#F2C230` (actions),
fire-lane red `#D4402A` (dates), pool blue `#2D68B0` (links, skatepark pins). Unbounded for headlines and date
numerals, Overpass for everything else. Photos of people riding lead; everything else is quiet lists. Tokens and
component classes are in `app/globals.css` (they're emitted after Tailwind's utilities, so wrap rather than put a
conflicting utility such as `hidden` on a `.btn`).

## Deploy
Netlify project `ritual-rollers`, linked to this repo: every push to `main` builds and goes live. Work on a branch,
open a pull request for a deploy preview, merge with Dave's OK. See `CLAUDE.md`.
