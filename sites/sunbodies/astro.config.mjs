import { defineConfig } from 'astro/config';

// The concept is served from perkinsproduction.com/concepts/sunbodies/.
// For the real sunbodies.com, change site to that domain and base to '/'.
export default defineConfig({
  site: 'https://www.perkinsproduction.com',
  base: '/concepts/sunbodies',
  trailingSlash: 'always',
  compressHTML: false,
  build: { format: 'directory' },
  // Keep the CSS readable by older iPhones (Safari 14+). Without this the minifier
  // rewrites media queries into range syntax that Safari before 16.4 ignores.
  vite: { build: { cssTarget: ['safari14', 'chrome90', 'firefox90', 'edge90'] } },
});
