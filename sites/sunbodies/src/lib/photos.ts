import type { ImageMetadata } from 'astro';

// Every photo in src/assets/photos/, looked up by file name (for example 'glow-uv.jpg').
const photos = import.meta.glob<{ default: ImageMetadata }>('../assets/photos/*.jpg', { eager: true });

export function photo(file: string): ImageMetadata {
  const found = photos[`../assets/photos/${file}`];
  if (!found) throw new Error(`No photo named ${file} in src/assets/photos/`);
  return found.default;
}
