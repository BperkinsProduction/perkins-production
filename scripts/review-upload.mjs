#!/usr/bin/env node
// Upload one file to Blob for a review room, through the site's token endpoint.
// Usage: REVIEW_ADMIN_KEY=... node scripts/review-upload.mjs <file> <project-slug> [site]
// Prints the uploaded file's public URL on the last line.
import { readFile, stat } from 'node:fs/promises';
import { basename } from 'node:path';
import { upload } from '@vercel/blob/client';

const [file, slug, site = 'https://www.perkinsproduction.com'] = process.argv.slice(2);
const admin = process.env.REVIEW_ADMIN_KEY;
if (!file || !/^[a-z0-9-]+$/.test(slug || '') || !admin) {
  console.error('Usage: REVIEW_ADMIN_KEY=... node scripts/review-upload.mjs <file> <project-slug> [site]');
  process.exit(1);
}

const size = (await stat(file)).size;
const name = basename(file).replace(/[^A-Za-z0-9._-]+/g, '_');
const type = name.endsWith('.mp4') ? 'video/mp4' : name.endsWith('.mov') ? 'video/quicktime' : name.endsWith('.png') ? 'image/png' : name.endsWith('.webp') ? 'image/webp' : 'image/jpeg';
let last = 0;
const blob = await upload(`review-media/${slug}/${name}`, new Blob([await readFile(file)], { type }), {
  access: 'public',
  handleUploadUrl: `${site}/api/review`,
  clientPayload: JSON.stringify({ admin }),
  multipart: size > 20 * 1024 * 1024,
  contentType: type,
  onUploadProgress: ({ percentage }) => {
    if (percentage - last >= 10 || percentage === 100) {
      last = percentage;
      console.error(`${name}: ${Math.round(percentage)}%`);
    }
  },
});
console.log(blob.url);
