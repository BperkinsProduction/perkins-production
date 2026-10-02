// Copies the finished build into the studio site, where Vercel serves it at
// perkinsproduction.com/concepts/sunbodies/. Run with: npm run publish-concept
import { cpSync, rmSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const dist = fileURLToPath(new URL('../dist/', import.meta.url));
const dest = fileURLToPath(new URL('../../../public/concepts/sunbodies/', import.meta.url));
if (!existsSync(dist + 'index.html')) throw new Error('No build found. Run astro build first.');
rmSync(dest, { recursive: true, force: true });
cpSync(dist, dest, { recursive: true });
console.log('Published the build to ' + dest);
