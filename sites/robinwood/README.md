# Robinwood Dental concept, in Astro

The concept page at https://www.perkinsproduction.com/concepts/robinwood/ , built with Astro.
Astro turns these components and data files into one plain HTML page plus assets, which
are copied into the website repository at `public/concepts/robinwood/`. The live server
never runs Astro; it only serves the finished files.

## Where to change things

| To change | Edit |
|---|---|
| A service, its photo or description | `src/data/services.js` |
| A dentist card | `src/data/dentists.js` (full bios live in `public/assets/content.json`) |
| Staff names | `src/data/team.js` |
| Office address or hours | `src/data/offices.js` (hours are stored once; cards, footer and booking times follow) |
| Reviews | `src/data/reviews.js` |
| FAQ answers | `src/data/faq.js` |
| Forms and aftercare PDFs | `src/data/forms.js` |
| Before and after cases | `src/data/gallery.js` (images in `public/assets/ba-*.jpg`) |
| The opening story beats | `src/data/story.js` |
| Booking dentist list | `src/data/booking.js` |
| Phone, email, fax, payment link | `src/data/contact.js` (the one place) |
| Colors, spacing, type | `src/styles/` (files load in number order; order matters) |
| Behavior (scroll film, flight, breath, booking) | `src/scripts/`, one file per feature |

To check a refactor changed nothing visible: `npm run build && npm run parity` must print PARITY OK.
It compares against `tests/reference/original.html`, the hand-written page this project replaced.
After an intentional visible change, copy the new `dist/index.html` over that reference.
To compare screenshots of two builds: `node tests/pixel-compare.mjs <old url> <new url> 1440 900 d <folder>`.

Each section is a component in `src/components/`, assembled in order by `src/pages/index.astro`.

## Commands

```bash
npm install          # once
npm run build        # builds into dist/
npm run stage        # serves dist at http://127.0.0.1:8771/concepts/robinwood/ (Astro preview)
npm test             # runs the browser test suite against the staged build
```

`npm test` needs Chrome and the staged server running. Point it at the live site with
`URL=https://www.perkinsproduction.com/concepts/robinwood/ npm test`.

## Publishing

From this folder, with the website repository checked out at `REPO`:

```bash
npm run build
rsync -a --delete dist/ "$REPO/public/concepts/robinwood/"
```

Then commit and push the repository's `main` branch; Vercel publishes `public/` as is.
The source of this project is kept in the repository at `sites/robinwood/`.

## Rules that came from real mistakes

- No em dashes or en dashes anywhere, including code comments.
- Every fact on the page comes from the practice's own site or public records. Do not add
  claims, counts or credentials that cannot be pointed to.
- People in photos who no longer work at the practice must not appear (two 2016 shoot photos
  show badges for departed dentists and are deliberately unused).
- Measure in a real browser before calling anything done; `npm test` exists for that.
