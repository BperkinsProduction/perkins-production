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
| 1 | 0.00 to 0.28 | Ceiling tubes, camera starting down | Eyebrow "Twelve West Detail, Walkersville MD". Headline "Built under the lights." | Drift down, words fall into place with the camera |
| 2 | 0.32 to 0.60 | Shop wall and the car rising into frame | "Hand washed. Hand finished. Every time." | Blur to sharp, the focus arriving |
| 3 | 0.66 to 1.00 | Camera settles on the Corvette | "Wax is dead." Sub "Ceramic protection, full details and interior steam cleaning. Every price is on this page." Buttons "Build your quote" and "Call (301) 304-5510" | Word by word rise into a staged settle |

Hero height 420vh. Phones, tablets held upright, landscape phones and reduced motion get the static hero.

## 5. Static hero

The ending frame of the film with band 3's copy over it, buttons included.

## 6. Below the hero

1. Award strip: Best of the Best 2020, 100% recommend on Facebook.
2. Packages: size picker, five package cards as spec sheets with mono prices.
3. Ceramic coating, with the one interactive moment: **hold to polish.** Press and hold the paint photo and a light bar sweeps it from hazy to glossy. Letting go early eases back. Finishing lights up the three coating tiers in turn.
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
