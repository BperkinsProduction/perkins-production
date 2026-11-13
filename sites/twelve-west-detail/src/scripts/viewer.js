// Full screen photo viewer for the gallery. Arrows, swipe, or the arrow keys move between
// photos; Escape, the X, or a tap on the dark backdrop closes it. Neighbours preload.
const dlg = document.getElementById('viewer');
if (dlg && dlg.showModal) {
  const photos = JSON.parse(dlg.dataset.photos);
  const pic = dlg.querySelector('img');
  const name = dlg.querySelector('figcaption b');
  const count = dlg.querySelector('.vcount');
  let i = 0, opener = null;

  const preload = (n) => { const im = new Image(); im.src = photos[(n + photos.length) % photos.length].src; };
  function show(n, dir = 0) {
    i = (n + photos.length) % photos.length;
    const p = photos[i];
    pic.classList.remove('from-l', 'from-r');
    void pic.offsetWidth;
    if (dir) pic.classList.add(dir > 0 ? 'from-r' : 'from-l');
    pic.src = p.src; pic.alt = p.alt;
    name.textContent = p.caption;
    count.textContent = `${i + 1} / ${photos.length}`;
    preload(i + 1); preload(i - 1);
  }
  function open(n, from) {
    opener = from;
    show(n);
    dlg.showModal();
    document.documentElement.classList.add('viewing');
  }
  dlg.addEventListener('close', () => {
    document.documentElement.classList.remove('viewing');
    if (opener) opener.focus({ preventScroll: true });
  });

  document.querySelectorAll('[data-view]').forEach((b) => b.addEventListener('click', () => open(+b.dataset.view, b)));
  dlg.querySelectorAll('[data-step]').forEach((b) => b.addEventListener('click', () => show(i + +b.dataset.step, +b.dataset.step)));
  dlg.querySelector('[data-close]').addEventListener('click', () => dlg.close());
  // A tap on the backdrop (not the photo or a button) closes it.
  dlg.addEventListener('click', (e) => { if (e.target === dlg || e.target.tagName === 'FIGURE') dlg.close(); });
  dlg.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); show(i + 1, 1); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1, -1); }
  });

  // Swipe sideways to move between photos.
  let x0 = null, y0 = 0;
  dlg.addEventListener('pointerdown', (e) => { x0 = e.clientX; y0 = e.clientY; });
  dlg.addEventListener('pointerup', (e) => {
    if (x0 === null) return;
    const dx = e.clientX - x0, dy = e.clientY - y0;
    x0 = null;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.4) show(i + (dx < 0 ? 1 : -1), dx < 0 ? 1 : -1);
  });
}
