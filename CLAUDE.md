@AGENTS.md

# ritualrollers.com — rules for Claude

The line above pulls in `AGENTS.md` (this is not the Next.js you know). Portfolio-wide rules and the registry of every
site live in `davebussell/portfolio-hq` — read its CLAUDE.md too, then `README.md` here.

## Every chat
1. **First:** attach this repo (`list_repos`, then `add_repo` with push access) and clone it. Work in that clone.
2. **Last:** commit and push. `main` is what's live: Netlify builds every push to `main` (see below), so never push to
   `main` without Dave's OK in the chat. Work on a branch and open a pull request; Netlify builds a deploy preview for it.
   "Done" means merged **and** live, checked on https://ritualrollers.com.
3. If the repo, the deploy path or the Netlify project changes, update the `portfolio-hq` registry row.

## What the site is (fresh start, 2026-10-27)
Spots to ride and people to ride with: anything on wheels, ridden hard (skateboards, roller and inline skates, scooters,
BMX and mountain bikes), across Canada, the US and Mexico. Spots, cities, sessions (I'm in, comments), crews and riders.
Dave dropped conditions entirely on 2026-10-27: **no weather, temperature or "is it dry" features** — don't bring them
back unless he asks. Nothing motorized, no road routes, and no trail networks outside the parks: trails are mapped
inside bike parks, pump tracks and BMX tracks only (trail maps and the 3D ride, Dave 2026-10-27; README "Trail maps").
- The 3D ride must say what's generated (trees; rollers, berms and start hills on tracks) and credit OpenStreetMap and
  the elevation tiles. Keep `lib/ride/physics.ts` pure and tested.
- People rules (Dave, 2026-10-27): accounts 16+ (anyone can browse); contact is public sessions only, no private
  messages; riders show their city and chosen spots, never where they live; rider pages are noindex.
- Wheel picker (Dave, 2026-10-27): Board / Skates / Bike in the header; the whole site filters to the pick (cookie
  `rr_wheel`, see README). New features must respect it: filter by `fits()` / `parkFits()` from `lib/wheels.ts`.
- Samples (`lib/sample.ts`) are always tagged Sample and give way to real entries. Crews must be real groups with a
  source and recent activity; never invent one.

## Netlify
- Project `ritual-rollers` (`d7f5ed8e-0d7b-45cd-94b8-a452981b7044`). Linked to this repo, production branch `main`
  (allowed branches: main only), build `npm run build`, publish `.next`. Pull requests get deploy previews.
- Supabase project `jzswsyvilydebcmtsnsq` (org Clickshift, free plan): accounts and rider profiles, sessions, I'm in,
  comments (`supabase/migrations/004_riders_and_sessions.sql`; Dave runs migrations in the SQL editor, Claude may not).
  The old trips/photos/follows tables are left in place, unused. Drafts 002 and 003 were retired unapplied.
- Netlify Forms: `crew` (/crews/add) and `report` (session and profile report links), declared in `public/__forms.html`
  because Next renders the pages. Both should email dave@clickshift.ca (check the form notifications in Netlify).

## Standards
- Check every change at 375px and at 1280px+ before saying done.
- Keep the SEO basics (title, description, canonical, Open Graph, `app/sitemap.ts`, `robots.txt`) intact.
- Featured spots need a real source and must not be invented: see README "Featured spots".
- Analytics: GA4 `G-QK0ETT28BD` and Clarity (`yjaeee242b`) are in `app/layout.tsx`. Netlify's `ga4-portfolio` snippet only
  reaches static HTML: it added a second GA4 to the old static pages (every view counted twice until 2026-10-26) and reaches
  none of the pages Next renders on request. So the layout's GA4 loader stands down when a gtag script is already on the
  page. Keep that guard, don't add another GA4 tag, and after a deploy check that GA4 loads once in a real browser.
- Map data and tiles are OpenStreetMap (ODbL; tile policy: light use, keep the credit). Keep the credit lines.
