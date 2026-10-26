# Ritual Rollers — featured bike & pump track spots research brief

Ritual Rollers (ritualrollers.com) covers anything on wheels at purpose-built spots across Canada, the United
States and Mexico: skateboards, roller and inline skates, scooters and BMX at skateparks — plus **pump tracks,
bike parks / dirt jump parks and BMX race tracks**, which is your part. Every spot page shows a live read of
whether the ground is dry (or muddy) and rideable. Other researchers already cover skateparks; you cover the
bike side. You are building part of the **featured list**: the well-known spots a rider would travel to,
recommend, or have heard of — each with a short, sourced write-up.

## What to include
- **Pump tracks**, especially asphalt ones by known builders (Velosolutions, American Ramp Company, Progressive
  Bike Ramps, Momentum, Trail Solutions/IMBA, Rock Solid) and any that hosted Red Bull Pump Track World
  Championship qualifiers. Dirt pump tracks too if they are well known.
- **Bike parks / dirt jump parks / skills parks** in towns (urban bike parks, dirt jump lines, slopestyle
  parks, skills parks). Not lift-served mountain resorts and not trail networks — spots, not trails.
- **BMX race tracks** that are well known (national/Grand Nationals venues, Olympic training tracks,
  long-running USA BMX / BMX Canada tracks).
- **Indoor** bike parks and indoor pump tracks (important for winter/rain) — only if open today.
- Spread across the region, not just the biggest cities.

## What to leave out
- Anything closed, demolished, or private with no public access (check — several indoor bike parks have closed).
- Spots you cannot back with at least one real web source you actually opened. **Never invent** a track, a
  builder, a date, a feature or a fact. If unsure of a detail, leave it out of the text rather than guess.
- Mountain bike trail systems, road routes, velodromes.

## Output — write a JSON array to the file path given in your task, one object per spot:
```json
{
  "name": "Coler Mountain Bike Preserve",
  "city": "Bentonville",
  "region": "Arkansas",
  "country": "US",
  "lat": 36.38412,
  "lng": -94.22995,
  "coord_source": "osm",
  "kind": "bikepark",
  "features": ["dirt jumps", "pump track", "skills"],
  "surface": "dirt",
  "disciplines": ["bmx", "mtb"],
  "indoor": false,
  "lit": null,
  "cost": "free",
  "skill": "all",
  "why": "…",
  "heads_up": "…",
  "source": "https://…",
  "confidence": "high"
}
```
Field rules:
- `country`: "CA", "US" or "MX". `region`: full state/province name in English (Mexico: state name).
- `lat`/`lng`: the spot itself, 4–5 decimals. Best source first: the OpenStreetMap feature (search
  nominatim.openstreetmap.org via WebFetch, e.g. https://nominatim.openstreetmap.org/search?format=jsonv2&q=Coler+Bentonville ),
  then Wikipedia/Wikidata, then the official page's address geocoded the same way.
  `coord_source`: "osm" | "wikipedia" | "official" | "address" | "estimated" (last resort).
- `kind`: "pumptrack", "bikepark" (dirt jumps / skills / slopestyle park), "bmxtrack" (BMX race track) or "indoor".
- `features`: any of "pump track", "dirt jumps", "skills", "slopestyle", "drops", "berms", "rollers",
  "race track", "start hill", "jump line", "beginner area", "foam pit", "resi ramp".
- `surface`: "asphalt", "concrete", "dirt", "wood" or "mixed".
- `disciplines`: who rides it, from: "bmx", "mtb", "scooter", "skateboard", "roller", "inline" (asphalt pump
  tracks usually welcome all wheels — only list what the source says or clearly shows).
- `indoor`: true/false. `lit`: true/false if found, else null. `cost`: "free", "paid" or "unknown".
- `skill`: "beginner", "intermediate", "advanced" or "all".
- `why`: 1–2 sentences, specific and factual (builder, year, size, events, why riders know it). Plain and friendly,
  no hype words like "epic", "world-class", "mecca".
- `heads_up`: one practical line (closes when wet — dirt tracks especially, hours, race nights, membership or
  waiver needed, helmet rule, etc.).
- `source`: the best URL you actually opened. `confidence`: "high" when the source is official or clearly
  authoritative and coordinates are from OSM/Wikipedia; otherwise "medium".

When done, reply with only: the file path, the count by kind, and any spots you dropped as closed or unverifiable.
