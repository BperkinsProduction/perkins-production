# Perkins Production

Photo + Video + Design. Weddings, portraits, 3D/VR tours, and web design.

Live at: https://www.perkinsproduction.com

## Development

The site is built with [Astro](https://astro.build) and deployed on Vercel.
Requires Node.js 22.12 or newer.

```sh
npm ci            # install
npm run dev       # local dev server with live reload (http://localhost:4321)
npm run build     # build the static site into dist/
npm run verify    # compare dist/ against the live site (see below)
npm run check     # syntax-check the API functions and scripts
npm test          # unit tests
```

Where things live:

- `src/pages/`: one file per page. `src/pages/index.astro` is the homepage.
- `src/components/`, `src/layouts/`, `src/styles/`, `src/content/`: shared pieces,
  page layouts, stylesheets and content collections, as the homepage gets split up.
- `public/`: copied into the build as-is. This is where the client concept pages
  (`public/concepts/`), the admin page (`public/admin.html`), images, videos,
  `robots.txt` and `sitemap.xml` live.
- `api/`: Vercel functions (photo upload, admin login). They only run on Vercel.
- `vercel.json`: rewrites (such as `/admin`), redirects (such as `/sportsinn` and
  `/sunbodies`) and security headers. These also only apply on Vercel.

The Vercel project must provide `ADMIN_PASSWORD` and the Vercel Blob environment
variables. Admin login creates a signed, HTTP-only session that expires after one
hour; the password is not retained by browser JavaScript.

Run `bash scripts/health-check.sh` to verify the deployed pages, APIs, media, and
SEO files. Pass a URL to check a preview deploy instead of production:
`bash scripts/health-check.sh https://your-preview.vercel.app`.

## Verifying a build

`npm run verify` proves a new build looks and behaves like the live site before it
ships. It needs Google Chrome installed and takes about three minutes.

```sh
npm run build
npm run verify -- --ref https://www.perkinsproduction.com --cand dist
```

`--cand` can be a folder (it is served on a free local port automatically) or a URL,
such as a Vercel preview. Open `verify-report/report.md` for the PASS/FAIL table;
any shot that differs gets a side-by-side image (reference, candidate, diff) in
`verify-report/images/`. The command exits non-zero when anything fails.

What it checks, on a desktop (1440x900), a phone (390x844 with touch) and a desktop
with reduced motion:

- Visual: screenshots of both sites at the top, five points through the wheel hero,
  every major section, the footer, and the photo/video/3D sections after the reveal
  button opens them. Animations are frozen first, and regions that change on their
  own (YouTube thumbnails, the Matterport embed, Blob photos) are masked.
- Layout: page height and the position of each section.
- Behavior: nav links, the phone menu, the wheel cards link somewhere real, the stat
  counters, the staircase lines, pricing tabs, the reveal button, and the contact
  form fields. The form is never submitted and the admin page is never opened.
- Console errors, failed requests, and that the head tags and visible text match.
- Links: every file the homepage references loads, every `#anchor` exists, and the
  important paths (`/admin`, concept pages, `robots.txt`, `sitemap.xml`, images) answer.

On a local folder, `/api/*`, analytics and the `vercel.json` rewrites and redirects
are reported as skipped, since only Vercel serves them. Run against a preview URL to
cover those too. Options: `npm run verify -- --help`. Thresholds and selectors are in
`scripts/verify/config.mjs`.
