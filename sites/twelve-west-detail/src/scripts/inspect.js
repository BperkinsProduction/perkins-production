// Inspection light: the paint sits in the dark and a handheld light follows the pointer.
// Swirl marks are thousands of tiny random scratches; the ones running across the light's
// direction catch it, which is why swirls show up as rings around the reflection. "After"
// fades the scratches out so only a clean reflection is left. With no pointer the light
// drifts on its own while the panel is on screen. Reduced motion holds it still.

const panel = document.getElementById('insPanel');
const canvas = panel.querySelector('canvas');
const ctx = canvas.getContext('2d');
const read = panel.querySelector('.ins-read');
const hint = panel.querySelector('.ins-hint');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

const photo = new Image();
photo.src = panel.dataset.src;

// Scratches live in paint space (0 to 1), so they stay put while the light moves.
const rand = (() => { let s = 12; return () => (s = (s * 16807) % 2147483647) / 2147483647; })();
const scratches = [];
for (let i = 0; i < 9000; i++) {
  const a = rand() * Math.PI;
  scratches.push({ x: rand(), y: rand(), dx: Math.cos(a), dy: Math.sin(a), len: 0.004 + rand() * 0.014, w: 0.45 + rand() * 0.5 });
}
// A few longer scratches, the kind a sponge or a ring leaves.
for (let i = 0; i < 26; i++) {
  const a = rand() * Math.PI;
  scratches.push({ x: rand(), y: rand(), dx: Math.cos(a), dy: Math.sin(a), len: 0.05 + rand() * 0.09, w: 0.6 });
}

let W = 0, H = 0, dpr = 1, dim = null, bright = null, lamp = null;
let lx = 0.32, ly = 0.42, tx = lx, ty = ly, mode = 0, mix = 0, user = false, visible = false, raf = 0, t0 = performance.now();

// The photo drawn to fill the panel, darkened by a black layer (works in every browser).
function cover(dark) {
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const s = Math.max(W / photo.naturalWidth, H / photo.naturalHeight);
  const w = photo.naturalWidth * s, h = photo.naturalHeight * s;
  g.drawImage(photo, (W - w) / 2, (H - h) / 2, w, h);
  if (dark) { g.fillStyle = `rgba(4,5,8,${dark})`; g.fillRect(0, 0, W, H); }
  return c;
}
function size() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  W = Math.round(panel.clientWidth * dpr); H = Math.round(panel.clientHeight * dpr);
  if (!W || !H || !photo.naturalWidth) return;
  canvas.width = W; canvas.height = H;
  // The paint in the dark, and the paint under the lamp.
  dim = cover(0.9);
  bright = cover(0);
  lamp = document.createElement('canvas'); lamp.width = W; lamp.height = H;
  draw();
}

function draw() {
  if (!dim) return;
  const R = Math.max(W, H) * 0.24, px = lx * W, py = ly * H;
  ctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(dim, 0, 0);
  // The lit spot: the bright paint, faded out at the edge of the beam.
  const g = lamp.getContext('2d');
  g.globalCompositeOperation = 'source-over';
  g.clearRect(0, 0, W, H);
  g.drawImage(bright, 0, 0);
  g.globalCompositeOperation = 'destination-in';
  const beam = g.createRadialGradient(px, py, 0, px, py, R);
  beam.addColorStop(0, 'rgba(0,0,0,1)'); beam.addColorStop(0.45, 'rgba(0,0,0,.75)'); beam.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = beam; g.fillRect(0, 0, W, H);
  ctx.drawImage(lamp, 0, 0);

  ctx.globalCompositeOperation = 'lighter';
  // The swirls: brightest when the scratch runs across the line to the light.
  const swirl = 1 - mix;
  if (swirl > 0.01) {
    const sig = R * 0.5;
    ctx.lineCap = 'round';
    for (const s of scratches) {
      const sx = s.x * W, sy = s.y * H, ex = sx - px, ey = sy - py;
      const d2 = ex * ex + ey * ey;
      if (d2 > R * R) continue;
      const d = Math.sqrt(d2) || 1;
      const across = 1 - Math.abs((s.dx * ex + s.dy * ey) / d);
      const a = 1.4 * Math.pow(across, 5) * Math.exp(-d2 / (2 * sig * sig)) * swirl * (d < R * 0.05 ? d / (R * 0.05) : 1);
      if (a < 0.04) continue;
      // Drawn as a short arc around the light, which is how a lit swirl actually reads.
      const ang = Math.atan2(ey, ex), span = (s.len * W) / d;
      ctx.strokeStyle = `rgba(255,236,226,${Math.min(0.85, a).toFixed(3)})`;
      ctx.lineWidth = s.w * dpr;
      ctx.beginPath(); ctx.arc(px, py, d, ang - span / 2, ang + span / 2); ctx.stroke();
    }
    // Haze around the hot spot, the dullness swirls give paint.
    const hz = ctx.createRadialGradient(px, py, 0, px, py, R * 0.5);
    hz.addColorStop(0, `rgba(255,220,210,${(0.22 * swirl).toFixed(3)})`); hz.addColorStop(1, 'rgba(255,220,210,0)');
    ctx.fillStyle = hz; ctx.fillRect(0, 0, W, H);
  }
  // The lamp's own reflection: soft and spread on swirled paint, small and sharp on clean paint.
  const r0 = R * (0.07 - 0.035 * mix);
  const hot = ctx.createRadialGradient(px, py, 0, px, py, r0);
  hot.addColorStop(0, 'rgba(255,255,255,1)'); hot.addColorStop(0.5, `rgba(255,250,246,${(0.75 + 0.2 * mix).toFixed(2)})`); hot.addColorStop(1, 'rgba(255,250,246,0)');
  ctx.fillStyle = hot; ctx.fillRect(px - r0, py - r0, r0 * 2, r0 * 2);
}

function tick(now) {
  raf = 0;
  if (!user && !still) {
    const t = (now - t0) / 1000;
    tx = 0.5 + Math.sin(t * 0.45) * 0.3; ty = 0.48 + Math.sin(t * 0.7 + 1) * 0.2;
  }
  lx += (tx - lx) * 0.18; ly += (ty - ly) * 0.18;
  mix += ((mode ? 1 : 0) - mix) * 0.12;
  if (Math.abs((mode ? 1 : 0) - mix) < 0.004) mix = mode ? 1 : 0;
  draw();
  const moving = Math.abs(tx - lx) > 0.0005 || Math.abs(ty - ly) > 0.0005 || (mix !== 0 && mix !== 1);
  if (visible && (moving || (!user && !still))) raf = requestAnimationFrame(tick);
}
const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };

function aim(e) {
  const r = panel.getBoundingClientRect();
  tx = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
  ty = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
  if (!user) { user = true; hint.classList.add('gone'); }
  kick();
}
canvas.addEventListener('pointermove', aim);
canvas.addEventListener('pointerdown', aim);

panel.querySelectorAll('[data-mode]').forEach((b) => b.addEventListener('click', () => {
  mode = +b.dataset.mode;
  panel.querySelectorAll('[data-mode]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  read.textContent = mode ? 'Corrected. One clean reflection.' : 'Swirl marks and fine scratches';
  panel.classList.toggle('after', !!mode);
  kick();
}));

new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) kick(); }).observe(panel);
addEventListener('resize', size, { passive: true });
if (photo.complete) size(); else photo.addEventListener('load', size, { once: true });
