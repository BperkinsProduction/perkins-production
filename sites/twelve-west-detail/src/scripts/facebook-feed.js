// Shows Chad's newest Facebook photos above the gallery. The page's own photos stay put,
// so if Facebook is not connected or does not answer, nothing changes for visitors.
const feed = document.getElementById('fbFeed');
const grid = document.getElementById('fbGrid');
// Rows are four across (two on phones), so show 8 or 4 photos to keep every row full.
const howMany = (n) => (n >= 8 ? 8 : n >= 4 ? 4 : n);

function tile(p) {
  const a = document.createElement('a');
  a.href = p.link || feed.dataset.page;
  a.target = '_blank';
  a.rel = 'noopener';
  const img = document.createElement('img');
  img.src = p.src;
  img.alt = p.alt;
  img.loading = 'lazy';
  img.width = p.width;
  img.height = p.height;
  a.appendChild(img);
  return a;
}

fetch(feed.dataset.endpoint)
  .then((r) => (r.ok ? r.json() : { photos: [] }))
  .then((d) => {
    if (!d.photos || !d.photos.length) return;
    d.photos.slice(0, howMany(d.photos.length)).forEach((p) => grid.appendChild(tile(p)));
    feed.hidden = false;
  })
  .catch(() => {});
