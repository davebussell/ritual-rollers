# Brief: real crews and groups to ride with (Ritual Rollers)

ritualrollers.com is being rebuilt as the place to find **spots to ride and people to ride with** — anything on wheels,
ridden hard: skateboards, roller skates, inline skates, scooters, BMX and mountain bikes (pump tracks, dirt jumps,
bike parks). No motorized sports, no road cycling clubs, no trail-running.

Your job: find **real, currently active groups** people can join or show up to in your assigned cities, so a rider who
moves to a new town (or is a beginner, or an adult starting late) can find their people.

## What counts
- Skate crews and collectives with a public page (Instagram, website, Facebook group, Meetup, Discord)
- Regular open sessions: roller skate nights, adult/beginner skate nights, women's / queer / trans skate sessions,
  "skate moms/dads", BMX club nights, pump-track ride nights
- Clubs and associations (BMX racing clubs, MTB clubs that run dirt-jump / bike-park / pump-track sessions,
  inline / aggressive skate groups, roller derby **only** if they run open outdoor/park skate sessions)
- Skate nonprofits and shop-run sessions that are open to the public (lessons programs count if they also run open sessions)

## What doesn't
- Individuals. Never list a private person's name, phone or email. Organisations' public links only.
- Groups with no sign of activity in 2025 or 2026 (look for a dated post, event or news item).
- Pure retail shops with no sessions; competitive teams that aren't open to join; anything motorized.
- Anything you can't open and read yourself. Never invent a group, a schedule or a link.

## Output
Write a JSON array to the file path you are given. One object per group:

```json
{
  "name": "Girls Gays N They's Skate",
  "kind": "skate-night",          // crew | club | skate-night | nonprofit | shop-session | lessons
  "disciplines": ["skateboard", "roller", "inline"],   // from: skateboard, roller, inline, scooter, bmx, mtb
  "audience": ["queer", "women", "beginners"],          // from: all, beginners, adults, women, queer, families, kids
  "city": "Saskatoon", "region": "Saskatchewan", "country": "CA",   // CA | US | MX; region = province/state
  "lat": 52.1332, "lng": -106.67,  // the regular meeting spot if published, else the city centre
  "coords": "spot",                // spot | city — which of the two the lat/lng is
  "home_spot": "Victoria Park skatepark",   // optional: where they usually meet
  "meets": "Summer Thursdays, 6–8 pm",      // optional: as published; leave out if not stated
  "about": "One or two sentences in your own words: who it's for and what a session is like.",
  "links": { "instagram": "https://instagram.com/…", "website": "https://…", "facebook": "…", "meetup": "…", "discord": "…" },
  "source": "https://the page you read",
  "active": "2026-06 event listing",         // the evidence of recent activity and its date
  "confidence": "high"                       // high = official page read; medium = secondary source only
}
```

- `about` must be your own words (no copied marketing copy).
- Coordinates: use OpenStreetMap / Nominatim (https://nominatim.openstreetmap.org/search?format=jsonv2&q=…) — send a
  generic User-Agent, never anyone's email, and at most one request per second.
- Aim for breadth: every assigned city should get at least one group, big metros 3–6, and cover roller, BMX/MTB and
  women's/queer/beginner sessions, not only skateboarding. 35–50 groups in total is a good result.
- Keep to about 55 web searches; the search budget is shared with other researchers.
- Validate the JSON (python3 -m json.tool) before you finish. Report: count by city and kind, what you dropped and why,
  and gaps.
