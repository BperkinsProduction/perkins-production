# Perkins Production Brand Kit

The visual system used on perkinsproduction.com. Any new page, client concept, or
proposal should look like it came from the same studio. Copy these values exactly.

Owner: Brice Perkins, Frederick, Maryland
Contact: brice@perkinsproduction.com, (240) 818-1955
Tagline: PHOTO + VIDEO + DESIGN

## Colors

Dark, cinematic, warm gold accent. Never a light theme.

```css
:root {
    --bg-primary: #0a0a0a;      /* page background, near black */
    --bg-secondary: #111111;    /* alternating sections (.alt-bg) */
    --bg-card: #1a1a1a;         /* cards, photo wells */
    --bg-card-hover: #222222;
    --text-primary: #e8e8e8;    /* body copy, warm white, never pure #fff */
    --text-secondary: #999999;  /* supporting copy, italic intros */
    --text-accent: #c9a96e;     /* THE gold: rules, borders, links, buttons */
    --text-accent-light: #d4b87a; /* hover state only */
    --border-subtle: #2a2a2a;
    --transition: all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}
```

Gold gradient used inside the logo and premium accents:
`#d4b87a` to `#c9a96e` to `#b8944f` on a 135 degree diagonal.

Deepest section background (wedding films): `#070707`.

## Typography

Two Google fonts on the website. Paperwork and documents add a third, Lora,
chosen by Brice in Sept 2026 after Cormorant body copy proved hard to read.

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Josefin+Slab:ital,wght@0,100..700;1,100..700&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&display=swap" rel="stylesheet">
```

- **Cormorant Garamond** (serif) is the body and the voice. `body { font-family: 'Cormorant Garamond', Georgia, serif; line-height: 1.6; }` Use italic for supporting lines under headings.
- **Josefin Slab** is every piece of UI furniture: nav links, buttons, section headings, labels, footer. Always uppercase, always widely letterspaced, always light weight.

The rule that makes it feel expensive: **letterspacing scales with importance.**
Section headings 6px, buttons and labels 3px, nav 2.5px, small print 2px.

**Readability rule (Brice's pick, Sept 2026):** in documents, Cormorant is
display only, never body copy. Document body is **Lora**
(`font-family: 'Lora', Georgia, serif;` at 1.1rem, line-height 1.7), added to
the fonts link as `family=Lora:ital,wght@0,400;0,500;1,400`. Cormorant remains
the voice: italic intro lines under headings at 1.3rem, centered thank-you and
sign-off lines at 1.25rem, and big display moments (the gift certificate stays
all Cormorant). Documents also brighten the ink: `--text-primary: #f2efe9` and
`--text-secondary: #b4b0a8`. The website itself keeps two fonts and its
original #e8e8e8 / #999999. Josefin small print never below 0.8rem anywhere.

## Core components

**Section heading block** (centered, with a short gold rule beneath):

```css
section { padding: 7rem 3rem; }
.section-header { text-align: center; margin-bottom: 4rem; }
.section-header h2 {
    font-family: 'Josefin Slab', serif; font-size: 2.4rem; font-weight: 300;
    letter-spacing: 6px; text-transform: uppercase; margin-bottom: 1rem;
}
.section-header .divider {
    width: 60px; height: 1px; background: var(--text-accent); margin: 0 auto 1.5rem;
}
.section-header p {
    color: var(--text-secondary); font-size: 1.1rem; font-style: italic;
    max-width: 600px; margin: 0 auto;
}
```

**Outline button** (the default call to action, fills gold on hover):

```css
.section-cta a {
    display: inline-block; padding: 12px 36px;
    border: 1px solid var(--text-accent); color: var(--text-accent);
    text-decoration: none; font-family: 'Josefin Slab', serif;
    font-size: 0.8rem; letter-spacing: 3px; text-transform: uppercase;
    transition: var(--transition);
}
.section-cta a:hover { background: var(--text-accent); color: var(--bg-primary); }
```

**Solid button** (one per screen maximum, for the primary action): gold background,
near-black text, `padding: 8px 20px`, `letter-spacing: 2px`, `font-weight: 500`.

**Navigation:** fixed, transparent gradient over the hero, condensing to
`rgba(10,10,10,0.98)` with a 12px backdrop blur and a subtle bottom border once
scrolled. Links reveal a 1px gold underline that grows from the left on hover.

**Photography:** images sit edge to edge in tight grids with a 6px gutter, and
scale to 1.06 over 0.8s on hover. A dark gradient scrim rises from the bottom
carrying a small gold uppercase caption.

**Footer:** centered, logo at 45px and 50 percent opacity, one line of Josefin
Slab small print at 0.8rem with 2px letterspacing.

## Motion

Everything eases on `cubic-bezier(0.25, 0.46, 0.45, 0.94)` over 0.4s. Photos use
0.8s. Nothing bounces, nothing is fast, nothing is instant. The homepage hero is a
scroll-scrubbed cinematic film on desktop (the video advances with scroll position)
falling back to a crossfading photo reel on phones and for reduced-motion visitors.

## Breakpoints

`768px` is the phone boundary, `1024px` the tablet boundary, `720px` and portrait
orientation force the static hero fallback. Always honor
`@media (prefers-reduced-motion: reduce)`.

## Voice

Warm, confident, plainspoken. Short sentences. Concrete nouns over adjectives:
name the walnut tree, the candle, the barn door. Never corporate, never
"seamlessly" or "elevate" or "unlock". **Never use em dashes or en dashes.**
Use periods, commas, parentheses, or colons instead.

## The logo

Full lockup: a line-drawn cinema camera in gold gradient, then PERKINS in
Cormorant Garamond 84px at `#e8e8e8`, a gold rule, PRODUCTION at 22px with 14px
letterspacing in `#999`, and a short gold tick followed by
PHOTO + VIDEO + DESIGN in Josefin Slab 11px at `#666`.

Displayed at 50px tall in the nav (38px once scrolled), 45px in the footer.
Give each copy a unique gradient id (`gGnav`, `gGhero`, `gGfooter`) so multiple
instances on one page do not collide.

Paste this exact SVG:

```html
<svg viewBox="0 0 900 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Perkins Production"><defs><linearGradient id="gGnav" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#d4b87a"/><stop offset="50%" stop-color="#c9a96e"/><stop offset="100%" stop-color="#b8944f"/></linearGradient></defs><g transform="translate(20,40)"><g stroke="url(#gGnav)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none"><rect x="40" y="35" width="120" height="82" rx="6"/><circle cx="100" cy="41.5" r="0.9" fill="url(#gGnav)" stroke="none"/><rect x="46" y="47" width="108" height="64" rx="3" opacity="0.45"/><g opacity="0.7"><rect x="49.5" y="51" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="57" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="63" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="69" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="75" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="81" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="87" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="93" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="99" width="4.5" height="3.2" rx="0.6"/><rect x="49.5" y="105" width="4.5" height="3.2" rx="0.6"/></g><circle cx="105" cy="79" r="24"/><circle cx="105" cy="79" r="18" opacity="0.85"/><circle cx="105" cy="79" r="12" opacity="0.7"/><circle cx="105" cy="79" r="5"/><path d="M102.6 76.2L102.6 81.8L107.4 79Z" fill="url(#gGnav)" stroke="url(#gGnav)" stroke-width="0.6"/><path d="M88 70A22 22 0 0 1 99 60" stroke="#fff" stroke-width="1.2" opacity="0.5"/><line x1="36" y1="120" x2="164" y2="120"/><path d="M36 120L164 120L172 138Q172 142 168 142L32 142Q28 142 28 138Z"/><line x1="50" y1="126" x2="150" y2="126" opacity="0.35"/><line x1="48" y1="130" x2="152" y2="130" opacity="0.35"/><rect x="86" y="134.5" width="28" height="4" rx="1" opacity="0.55"/><line x1="92" y1="142" x2="108" y2="142" opacity="0.6" stroke-width="1.8"/></g></g><g transform="translate(240,0)"><text x="0" y="120" font-family="Cormorant Garamond,Georgia,serif" font-size="84" font-weight="600" letter-spacing="2" fill="#e8e8e8">PERKINS</text><line x1="0" y1="140" x2="420" y2="140" stroke="url(#gGnav)" stroke-width="1.2"/><text x="0" y="180" font-family="Cormorant Garamond,Georgia,serif" font-size="22" font-weight="400" letter-spacing="14" fill="#999">PRODUCTION</text><line x1="0" y1="208" x2="20" y2="208" stroke="url(#gGnav)" stroke-width="1.5"/><text x="30" y="212" font-family="Josefin Slab,Georgia,serif" font-size="11" font-weight="400" letter-spacing="3.5" fill="#666">PHOTO + VIDEO + DESIGN</text></g></svg>
```

## Templates

Studio paperwork lives in `templates/` at the repo root (outside `public/`, so it
never deploys). Each file is self-contained HTML in this brand with [bracketed]
placeholders and an on-screen help bar that does not print. Fill a copy, then
print to PDF with background graphics turned on. Open `templates/index.html`
(The Kit) for a linked overview of everything. Print layouts are tuned: phone
styles apply on screen only, the invoice, rate card, and delivery note each
print on one page, the contract on two, and the gift certificate asks for
landscape.

- `templates/invoice.html`: one-page invoice. Letterhead, billed-to, line items,
  subtotal, deposit, gold balance due, payment terms.
- `templates/proposal.html`: client proposal in the site's section style. Cover,
  The Idea, The Work, three-tier Investment, How It Goes, Fine Print, Next Step.
  A filled copy can go in `public/concepts/` and be shared as a link (delete the
  help bar first).
- `templates/contract.html`: letter of agreement. Parties, project, dates,
  payment schedule, cancellation, usage rights, signature lines.
- `templates/rate-card.html`: services and starting prices on one page, grouped
  by photography, video, and design/web.
- `templates/email-signature.html`: a tool page, not a document. Preview of the
  table-based signature on white, a Copy Signature button, and setup steps for
  Apple Mail and Gmail. The signature uses Georgia (email clients ignore web
  fonts) inside a dark card with the gold left rule.
- `templates/delivery-note.html`: goes with final files. Gold gallery button
  (the one solid button), password, usage, printing, backup reminder, review ask.
- `templates/welcome-guide.html`: sent after booking, in the site's section
  style. What happens next, prep tips, shoot day, contact.
- `templates/letterhead.html`: blank branded page for letters and estimates.
- `templates/gift-certificate.html`: framed certificate with recipient, value,
  code, and expiration. Prints best in landscape.

Source of truth: `public/index.html` in this repo. If the site changes, update this file.

A paste-ready version of this kit for starting new AI sessions lives in
`PROMPT.md` beside this file. When the brand changes, update both together.
