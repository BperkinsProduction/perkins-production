// Phone hero: the visitor polishes the Corvette with a thumb. The paint starts dull and the
// polish line follows the finger across the car, the same shader the desktop film uses.
// A sideways drag polishes; an up or down swipe still scrolls the page (touch-action: pan-y).
// Without WebGL the finished photo shows as it is.
import { createPaintGrade } from './paint-grade.js';

const stage = document.querySelector('.ph-stage');
const photo = stage && stage.querySelector('img');
const canvas = stage && stage.querySelector('.ph-grade');

// The line's edge runs from -0.18 to 1.18 across the frame (see paint-grade.js).
const toClean = (f) => (f + 0.18) / 1.36;
const toPct = (c) => Math.round(Math.min(1, Math.max(0, c * 1.36 - 0.18)) * 100);

function start() {
  // The phone hero is hidden on desktop; only run it while it is on screen.
  if (!stage.offsetWidth) return false;
  let grade = null;
  try { grade = createPaintGrade(canvas, photo, [0.3, 0.6]); } catch (e) { grade = null; }
  if (!grade) return true;
  const hint = stage.querySelector('.ph-hint');
  const meter = stage.querySelector('.ph-meter');
  const num = meter.querySelector('b');
  let clean = 0, target = 0, raf = 0, pct = -1;

  grade.resize();
  grade.draw(0, true);
  stage.classList.add('graded');

  function frame() {
    clean += (target - clean) * 0.22;
    if (Math.abs(target - clean) < 0.002) clean = target;
    grade.draw(clean);
    const p = toPct(clean);
    if (p !== pct) { pct = p; num.textContent = p + '%'; meter.classList.toggle('full', p === 100); }
    raf = clean === target ? 0 : requestAnimationFrame(frame);
  }
  function polishTo(clientX) {
    const r = stage.getBoundingClientRect();
    const f = (clientX - r.left) / r.width;
    // Polish only moves forward, like a real pass. Near the right edge it finishes the car.
    const next = f > 0.92 ? 1 : Math.max(target, toClean(f));
    if (next === target) return;
    target = next;
    if (!raf) raf = requestAnimationFrame(frame);
  }

  let down = false;
  stage.addEventListener('pointerdown', (e) => { down = true; hint.classList.add('gone'); polishTo(e.clientX); });
  stage.addEventListener('pointermove', (e) => { if (down) polishTo(e.clientX); });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach((t) => stage.addEventListener(t, () => { down = false; }));
  addEventListener('resize', () => { grade.resize(); grade.draw(clean, true); }, { passive: true });
  return true;
}

if (stage) {
  // A desktop window narrowed to phone width starts it then.
  const go = () => { if (start()) removeEventListener('resize', go); };
  addEventListener('resize', go, { passive: true });
  if (photo.complete) go(); else photo.addEventListener('load', go, { once: true });
}
