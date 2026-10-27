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

## What the site is (since the wheels relaunch, 2026-10)
Anything on wheels, ridden hard, at spots across Canada, the US and Mexico: skateboards, roller and inline skates,
scooters, BMX and mountain bikes, at skateparks, plazas, DIYs, street spots, pump tracks, BMX tracks and bike parks
(lift-served downhill parks included). Dave narrowed it to this on 2026-10-26. Before that it covered 16 outdoor sports;
those 636 old `/spots/` pages now redirect to `/spots` (`data/legacy-spot-slugs.json`). Nothing motorized, no trail
networks or road routes.

## Netlify
- Project `ritual-rollers` (`d7f5ed8e-0d7b-45cd-94b8-a452981b7044`). Linked to this repo, production branch `main`
  (allowed branches: main only), build `npm run build`, publish `.next`. Pull requests get deploy previews.
- Supabase project `jzswsyvilydebcmtsnsq` (org Clickshift, free plan): accounts, trips, photos, follows, upvotes; roll calls
  need `supabase/migrations/002_scout_gear_crew.sql` applied (Dave runs migrations in the SQL editor; Claude may not).

## Standards
- Check every change at 375px and at 1280px+ before saying done.
- Keep the SEO basics (title, description, canonical, Open Graph, `app/sitemap.ts`, `robots.txt`) intact.
- Featured spots need a real source and must not be invented: see README "Featured spots".
- Analytics: GA4 `G-QK0ETT28BD` and Clarity (`yjaeee242b`) are in `app/layout.tsx`. Netlify's `ga4-portfolio` snippet only
  reaches static HTML: it added a second GA4 to the old static pages (every view counted twice until 2026-10-26) and reaches
  none of the pages Next renders on request. So the layout's GA4 loader stands down when a gtag script is already on the
  page. Keep that guard, don't add another GA4 tag, and after a deploy check that GA4 loads once in a real browser.
- Weather is Open-Meteo (free, non-commercial terms, no key). Map data is OpenStreetMap (ODbL): keep the credit lines.
