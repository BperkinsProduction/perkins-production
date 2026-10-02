// @ts-check
import { defineConfig } from 'astro/config';

export default defineConfig({
    site: 'https://www.perkinsproduction.com',
    output: 'static',
    // Keep the generated HTML byte-for-byte close to the hand-written page while migrating
    compressHTML: false,
});
