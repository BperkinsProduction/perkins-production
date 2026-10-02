// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
    site: 'https://www.perkinsproduction.com',
    output: 'static',
    // Keep the generated HTML byte-for-byte close to the hand-written page while migrating
    compressHTML: false,
    build: {
        // Ship site.css inside the page head, as before, so there is no extra render-blocking request
        inlineStylesheets: 'always',
    },
    vite: {
        // Ship the stylesheet as written: no minifying, merging or syntax lowering
        build: { cssMinify: false, cssTarget: false },
    },
});
