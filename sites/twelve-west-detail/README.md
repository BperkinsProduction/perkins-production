# Twelve West Detail concept, in Astro

The concept for Chad's detailing shop in Walkersville, served at
https://www.perkinsproduction.com/concepts/twelve-west-detail/ once published, with the
appraisal at `/concepts/twelve-west-detail/proposal/`. Astro turns these components and
data files into plain HTML plus assets, which get copied into the website repository at
`public/concepts/twelve-west-detail/`. The live server never runs Astro.

Not published yet. The first publish needs Brice's go ahead, and the $2,000 price in
`src/data/appraisal.js` is a recommendation he has not confirmed.

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

## Photos

Gallery photos from Chad's GoDaddy site are only about 1,300 pixels wide, so never use
them full width. The hero (`hero-vette-wide.jpg`) is cut from a full size Facebook photo.
