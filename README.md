# Ritual Rollers

**ritualrollers.com — dry enough to roll?** Skateparks, plazas, DIYs, street spots, pump tracks, BMX tracks and bike
parks across Canada, the US and Mexico, each with a live read of whether the ground is dry right now and when it will be.
For skateboards, roller and inline skates, scooters, BMX and mountain bikes.

Next.js 16 (App Router) + Tailwind 4, Supabase for accounts and community, Leaflet maps, Open-Meteo weather.

```
npm ci --legacy-peer-deps
npm run dev                         # http://localhost:3000
npm run build
npx tsx --test tests/skate.test.ts  # the conditions engine
```

## The ride read (`lib/skate.ts`)
The engine keeps a running figure for the water on the ground, hour by hour, starting two days back
(`lib/forecast.ts` asks Open-Meteo for `past_days=2` and 7 days ahead):

- rain adds to it, up to what the surface holds before the rest runs off;
- sun, wind and dry air take it away: Open-Meteo's FAO reference evapotranspiration (ET0), scaled per surface;
- frost locks it in (ice); snow on the ground closes outdoor spots; a melt-out leaves the ground soaked.

| Surface | holds | dry under | damp up to | dries at |
|---|---|---|---|---|
| hard (concrete, asphalt) | 1.2 mm | 0.05 mm | 0.35 mm | 1.5× ET0 by day, 1.2× at night |
| wood (outdoor ramps) | 1.5 mm | 0.05 mm | 0.3 mm | 1.0× / 0.8× |
| dirt (jumps, BMX, bike parks) | 12 mm | 1.5 mm | 4 mm (mud above) | 0.8× / 0.4× |

Each hour gets a ground state (dry, drying/soft, wet, mud, snow, ice) and a status (prime, rideable, sit it out) with a
plain line carrying the real number. Heat, cold, gusts, rain chance and darkness (lit or not) are caveats. Indoor spots
are always rideable. On top: "rideable by ~3pm", the best dry daylight windows, and a 7-day read. A place (`/scout/…`)
gets two reads, concrete and dirt. The tests in `tests/skate.test.ts` pin the behaviour down.

## Data
- **Featured spots** — `data/spots.json`, built by `node scripts/build-spots.mjs <research files…>`. Each entry was
  researched with a source (briefs: skate spots and bike spots; fields in `lib/spots-index.ts`). The build validates,
  de-duplicates and snaps coordinates to the matching OpenStreetMap feature when one is within 1.5 km under a similar
  name (`osm` field). Never add a spot without a real source; leave out anything closed or demolished.
- **Every mapped park** — `data/parks.json`: every skatepark, pump track, BMX track and bike park in OpenStreetMap for
  CA/US/MX, fetched by `scripts/fetch-skateparks.mjs` in GitHub Actions (`.github/workflows/skateparks.yml`; run it from
  the Actions tab to refresh — on `main` the refresh commit deploys). Each one has a page at `/parks/<id>`.
- **Legacy** — `data/legacy-spot-slugs.json`: the 636 outdoor-sport spots from before the relaunch, redirected to `/spots`.

## Pages
`/` home strip of live reads · `/spots` featured index (list/map, filters) · `/spots/[slug]` ride report ·
`/parks/[id]` ride report for any mapped park · `/scout` and `/scout/[place]` any town, zip or postal code ·
`/finder` four-question finder · `/crew` riders and roll calls · `/explore`, `/feed`, `/trips/…`, `/profile/…` community.

## Deploy
Netlify project `ritual-rollers`, linked to this repo: every push to `main` builds and goes live. Work on a branch,
open a pull request for a deploy preview, merge with Dave's OK. See `CLAUDE.md`.
