# Sunbodies concept (Astro)

The source for perkinsproduction.com/concepts/sunbodies/. The page you see on the live site is built from this folder and copied into `public/concepts/sunbodies/`.

## Change prices, hours, reviews, or questions

Everything about the salon is in one file: `src/data/salon.ts`.

- Prices are plain numbers in `plans` (for example `price: 59`). The rate board, the level finder, and every "about X a day" line update from them.
- The monthly offer is `special.price`. It feeds the hero, the spotlight card, the menu button, and the signup form.
- Hours: `HOURS` drives the live "Open now" status; `hoursRows` and `hoursLine` are the printed versions. Keep all three in agreement.

## Where the rest lives

- `src/components/`: one file per section of the page, in the order listed in `src/pages/index.astro`.
- `src/styles/global.css`: all the styling.
- `src/scripts/site.js`: the sunset scroll, the flying logo, the level finder, the live hours, and the form.
- `src/assets/`: photos. Astro turns them into small WebP copies sized for each screen.
- `public/assets/`: files used as-is (the sunset video, the logos, the link-preview image).
- `LEGACY-index.html`: the original hand-built page, kept for reference.

## Preview, build, publish

Work in a copy that lives outside iCloud (a git worktree), not in the Documents checkout:

1. `npm install` (first time only).
2. `npm run dev` and open http://localhost:4321/concepts/sunbodies/ to preview while editing.
3. `npm run publish-concept` builds the site and copies it into `public/concepts/sunbodies/`.
4. Commit both `sites/sunbodies/` and `public/concepts/sunbodies/`, then push to `main`. Vercel serves the result about a minute later.

## Turning this into the real sunbodies.com

In `astro.config.mjs`, set `site` to `https://www.sunbodies.com` and `base` to `/`, remove the `robots` noindex line and the concept line in the footer, and deploy it as its own site.
