# Brief: authentic photos of people riding real parks (Ritual Rollers)

ritualrollers.com helps people find parks to ride (skateparks, pump tracks, BMX tracks, bike parks) in Canada, the US
and Mexico. Dave wants every featured park to show **authentic shots of people riding it**. The parks we can find such
photos for become the featured parks.

## The one hard rule: only photos we're allowed to republish
Accept a photo only when its own page states one of these licences, and you have read that page:
- Public domain: CC0, Public Domain Mark, "PD-old", US federal government work, "no known copyright restrictions"
  stated by the holding archive (Library of Congress, National Archives, a city or state archive).
- CC BY or CC BY-SA (any version). Record the exact licence and version.
- Canada: Open Government Licence (federal, provincial or city) is fine. Record which one.

Reject: anything NC (non-commercial) or ND (no derivatives), "all rights reserved", unknown or missing licence,
anything from Instagram, TikTok, Facebook, X, YouTube or a news site, and stock photo sites. Search results and
snippets don't count: open the file page and read the licence there.

## What counts as a good photo
- Someone riding: skateboard, roller or inline skates, scooter, BMX or mountain bike, at a park or track. No empty parks.
- The park still exists today (check OpenStreetMap or a 2024–26 source). Note how you know.
- Skip photos whose subject is a child or children (the title or description says kid, child, boy, girl, youth, or the
  rider is plainly young). Teens and adults riding are what we want; crowds at events are fine.
- Prefer photos where you can tell which park it is (the file page names it, or the location is geotagged).

## Where to look
- Wikimedia Commons: categories such as "Skateparks in <state or province>", "Skateboarding in <city>",
  "BMX in ...", "<park name>", and the file's own categories. The API is open:
  https://commons.wikimedia.org/w/api.php (action=query, list=categorymembers / search, prop=imageinfo with
  iiprop=url|extmetadata gives licence, author, date and GPS).
- Flickr photos with a CC BY / BY-SA / CC0 / PDM licence, found via Openverse (https://api.openverse.org/v1/images/?q=...
  &license=by,by-sa,cc0,pdm) or Flickr search; confirm on the Flickr photo page.
- Library of Congress (loc.gov), US National Archives (catalog.archives.gov), city and state archives, Calisphere,
  City of Vancouver Archives, BAnQ, Archives of Ontario: only items they mark as public domain or openly licensed.

## Matching the park
`data/parks.json` in the repo lists every mapped park (id like w123, name, lat, lng, kind, cc); `data/spots.json` lists
370 featured spots (slug, name, lat, lng, osm). Find the park the photo shows and record its `park_id` (OSM id from
parks.json) and/or `spot_slug`. If it's not in either, give lat/lng and the name.

## Output
A JSON array written to the path you're given. One object per photo:

```json
{
  "image": "https://upload.wikimedia.org/wikipedia/commons/a/ab/File.jpg",   // the full-size file URL
  "page": "https://commons.wikimedia.org/wiki/File:File.jpg",              // where the licence is stated
  "title": "Skater at Seylynn Bowl",
  "author": "Name as credited on the page",
  "licence": "CC BY-SA 4.0",
  "licence_url": "https://creativecommons.org/licenses/by-sa/4.0/",
  "year": 1979,                       // the year taken, if known
  "discipline": "skateboard",         // skateboard | roller | inline | scooter | bmx | mtb
  "park_name": "Seylynn Bowl",
  "park_id": "w123456",               // from data/parks.json, if found
  "spot_slug": "seylynn-bowl",        // from data/spots.json, if found
  "lat": 49.31, "lng": -123.07,
  "city": "North Vancouver", "region": "British Columbia", "country": "CA",
  "still_open": "OSM feature w123456 / 2025 city page",   // how you know the park is still there
  "caption": "One short sentence in your own words about what the photo shows.",
  "width": 4000, "height": 3000
}
```
Validate the JSON (python3 -m json.tool) before you finish. Report: count by country, by decade, by discipline, how
many parks have at least one photo, what you rejected and why (licence, empty, kids, closed park), and gaps.
Never download or copy the images into the repo; the URLs are enough.
