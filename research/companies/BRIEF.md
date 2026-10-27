# Brief: real wheels companies near riders (Ritual Rollers)

ritualrollers.com is the place to find **spots to ride and people to ride with**: skateboards, roller skates, inline
skates, scooters, BMX and mountain bikes (skateparks, pump tracks, BMX tracks, dirt jumps, bike parks), across Canada,
the US and Mexico. Each city page will now show the companies in the area. Shops come from OpenStreetMap separately,
so **do not research retail shops**.

Your job: find **real, currently operating companies** in Canada, the US and Mexico that a rider would be glad to know
are local.

## What counts (kind)
- `builder` — skatepark, pump track, BMX track or bike park designers and builders (e.g. New Line Skateparks, Spohn
  Ranch, Grindline, Dreamland, Evergreen, Velosolutions' North American arm, American Ramp Company, Gravity Logic).
- `maker` — brands that design or make boards, decks, wheels, trucks, bearings, roller or inline skates, scooters,
  BMX or mountain bike frames and parts, protective gear, with a real base in a CA/US/MX city (where they're based, not
  where the factory is unless it's the same). Small independent makers (a local deck press, a wheel pourer, a frame
  builder) count and are the most valuable.
- `indoor` — indoor skateparks and indoor bike parks run as businesses (they may also be in OpenStreetMap; list them anyway).
- `school` — businesses whose main thing is skate, roller, BMX or MTB lessons or camps with a fixed base.

## What doesn't
- Retail-only shops (they come from OpenStreetMap), big-box chains, distributors with no product of their own.
- Anything motorized, road or gravel cycling brands, snowboard/surf-only brands, e-bikes as the main product.
- Individuals: never list a private person's name, phone or email. Company pages only.
- Companies with no sign of operating in 2025 or 2026 (a dated post, product release, project or news item).
- Anything you can't open and read yourself. Never invent a company, an address or a link.

## Output
Write a JSON array to the file path you are given. One object per company:

```json
{
  "name": "New Line Skateparks",
  "kind": "builder",                       // builder | maker | indoor | school
  "disciplines": ["skateboard", "roller", "inline", "scooter", "bmx"],   // who it's for: skateboard, roller, inline, scooter, bmx, mtb
  "what": "Skateparks, pump tracks",       // a few words: what they make or do
  "city": "Vancouver", "region": "British Columbia", "country": "CA",
  "lat": 49.2827, "lng": -123.1207,
  "coords": "address",                     // address (geocoded from a published street address) | city (city centre)
  "about": "One or two sentences in your own words.",
  "links": { "website": "https://…", "instagram": "https://instagram.com/…" },
  "source": "https://the page you read",
  "active": "2026-05 project announcement",  // evidence of recent activity and its date
  "confidence": "high"                     // high = the company's own page read; medium = secondary source only
}
```

- `about` in your own words, no copied marketing copy, no superlatives you can't back up.
- Coordinates: OpenStreetMap Nominatim (https://nominatim.openstreetmap.org/search?format=jsonv2&q=…), a generic
  User-Agent (never anyone's email), at most one request per second. Use a published street address when the company
  publishes one for visitors (an indoor park, a shop front); otherwise the city centre, with `"coords": "city"`.
- Spread: all three countries, every discipline, big metros and small towns. Prefer companies in or near the site's
  city hubs (`data/cities.json` lists them).
- Validate the JSON (python3 -m json.tool) before you finish. Report: count by country and kind, what you dropped and
  why, and gaps.
