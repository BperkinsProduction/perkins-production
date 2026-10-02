import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// One file per client site in src/content/work/. The hero wheel and the
// Work grid both read from here, so a new site is one new file.
const work = defineCollection({
    loader: glob({ pattern: '*.{yaml,yml}', base: './src/content/work' }),
    schema: ({ image }) => z.object({
        name: z.string(),
        // Eyebrow above the name, e.g. "Events & Athletics"
        category: z.string(),
        url: z.string(),
        // Screenshots in src/assets/deck/, written relative to this file
        // (../../assets/deck/name-desktop.jpg). The build makes the small, fast
        // copies. The wheel swaps to mobile on narrow or portrait screens.
        shots: z.object({
            desktop: image(),
            mobile: image(),
        }),
        // Hero wheel card. Leave out to keep the site off the wheel.
        wheel: z.object({
            order: z.number(),
            blurb: z.string(),
            alt: z.string(),
            // Text in the fake browser bar on the card
            bar: z.string(),
            // Override the default "Visit site" link (used for this site's own card)
            link: z.object({
                href: z.string(),
                label: z.string(),
                text: z.string(),
            }).optional(),
        }).optional(),
        // Work grid card. Leave out to keep the site off the grid.
        card: z.object({
            order: z.number(),
            featured: z.boolean().default(false),
            alt: z.string(),
            description: z.string(),
            tags: z.array(z.string()),
        }).optional(),
    }),
});

export const collections = { work };
