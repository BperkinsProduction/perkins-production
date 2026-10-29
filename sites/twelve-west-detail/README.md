# Twelve West Detail concept, in Astro

The concept for Chad's detailing shop in Walkersville, served at
https://www.perkinsproduction.com/concepts/twelve-west-detail/ once published, with the
appraisal at `/concepts/twelve-west-detail/proposal/`. Astro turns these components and
data files into plain HTML plus assets, which get copied into the website repository at
`public/concepts/twelve-west-detail/`. The live server never runs Astro.

Published October 28, 2026 at /twelvewest. Price confirmed by Brice: $5,000, paid $2,500 to start and $2,500 at launch, set in
`src/data/appraisal.js`.

## Where to change things

| To change | Edit |
|---|---|
| Any price, package, coating, add on or vehicle size | `src/data/prices.js` (cards, quote builder and appraisal all follow) |
| Which add ons a package already includes | the `included` list on that add on in `src/data/prices.js` |
| Coating deposit percentage | `depositRate` in `src/data/prices.js` |
| Phone, address, hours, closed days, social links, award | `src/data/shop.js` |
| Gallery and interior photos | `src/data/photos.js` (files in `public/img/`) |
| Appraisal agency lines and Brice's price | `src/data/appraisal.js` |
| Wording of a section | its file in `src/components/` |
| Colors, spacing, type | `src/styles/site.css` (concept) and `src/styles/proposal.css` (appraisal) |
| Quote builder and booking preview behavior | `src/scripts/quote.js` |

Section order is set in `src/pages/index.astro`. The appraisal is `src/pages/proposal.astro`.

## Commands

```bash
npm install          # once
npm run build        # builds into dist/
npm run preview      # serves dist at http://127.0.0.1:8772/concepts/twelve-west-detail/
```

## Facebook photo feed

The "Just posted on Facebook" row above the gallery asks `/api/facebook-photos?site=twelvewest`
(in `api/facebook-photos.js` at the repository root) for Chad's newest page photos. Vercel
keeps each answer for six hours. It stays hidden until two environment variables are set
in the perkinsproduction.com Vercel project:

- `FB_PAGE_ID_TWELVEWEST`: 100063487360834
- `FB_PAGE_TOKEN_TWELVEWEST`: a Page access token for Twelve West Detail, made by someone
  Chad has added as a manager of the page

If the token stops working, the row hides itself and the regular gallery shows.

## Photos

Gallery photos from Chad's GoDaddy site are only about 1,300 pixels wide, so never use
them full width. The hero (`hero-vette-wide.jpg`) is cut from a full size Facebook photo.
