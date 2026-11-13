# Twelve West Detail: design package

Tier 1 (one 6 second film, scrubbed by scroll), built inside the Astro project. Copy below ships verbatim.

## 1. Premise

**Under the lights.** Chad's bay is lit by rows of white LED tubes, and every photo he posts shows them reflected in the paint. Those reflections are how you can tell a car was done right. The site sells that one idea: your car, under the same lights, finished by hand, with the price known before you drive over.

## 2. Palette

Sampled from the bay: graphite walls, cool white tubes, gray epoxy floor, and the blue in Chad's logo used rarely.

```css
--canvas: #0a0d11;        /* graphite, tinted toward the bay's cool grade */
--panel: #11161c;
--panel-2: #171d25;
--line: #222b35;
--tube: #eef4fa;          /* LED tube white, the signature light */
--accent: #1ea7ee;        /* logo blue: CTAs, focus, one or two emphasis moments */
--accent-hover: #52bdf4;
--accent-muted: rgba(30,167,238,.22);
--text-primary: #eef2f6;
--text-secondary: #95a1ad;
```

## 3. Type

- Display: Archivo at width 125, weights 700 and 900. Wide and square like the TWELVE WEST lettering in his logo.
- Body: Barlow 400 and 500. Plain, mechanical, made for signage.
- Labels and prices: JetBrains Mono 500. Prices read like a spec sheet.

## 4. Band map (starting points, checked by the flick test)

| Band | Range | Footage moment | Copy | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.28 | Chad's wall sign, with the 3D sign riding on it, camera starting down | Eyebrow "Walkersville, Maryland". Headline "Built under the lights." | Drift down, words fall into place with the camera |
| 2 | 0.32 to 0.60 | Shop wall and the car rising into frame | "Hand washed. Hand finished. Every time." | Blur to sharp, the focus arriving |
| 3 | 0.66 to 1.00 | Camera settles on the Corvette | "Wax is dead." Sub "Ceramic protection, full details and interior steam cleaning. Every price is on this page." Buttons "Build your quote" and "Call (301) 304-5510" | Word by word rise into a staged settle |

Hero height 420vh. Phones, tablets held upright, landscape phones and reduced motion get the static hero.

## 4b. Hero extras

- The 3D sign: Chad's "Twelve West Detail / Elevating the Standard" lettering rendered in Blender (`blender/sign.py`, 24 frames in `public/sign/`), tracked onto the painted sign in the film and swapped frame by frame with scroll so the letters turn. It fades out as the sign leaves the top of the frame.
- The paint grade (`src/scripts/paint-grade.js`): a WebGL pass that touches only the red paint, dull and hazy at the top of the film, deep and glossy at the settle. Without WebGL the film plays ungraded.

## 5. Static hero

The ending frame of the film with band 3's copy over it, buttons included.

On phones the ending frame is cropped taller and starts with dull paint. A sideways thumb drag moves the polish line across the car (same shader as the film, `src/scripts/phone-polish.js`), with the Paint correction meter and the neon sign at the top. Up and down swipes still scroll the page. Without WebGL it is the plain finished photo.

## 6. Below the hero

1. Award strip: Best of the Best 2020, 100% recommend on Facebook.
2. Packages: size picker, five package cards as spec sheets with mono prices.
3. Paint correction: the **inspection light** (`src/scripts/inspect.js`). The hood sits in the dark and the pointer is a handheld light; Before shows swirl marks ringing the light, After Chad shows one clean reflection. It drifts on its own until someone moves it.
4. Ceramic coating, with the one interactive moment: **hold to polish.** Press and hold the paint photo and a light bar sweeps it from hazy to glossy. Letting go early eases back. Finishing lights up the three coating tiers in turn. Below it, **water beading** (`src/scripts/beading.js`): rain on bare paint sheets out, rain on coated paint beads and rolls off.
4. Quote builder and booking preview (unchanged behavior).
5. Recent work gallery, Facebook feed row, interiors.
6. Specialty vehicles.
7. Visit, then footer.

Every section points at one call to action: Build your quote.

## 7. Vector layer

- The fixed environment layer: soft LED tube reflections drifting slowly behind the whole page, 90 second cycle.
- Section headings get a thin tube line that draws across as the section enters.
- All of it shows its final state under reduced motion.

## 8. Engineering

Blob fetch with loading ring, dt normalized lerp with a leash, gated seeks, DOM writes only on change, band pacing in scroll distance, the four layer legibility system, the five static hero gates kept live, complete without the video. See the 10k websites scrub pipeline.

## 9. Copy gate

Zero em dashes, zero stock words (leverage, seamless, empower, unlock, robust, actionable, data-driven, solutions), and no AI tells, before anyone sees it.

## Neon carried down the page (Nov 13, 2026)
- Each section heading's underline is a small blue neon tube. It draws across, flickers on with the sign's neonon keyframes, then hums.
- Closing sign (src/components/Closer.astro) sits between Visit and the footer: the frontmost sign frame (s12 and g12) flickers on the first time it is in view, then "The lights are on. Bring it in." with Book your detail and Call.
- Package prices roll to the new number when the size changes (roll() in quote.js), with a short blue glow, and a reflection sweeps across each card in turn. The Most Popular card gets a slow sweep every 8 seconds. Reduced motion skips all of it.

## Gallery (Nov 13, 2026)
- Two blocks of five: a big featured photo with four beside it, the M3 on the left, then the red F-150 on the right. Set with "feature" in src/data/photos.js; "viewerOnly" keeps a photo out of the grid but in the viewer.
- Hovering any photo sends a light reflection across it.
- Every photo, inside ones too, opens a full screen viewer (src/scripts/viewer.js, a native dialog): arrows, arrow keys, swipe, Escape or a backdrop tap to close, counter, neighbours preload. "See all 15 photos" opens it at the first one.
