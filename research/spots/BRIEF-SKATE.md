# Ritual Rollers — featured skate spots research brief

Ritual Rollers (ritualrollers.com) is becoming a skate-only site: skateboarding plus roller and inline skating,
at skateparks, plazas, DIYs and street spots across Canada, the United States and Mexico. Every spot page shows
live "is the ground dry?" skate conditions. You are building part of the **featured spot list**: the well-known
spots a skater would actually travel to, recommend, or have heard of — each with a short, sourced write-up.

## What to include
- Famous and well-regarded **skateparks** (public concrete parks especially: city flagships, X-Games/Dew Tour or
  contest venues, parks by renowned builders such as Grindline, Dreamland, Spohn Ranch, Evergreen, Team Pain,
  Airspeed, New Line, Stantec/Spectrum, Ramp Tech; historic parks; big flow/bowl parks).
- Well-known **plazas** and **indoor parks** (indoor matters for the winter/rain read — mark them indoor).
- Legendary **DIY** spots that are still standing and documented (e.g. Burnside is a DIY).
- A few iconic **street spots** that are still skateable today and publicly accessible. Only include ones you can
  confirm still exist; say in `heads_up` if security, skate-stoppers or tickets are a known risk.
- Spread across the region: not only the biggest city. Small-town gems that skaters rate highly are welcome.

## What to leave out
- Anything demolished, permanently closed, skate-stopped out of existence, or private with no public access
  (e.g. LOVE Park Philadelphia, Embarcadero SF, Hubba Hideout are gone — never list them).
- Spots you cannot back with at least one real web source you actually opened. **Never invent** a park, a
  builder, a date, a feature or a fact. If unsure of a detail, leave it out of the text rather than guess.
- Roller rinks that are not skateparks.

## Output — write a JSON array to the file path given in your task, one object per spot:
```json
{
  "name": "Burnside Skatepark",
  "city": "Portland",
  "region": "Oregon",
  "country": "US",
  "lat": 45.52292,
  "lng": -122.66425,
  "coord_source": "osm",
  "kind": "diy",
  "features": ["bowl", "transition", "pool coping"],
  "indoor": false,
  "lit": true,
  "cost": "free",
  "skill": "advanced",
  "why": "Built by local skaters under the Burnside Bridge from 1990 without permission, it became the template for DIY concrete everywhere and still holds its own sessions daily.",
  "heads_up": "Steep, tight transitions and locals who know every line — watch first, take turns.",
  "source": "https://en.wikipedia.org/wiki/Burnside_Skatepark",
  "confidence": "high"
}
```
Field rules:
- `country`: "CA", "US" or "MX". `region`: full state/province name in English ("Quebec", "Nuevo León" → "Nuevo León").
- `lat`/`lng`: the spot itself, 4–5 decimals. Best source first: the OpenStreetMap feature (search
  nominatim.openstreetmap.org, e.g. https://nominatim.openstreetmap.org/search?format=jsonv2&q=Burnside+Skatepark+Portland ),
  then Wikipedia/Wikidata coordinates, then the official page's address geocoded the same way.
  `coord_source`: "osm" | "wikipedia" | "official" | "address" | "estimated". Use "estimated" only as a last resort.
- `kind`: one of "park", "plaza", "diy", "street", "indoor", "bowl" (stand-alone bowl/pool spot).
- `features`: any of "street", "bowl", "transition", "vert", "mini ramp", "flow", "snake run", "pool coping",
  "full pipe", "ledges", "rails", "stairs", "gaps", "manual pads", "banks", "pump track", "beginner area".
- `indoor`: true for roofed/indoor parks. `lit`: true/false if you found it, else null.
- `cost`: "free", "paid" or "unknown". `skill`: "beginner", "intermediate", "advanced" or "all".
- `why`: 1–2 sentences, specific and factual (what it is, why skaters know it: builder, year, size, contests,
  history). Plain, friendly, no hype words like "epic", "world-class", "mecca".
- `heads_up`: one practical line (helmet rule, hours, closes when wet, crowded weekend afternoons, bring water,
  security on street spots, etc.).
- `source`: the best URL you actually opened (official city/park page, Wikipedia, builder project page, a
  reputable skate outlet like Thrasher, Jenkem, Transworld, Concrete Disciples, Skatepark Project/Tony Hawk
  Foundation, local news). `confidence`: "high" when the source is official or clearly authoritative and the
  coordinates are from OSM/Wikipedia; otherwise "medium".

When done, reply with only: the file path, the count by kind, and any spots you dropped as closed or unverifiable.
