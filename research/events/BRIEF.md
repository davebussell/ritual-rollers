# Brief: riders and events worth featuring (Ritual Rollers)

ritualrollers.com is the place to find spots to ride across Canada, the US and Mexico: skateparks, pump tracks, BMX
tracks, bike parks, and now the roads and courses where people race downhill. Dave wants to **feature riders like
Kolby Parks (Prince Edward County, Ontario; street luge world champion) and his results and races down streets**, and
to organise it by place: the fixed spots and courses, and the past events held at each.

## What to find
1. **Events** in CA/US/MX, past and recurring: downhill skateboarding and street luge races (IDSF / World Skate
   downhill, IGSA, national championships, festivals such as races in Picton, ON or Maryhill, WA), park, bowl and street
   skateboarding contests, BMX racing and freestyle, aggressive inline and roller, scooter contests, and bike park
   events (slopestyle, dual slalom, pump track world championship qualifiers).
   For each: name, discipline, the place (the course or park, with coordinates of the start or the park), the years it
   ran, the organiser, the official results page, and the podium (top 3 per main class) for the most recent years you
   can source.
2. **Riders** who are adults (18+) with public competition results: start with Kolby Parks, then riders who placed at
   the events you found, favouring riders tied to a place in CA/US/MX. For each: name as they compete, discipline,
   home region as publicly reported, notable results (event, year, class, place, with a source link each), official
   links (their own site, federation profile, team page).

## Rules
- Facts from competition results, federation and event pages, and reputable news only. Every result needs a source
  link you opened. Never guess a placing or a year.
- Public sporting facts only: no family, home address, school, phone, email, health or anything personal beyond what an
  athlete's own bio or a news profile states about their riding. Skip anyone under 18.
- Photos: only if openly licensed (CC BY, CC BY-SA, CC0, public domain) on a page you read; otherwise none.
- About text in your own words.

## Output
Two JSON arrays, written to the paths you're given:

`events`:
```json
{
  "name": "Canadian Downhill Skateboard Championships",
  "slug": "canadian-downhill-championships-picton",
  "disciplines": ["downhill", "street-luge"],        // downhill | street-luge | skateboard | bmx | inline | roller | scooter | mtb
  "kind": "race",                                     // race | contest | festival | series
  "place": "Glenwood Cemetery road, Picton",          // the course or park as named by the organiser
  "city": "Picton", "region": "Ontario", "country": "CA",
  "lat": 44.0, "lng": -77.14, "coords": "course",    // course | park | city
  "park_id": null, "spot_slug": null,                 // from data/parks.json / data/spots.json when it's at a park
  "years": [2024, 2025, 2026],
  "organiser": "…",
  "about": "One or two sentences in your own words.",
  "results": [ { "year": 2026, "class": "Street luge open", "podium": ["Name", "Name", "Name"], "source": "https://…" } ],
  "links": { "website": "https://…", "results": "https://…" },
  "source": "https://…"
}
```
`riders`:
```json
{
  "name": "Kolby Parks",
  "slug": "kolby-parks",
  "disciplines": ["street-luge"],
  "home": "Prince Edward County, Ontario",
  "country": "CA",
  "lat": 44.0, "lng": -77.2,                          // the home region's centre, for the map
  "about": "Two sentences in your own words about their riding.",
  "results": [ { "year": 2025, "event": "…", "event_slug": "…", "class": "…", "place": 1, "source": "https://…" } ],
  "links": { "website": "https://…", "instagram": "https://…" },
  "sources": ["https://…"]
}
```
Validate both files (python3 -m json.tool). Report: counts by country and discipline, which events have results and
which don't, riders and how many sourced results each, what you left out and why, and gaps.
