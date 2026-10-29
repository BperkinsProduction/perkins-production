// Hold to polish: holding builds the polish, letting go early eases it back, finishing lights
// up the coating tiers. Reduced motion skips straight to the finished state.
const fig = document.getElementById('polish');
const btn = document.getElementById('holdBtn');
const label = btn.querySelector('.hold-label');
const tiers = document.getElementById('tiers');
const FILL_MS = 1600, DRAIN_MS = 900;
let p = 0, holding = false, done = false, raf = null, last = 0;

const setWidth = () => fig.style.setProperty('--w', fig.clientWidth + 70 + 'px');
setWidth();
addEventListener('resize', setWidth, { passive: true });

function finish() {
  done = true; p = 1; holding = false;
  fig.style.setProperty('--p', 1);
  fig.style.setProperty('--done', 1);
  fig.classList.add('done');
  label.textContent = 'Polished. That is the gloss a coating keeps.';
  tiers.classList.add('lit');
  setTimeout(() => tiers.classList.add('settled'), 900);
}

function frame(now) {
  const dt = Math.min(64, now - (last || now)); last = now;
  p += holding ? dt / FILL_MS : -dt / DRAIN_MS;
  p = Math.min(1, Math.max(0, p));
  fig.style.setProperty('--p', p.toFixed(4));
  if (p >= 1) { finish(); raf = null; last = 0; return; }
  if (!holding && p <= 0) { raf = null; last = 0; return; }
  raf = requestAnimationFrame(frame);
}
function start(e) {
  if (done) return;
  if (e && e.pointerId !== undefined) btn.setPointerCapture(e.pointerId);
  holding = true;
  if (raf === null) raf = requestAnimationFrame(frame);
}
function stop() { holding = false; if (!done && raf === null && p > 0) raf = requestAnimationFrame(frame); }

btn.addEventListener('pointerdown', (e) => { e.preventDefault(); start(e); });
btn.addEventListener('pointerup', stop);
btn.addEventListener('pointercancel', stop);
btn.addEventListener('lostpointercapture', stop);
btn.addEventListener('keydown', (e) => { if ((e.key === ' ' || e.key === 'Enter') && !e.repeat) { e.preventDefault(); start(); } });
btn.addEventListener('keyup', (e) => { if (e.key === ' ' || e.key === 'Enter') stop(); });
btn.addEventListener('contextmenu', (e) => e.preventDefault());

const rm = matchMedia('(prefers-reduced-motion: reduce)');
if (rm.matches) finish();
rm.addEventListener('change', (e) => { if (e.matches) finish(); });
