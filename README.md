# Ritual Rollers

**ritualrollers.com: find spots to ride and people to ride with.** Skateboards, roller and inline skates, scooters,
BMX and mountain bikes, across Canada, the US and Mexico. Every city and spot page answers three questions: where can I
ride, who rides here, and who's going when.

Since 2026-10-27 (Dave's call): no conditions, weather or temperature anywhere. The dry-ground read that lived here
for a day is in git history (`lib/skate.ts` at `9badd9d`) if it's ever wanted again.

Next.js 16 (App Router) + Tailwind 4, Supabase for accounts and sessions, Leaflet maps on OpenStreetMap tiles.

```
npm ci
npm run dev        # http://localhost:3000 (set NEXT_PUBLIC_SUPABASE_URL and _PUBLISHABLE_KEY; a placeholder URL works and shows the sample state)
npm run build
npm test           # tests/data.test.ts: samples, cities, crews, formatting
node tests/shots.mjs http://localhost:3000 /tmp/shots / /cities/ottawa   # screenshots at 375 and 1280, flags sideways scroll
```

## What's on it
- **Sessions** (`/sessions`, `/sessions/new`, `/sessions/[id]`): someone posts a spot, a day and a time, who it's for
  and whether beginners are welcome. Riders tap I'm in and comment. Public, at public spots, no private messages.
- **Crews** (`/crews`, `/crews/[slug]`, `/crews/add`): real groups (skate nights, roller groups, women's and queer
  sessions, BMX and MTB clubs, nonprofits), each with its own public links, a source and recent activity.
- **Riders** (`/riders`, `/riders/[username]`, `/me`): riders who say they're open to riding with people. City and
  chosen spots only, never where they live. Rider pages are noindex.
- **Spots** (`/spots`, `/spots/[slug]`, `/parks/[id]`): 370 researched spots plus every mapped park, each showing
  sessions, riders and crews there.
- **Cities** (`/cities`, `/cities/[slug]`, `/near/[place]`): 231 hubs (40 km); any other town goes to `/near/…`, which
  sends it to the nearest hub or shows what's around it.
- **Guidelines** (`/guidelines`): how sessions work, 16+, reporting.
- **Trail maps** (on `/parks/[id]` and featured spots that are a mapped park): the park's outline and the trails and
  track lines mapped inside it, coloured by difficulty, with the named trails listed. Skateparks show their outline and
  a link to add what's inside on OpenStreetMap; parks mapped only as a point say so.
- **Ride it in 3D** (`/ride`, `/ride/[id]`): first person on a park's real lines over the real ground (see below).
- **Shops and companies** (city and near pages; "Shops nearby" on park and spot pages): skate, roller and bike shops
  from OpenStreetMap, and researched companies (park and track builders, makers, indoor parks, schools). Board shows
  skate shops, Skates shows roller shops first, Bike shows bike shops; companies by discipline.

## Trail maps and the 3D ride (2026-10-27)
Dave asked for trail maps for every location and a game to ride them, starting with bikes and tracks.
- **Data**: `node scripts/fetch-lines.mjs` (after `fetch-skateparks.mjs`) asks QLever for each park's outline and the
  ways inside bike parks, pump tracks and BMX tracks, keeps the rideable ones (trails with `mtb:scale` /
  `mtb:scale:imba` or `sport=mtb`, `leisure=track` lines, and paths mostly inside the park), joins ways split by OSM
  into whole trails, and writes `public/lines/<id>.json` (fetched by the browser) and `data/lines-index.json` (counts,
  named trails and whether there's something to ride; read on the server by `lib/lines.ts`). A park mapped as a point
  gets no lines (a point on a trail would claim the whole trail). A pump or BMX track mapped only as an area is ridden
  along the edge of that area, and the page says so (`fromOutline`). `LINES_CACHE=<dir>` keeps QLever's answers so the
  files can be rebuilt offline. The "Refresh parks" Action runs both scripts.
- **Difficulty**: `mtb:scale:imba` first (0–1 green circle, 2 blue square, 3 black diamond, 4 double black), else
  `mtb:scale` (S0 green, S1 blue, S2 black, S3+ double black), else "not rated". The page says to trust the signs.
- **The ride** (`components/ride/RideGame.tsx`, `lib/ride/*`, three.js loaded only on `/ride/[id]`): ground from the
  AWS Open Data Terrain Tiles (terrarium PNGs, CORS open, no key; credit on the page), a 1–2 m mesh around the line;
  every line of the park drawn as a ribbon; the rider follows the chosen line (pure physics in `lib/ride/physics.ts`,
  tested in `tests/ride.test.ts`): pedal or push, pump (press down the back of a roller for speed, let go on the face),
  brake, corner speed limits (skid, then crash), air off crests and landings. Trails are ridden downhill unless they're
  one-way; tracks flow on into joining lines; a trail carries on while the next piece has the same name.
- **What's generated, said on the page**: trees everywhere, and on pump and BMX tracks the rollers, berms and start
  hill (elevation data can't see them). The lines and the shape of the ground are real.
- **Wheel picker**: Bike rides everything. Board and Skates can ride hard (non-dirt) pump tracks as a board or skates;
  elsewhere the ride says it's on a bike. `/ride` lists only what fits the pick.
- Best laps and run times are kept per browser (localStorage), not shared.

## Pick your wheels (2026-10-27)
The header has a picker: **Board** (skateboards and scooters), **Skates** (roller and inline) or **Bike** (BMX and
mountain bikes), or Everything. Until a visitor picks, a bar under the header asks "What do you ride?". The choice is
the `rr_wheel` cookie (`lib/wheels.ts`, read on the server by `lib/wheel-server.ts`), and every page then shows only
what fits: spots by their disciplines, mapped parks by kind (bike: pump, BMX and bike parks; board and skates:
skateparks and pump tracks), sessions, crews and riders by discipline. Filtered pages say so, with a "Show everything"
button; a spot that doesn't fit says so instead of hiding. Search engines carry no cookie and see everything.
Picking reloads the page (a soft refresh left the header stale).

## People and safety (Dave's decisions, 2026-10-27)
- Accounts are 16+: riders confirm their birth year and that they're 16 or older; only the fact (`age_confirmed_at`)
  is stored. Anyone can browse.
- Contact is public sessions only: I'm in and comments. No private messages.
- Friends and plans (Dave, 2026-10-27): riders send friend requests from rider pages and accept them on `/me` (a red
  count in the header shows waiting requests). On any spot or park, a rider can say "I'll be here" for a day in the
  next week (morning, afternoon, evening or a time, plus an optional note). Everyone sees how many riders plan to come
  (`plan_counts()`, no ids); only the rider and their signed-in friends see who (row-level security on `ride_plans`).
  Plans disappear after their day. Friends still can't message each other.
- Report links on sessions and profiles go to the Netlify Form `report` (emails Dave). Hosts can delete comments on
  their sessions and cancel them. At most 6 new sessions per rider per day (database trigger).
- New accounts get a neutral `rider_xxxxxx` username (they used to get their email's local part) until the rider picks one.

## Data
- **Sessions, I'm in, comments, rider profiles**: Supabase, `supabase/migrations/004_riders_and_sessions.sql`
  (additive; Dave runs it in the SQL editor). Until it's run, posting says "opens soon" and pages show samples.
- **Friends and plans**: `supabase/migrations/005_friends_and_plans.sql` (after 004; additive). Until it's run, spot
  pages leave out "Who's coming" and rider pages say friends open soon.
- **Samples** (`lib/sample.ts`): 45 made-up riders and about 48 sessions (one board, one skates and one bike session per
  sample city where a spot fits; bike ones may sit at named mapped BMX tracks, pump tracks and bike parks), always
  upcoming, always tagged Sample. They fill lists that have fewer than 3 real entries and give way as real ones arrive.
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
- **Legacy**: `data/legacy-spot-slugs.json` (636 outdoor-sport spots from before 2026-10-26) redirect to `/spots`;
  old pages from the conditions and trips versions redirect in `next.config.ts`.

## Look
Concrete and curb paint: asphalt `#1F201C`, concrete `#E5E4DF`, flyer `#FBFBF8`, curb yellow `#F2C230` (actions),
fire-lane red `#D4402A` (dates), pool blue `#2D68B0` (links, skatepark pins). Unbounded for headlines and date
numerals, Overpass for everything else. Sessions are flyers taped to the wall; everything else is quiet lists. Tokens and
component classes are in `app/globals.css` (they're emitted after Tailwind's utilities, so wrap rather than put a
conflicting utility such as `hidden` on a `.btn`).

## Deploy
Netlify project `ritual-rollers`, linked to this repo: every push to `main` builds and goes live. Work on a branch,
open a pull request for a deploy preview, merge with Dave's OK. See `CLAUDE.md`.
