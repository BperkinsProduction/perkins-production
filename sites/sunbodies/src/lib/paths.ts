// BASE_URL is '/concepts/sunbodies/' for the concept. Files in public/ live under it.
export const base = import.meta.env.BASE_URL.replace(/\/?$/, '/');
export const asset = (file: string) => `${base}assets/${file}`;
