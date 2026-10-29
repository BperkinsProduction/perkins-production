// Newest photos from a client's Facebook page, for the photo galleries on concept sites.
// GET /api/facebook-photos?site=twelvewest
//
// Each site needs two environment variables in Vercel: the Facebook Page ID and a Page
// access token from someone who manages that page. Until both are set the endpoint
// answers { connected: false, photos: [] } and the page keeps its built in photos.
// Vercel's CDN keeps each answer for six hours, so new posts show up a few times a day
// and Facebook is asked at most four times a day per site.

const GRAPH_VERSION = process.env.FB_GRAPH_VERSION || 'v23.0';
const REFRESH_SECONDS = 6 * 60 * 60;

const SITES = {
  twelvewest: { pageEnv: 'FB_PAGE_ID_TWELVEWEST', tokenEnv: 'FB_PAGE_TOKEN_TWELVEWEST' },
};

const LIMIT = 12;

// Picks the smallest version of a photo that is still at least `min` pixels wide.
function pickImage(images, min) {
  const sorted = [...(images || [])].sort((a, b) => a.width - b.width);
  return sorted.find((i) => i.width >= min) || sorted[sorted.length - 1];
}

export function toPhotos(data) {
  return (data || [])
    .filter((p) => p.images && p.images.length)
    .map((p) => {
      const tile = pickImage(p.images, 700);
      return {
        src: tile.source,
        width: tile.width,
        height: tile.height,
        alt: p.alt_text || p.name || 'Recent work',
        link: p.link,
        posted: p.created_time,
      };
    })
    .slice(0, LIMIT);
}

export default async function handler(req, res) {
  const key = String(req.query?.site || '').toLowerCase();
  const site = SITES[key];
  if (!site) {
    res.status(404).json({ error: 'Unknown site' });
    return;
  }

  const pageId = process.env[site.pageEnv];
  const token = process.env[site.tokenEnv];
  if (!pageId || !token) {
    res.setHeader('Cache-Control', 'public, s-maxage=600');
    res.status(200).json({ connected: false, photos: [] });
    return;
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(pageId)}/photos` +
    `?type=uploaded&fields=images,alt_text,name,link,created_time&limit=${LIMIT}` +
    `&access_token=${encodeURIComponent(token)}`;

  try {
    const fb = await fetch(url);
    const body = await fb.json();
    if (!fb.ok || body.error) {
      // Keep serving the page's own photos, and try Facebook again in ten minutes.
      console.error('facebook-photos', key, body.error?.message || fb.status);
      res.setHeader('Cache-Control', 'public, s-maxage=600');
      res.status(200).json({ connected: true, photos: [], error: 'Facebook did not answer' });
      return;
    }
    res.setHeader('Cache-Control', `public, s-maxage=${REFRESH_SECONDS}, stale-while-revalidate=86400`);
    res.status(200).json({ connected: true, photos: toPhotos(body.data) });
  } catch (err) {
    console.error('facebook-photos', key, err.message);
    res.setHeader('Cache-Control', 'public, s-maxage=600');
    res.status(200).json({ connected: true, photos: [], error: 'Facebook did not answer' });
  }
}
