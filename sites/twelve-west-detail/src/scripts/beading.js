// Water on paint, side by side. Rain lands on both halves of a red panel. On bare paint the
// drops flatten into sheets that cling and spread. On coated paint they pull into tight round
// beads, and once a bead is big enough it rolls off, sweeping up the small ones in its path.
// Runs only while on screen. Reduced motion shows one settled frame.

const box = document.getElementById('beads');
const canvas = box.querySelector('canvas');
const ctx = canvas.getContext('2d');
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

let W = 0, H = 0, dpr = 1, u = 1, bg = null, half = 0, raf = 0, last = 0, visible = false, spawnBare = 0, spawnCoat = 0;
let bare = [], coat = [];
const R = (a, b) => a + Math.random() * (b - a);

// Glossy red paint with one LED tube reflection across it, drawn once.
function paint() {
  bg = document.createElement('canvas'); bg.width = W; bg.height = H;
  const g = bg.getContext('2d');
  const base = g.createLinearGradient(0, 0, 0, H);
  base.addColorStop(0, '#7d0c10'); base.addColorStop(0.5, '#b0141a'); base.addColorStop(1, '#5a070b');
  g.fillStyle = base; g.fillRect(0, 0, W, H);
  g.save();
  g.translate(W * 0.5, H * 0.32); g.rotate(-0.12);
  const tube = g.createLinearGradient(0, -H * 0.09, 0, H * 0.09);
  tube.addColorStop(0, 'rgba(255,255,255,0)'); tube.addColorStop(0.45, 'rgba(255,240,236,.55)'); tube.addColorStop(0.5, 'rgba(255,255,255,.85)'); tube.addColorStop(0.55, 'rgba(255,240,236,.55)'); tube.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = tube; g.fillRect(-W, -H * 0.09, W * 2, H * 0.18);
  g.restore();
  const shade = g.createRadialGradient(W * 0.5, H * 0.5, H * 0.2, W * 0.5, H * 0.5, W * 0.7);
  shade.addColorStop(0, 'rgba(0,0,0,0)'); shade.addColorStop(1, 'rgba(0,0,0,.45)');
  g.fillStyle = shade; g.fillRect(0, 0, W, H);
}

function size() {
  dpr = Math.min(devicePixelRatio || 1, 2);
  const w = Math.round(box.clientWidth * dpr), h = Math.round(box.clientHeight * dpr);
  if (!w || !h) return;
  const scale = W ? w / W : 1;
  W = w; H = h; half = W / 2; u = H / 300;
  canvas.width = W; canvas.height = H;
  [...bare, ...coat].forEach((d) => { d.x *= scale; d.y *= scale; d.r *= scale; if (d.to) d.to *= scale; if (d.lobes) d.lobes.forEach((l) => { l[0] *= scale; l[1] *= scale; l[2] *= scale; }); });
  paint();
}

// Bare paint: a drop lands and spreads flat, in an uneven shape.
function landBare() {
  const r = R(5, 11) * u;
  const lobes = [];
  for (let i = 0; i < 4; i++) lobes.push([R(-0.6, 0.6) * r, R(-0.5, 0.5) * r, R(0.55, 0.95) * r]);
  bare.push({ x: R(0.04, 0.96) * half, y: R(0.05, 0.95) * H, r: r * 0.4, to: r * R(2.2, 3.2), lobes, age: 0 });
}
// Coated paint: a drop lands as a tight bead.
function landCoat() {
  const r = R(2.6, 6) * u;
  const x = half + R(0.04, 0.96) * half, y = R(0.02, 0.9) * H;
  // Landing on a bead makes it bigger instead of adding a second one.
  const hit = coat.find((b) => Math.hypot(b.x - x, b.y - y) < b.r + r);
  if (hit) hit.r = Math.sqrt(hit.r * hit.r + r * r);
  else coat.push({ x, y, r, vy: 0 });
}

function step(dt) {
  const rate = 10 * (W / H);
  spawnBare += dt * rate; spawnCoat += dt * rate;
  while (spawnBare >= 1) { spawnBare--; landBare(); }
  while (spawnCoat >= 1) { spawnCoat--; landCoat(); }
  for (const d of bare) {
    d.r += (1 - d.r / d.to) * d.to * dt * 4;
    d.age += dt;
    // Big sheets creep down slowly; they never clear.
    if (d.r > 22 * u) d.y += 5 * u * dt;
  }
  const roll = 7 * u;
  for (const b of coat) {
    if (b.r > roll) { b.vy += 900 * u * dt; b.y += b.vy * dt; }
  }
  // A rolling bead picks up the beads it runs into.
  for (const b of coat) {
    if (!b.vy) continue;
    for (const o of coat) {
      if (o === b || o.gone) continue;
      if (Math.hypot(o.x - b.x, o.y - b.y) < b.r + o.r) { b.r = Math.min(Math.sqrt(b.r * b.r + o.r * o.r), 13 * u); o.gone = true; }
    }
  }
  coat = coat.filter((b) => !b.gone && b.y < H + 30 * u);
  // Old sheets slowly dry and fade, so the bare side stays wet but never fills solid.
  bare = bare.filter((d) => d.age < 9 && d.y < H + 40 * u);
}

function drawBare(d) {
  // A flat film of water: a lighter rim along the top edge, then the darker, milky sheet.
  const k = d.r / d.to;
  const shape = (dy) => {
    ctx.beginPath();
    for (const [ox, oy, lr] of d.lobes) { ctx.moveTo(d.x + ox * k + lr * k, d.y + oy * k + dy); ctx.arc(d.x + ox * k, d.y + oy * k + dy, lr * k, 0, Math.PI * 2); }
  };
  ctx.globalAlpha = Math.min(1, (9 - d.age) / 2.5);
  ctx.fillStyle = 'rgba(255,214,206,.16)'; shape(-1.2 * u); ctx.fill();
  ctx.fillStyle = 'rgba(48,4,8,.3)'; shape(0); ctx.fill();
  ctx.globalAlpha = 1;
}
function drawBead(b) {
  const { x, y, r } = b;
  // Shadow, body, the bright caustic under it, and the window highlight on top.
  ctx.fillStyle = 'rgba(20,0,2,.45)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.25, y + r * 0.35, r * 1.05, r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
  const body = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r);
  body.addColorStop(0, 'rgba(255,190,186,.25)'); body.addColorStop(0.7, 'rgba(150,10,16,.25)'); body.addColorStop(1, 'rgba(40,0,4,.75)');
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,170,160,.55)';
  ctx.beginPath(); ctx.ellipse(x + r * 0.1, y + r * 0.5, r * 0.5, r * 0.22, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,.95)';
  ctx.beginPath(); ctx.ellipse(x - r * 0.35, y - r * 0.4, r * 0.28, r * 0.18, -0.6, 0, Math.PI * 2); ctx.fill();
}

function draw() {
  if (!bg) return;
  ctx.drawImage(bg, 0, 0);
  ctx.save(); ctx.beginPath(); ctx.rect(0, 0, half, H); ctx.clip();
  bare.forEach(drawBare);
  ctx.restore();
  ctx.save(); ctx.beginPath(); ctx.rect(half, 0, half, H); ctx.clip();
  // The coating itself: a touch deeper and glossier.
  ctx.fillStyle = 'rgba(255,255,255,.035)'; ctx.fillRect(half, 0, half, H);
  coat.forEach(drawBead);
  ctx.restore();
  // The tape line between the two halves.
  ctx.fillStyle = 'rgba(238,244,250,.75)'; ctx.fillRect(half - dpr, 0, 2 * dpr, H);
}

function tick(now) {
  raf = 0;
  const dt = Math.min(0.05, (now - (last || now)) / 1000); last = now;
  step(dt); draw();
  if (visible) raf = requestAnimationFrame(tick); else last = 0;
}

size();
addEventListener('resize', size, { passive: true });
if (still) {
  // One settled frame: a few seconds of rain, run instantly.
  for (let i = 0; i < 200; i++) step(1 / 50);
  draw();
} else {
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible && !raf) raf = requestAnimationFrame(tick); }).observe(box);
}
