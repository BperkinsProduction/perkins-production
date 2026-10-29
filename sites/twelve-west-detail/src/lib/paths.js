// Every image and internal link goes through here so the site works under any base path.
const base = import.meta.env.BASE_URL.replace(/\/$/, '');
export const img = (file) => `${base}/img/${file}`;
export const page = (path = '') => `${base}/${path}`;
