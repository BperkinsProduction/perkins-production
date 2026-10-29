import { createPaintGrade } from './paint-grade.js';

// The scroll-scrubbed hero film. Engine from the 10k websites standard: Blob fetch with a
// loading ring, a leashed dt-normalized lerp that rests, gated seeks, DOM writes only on
// change, and five live gates that hand phones and reduced motion the static hero.

const wrap = document.querySelector('.scrub-wrap');
const stage = wrap.querySelector('.scrub-stage');
const video = wrap.querySelector('.film');
const posterLayer = wrap.querySelector('.poster');
const ring = wrap.querySelector('.ring');
const gradeCanvas = wrap.querySelector('.grade');
const sign = wrap.querySelector('.sign3d');
const signImg = sign.querySelector('img');
const bands = [...wrap.querySelectorAll('.band')].map((el) => {
  const [a, b] = el.dataset.band.split(',').map(Number);
  return { el, a, b, op: -1, k: -1, first: a === 0, last: b === 1 };
});

// These five strings must match the CSS media queries in site.css exactly.
const GATES = [
  '(max-width: 720px)',
  '(orientation: portrait) and (max-width: 1024px)',
  '(orientation: portrait) and (pointer: coarse)',
  '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
  '(prefers-reduced-motion: reduce)',
];

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };

// Split headlines into word and character spans once, with a seeded random so every load matches.
function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
wrap.querySelectorAll('.split').forEach((h, n) => {
  const text = h.textContent;
  const r = rng(41 + n * 7);
  const words = text.split(' ');
  h.setAttribute('aria-label', text);
  h.innerHTML = words.map((w, i) =>
    `<span class="w" aria-hidden="true" style="--th:${(i / words.length * 0.5 + r() * 0.06).toFixed(3)}">${w}</span>`
  ).join(' ');
});

function heroProgress() {
  const range = wrap.offsetHeight - innerHeight;
  if (range <= 0) return 0;
  return clamp((scrollY - wrap.offsetTop) / range, 0, 1);
}

// Gated seeks: one in flight, keep only the newest target, never deadlock.
let seekBusy = false, pendingTime = null, seekAt = 0;
function requestSeek(t) {
  if (!video.duration) return;
  if (seekBusy && performance.now() - seekAt > 300) { seekBusy = false; pendingTime = null; }
  if (seekBusy) { pendingTime = t; return; }
  seekBusy = true; seekAt = performance.now();
  video.currentTime = Math.min(t, video.duration - 0.04);
}
let grade = null;
const cleanAt = (p) => smoothstep(p, 0.04, 0.82);
function drawGrade(force) { if (grade) grade.draw(cleanAt(shown), force); }
video.addEventListener('seeked', () => {
  drawGrade();
  seekBusy = false;
  if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
});
video.addEventListener('error', () => { seekBusy = false; pendingTime = null; stage.classList.add('video-failed'); });


// The 3D sign rides on the painted sign in the film. Centers are in the film's own pixels
// (1920 x 1080), measured from the footage. The rendered title sits at 48.9% across and
// 45.9% down inside each Blender frame, and is drawn about twice the size of the painted lettering so it reads first.
const SIGN_FRAMES = 24, SIGN_X = 641, SIGN_W = 640;
const SIGN_TRACK = [[0, 196], [0.333, 186], [0.667, 170], [1, 149], [1.333, 126], [1.667, 101], [2, 77], [2.333, 51], [2.667, 28], [3, 4], [3.4, -25]];
const signFrames = [];
let signShown = -1, signFrameNow = -1, signOp = -1;
function signY(t) {
  for (let i = 1; i < SIGN_TRACK.length; i++) {
    const [t1, y1] = SIGN_TRACK[i], [t0, y0] = SIGN_TRACK[i - 1];
    if (t <= t1) return y0 + (y1 - y0) * ((t - t0) / (t1 - t0));
  }
  return -60;
}
function preloadSign() {
  const base = sign.dataset.base;
  for (let i = 0; i < SIGN_FRAMES; i++) { const im = new Image(); im.src = `${base}s${String(i).padStart(2, '0')}.webp`; signFrames.push(im.src); }
}
function updateSign(p, force) {
  if (!force && Math.abs(p - signShown) < 0.0006) return;
  signShown = p;
  const W = stage.clientWidth, H = stage.clientHeight, dur = video.duration || 6.04;
  const s = Math.max(W / 1920, H / 1080), ox = (W - 1920 * s) / 2, oy = (H - 1080 * s) / 2;
  const t = p * dur, w = SIGN_W * s, h = w * 329 / 1295;
  const x = ox + SIGN_X * s - w * 0.489, y = oy + signY(t) * s - h * 0.459;
  sign.style.setProperty('--sw', w.toFixed(1) + 'px');
  sign.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
  const op = 1 - smoothstep(t, 2.55, 3.05);
  if (Math.abs(op - signOp) > 0.01) { signOp = op; sign.style.opacity = op.toFixed(3); }
  const f = Math.round(clamp(p / 0.5, 0, 1) * (SIGN_FRAMES - 1));
  if (f !== signFrameNow && signFrames[f]) { signFrameNow = f; signImg.src = signFrames[f]; }
}

// Band one assembles on its own after load, then holds.
let loadK = 0, loadStart = 0;

function updateCaptions(p) {
  for (const band of bands) {
    const { a, b } = band;
    const f = Math.min(0.03, (b - a) / 3);
    let op = (band.first ? 1 : smoothstep(p, a, a + f)) * (band.last ? 1 : 1 - smoothstep(p, b - f, b));
    let k = clamp((p - a) / Math.min(0.06, (b - a) * 0.35), 0, 1);
    if (band.first) k = Math.max(k, loadK);
    if (Math.abs(op - band.op) > 0.008) { band.op = op; band.el.style.opacity = op.toFixed(3); band.el.style.visibility = op < 0.01 ? 'hidden' : 'visible'; }
    if (Math.abs(k - band.k) > 0.008) { band.k = k; band.el.style.setProperty('--k', k.toFixed(3)); }
  }
}

// Leashed lerp, normalized to 60fps so every screen feels the same, resting when converged.
let target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
function tick(now) {
  const dt = Math.min(100, now - (lastTick || now));
  lastTick = now;
  shown += (target - shown) * (1 - Math.pow(1 - 0.2, dt / 16.667));
  if (shown < target - 0.04) shown = target - 0.04;
  else if (shown > target + 0.04) shown = target + 0.04;
  if (loadStart) loadK = clamp((now - loadStart) / 1100, 0, 1);
  const settled = Math.abs(target - shown) < 0.0005 && (loadK >= 1 || !loadStart);
  if (settled) shown = target;
  requestSeek(shown * (video.duration || 0));
  updateCaptions(shown);
  drawGrade();
  if (stage.classList.contains('video-ready')) updateSign(shown);
  if (settled) { rafId = null; lastTick = 0; }
  else rafId = requestAnimationFrame(tick);
}
function kick() { if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick); }
function onScroll() { target = heroProgress(); kick(); }

new IntersectionObserver(([e]) => { heroOnScreen = e.isIntersecting; if (heroOnScreen) { target = heroProgress(); kick(); } }).observe(wrap);

// Load the film once, only for visitors who get the scrub. The poster wins the bandwidth race.
let started = false, inited = false;
function initHeroOnce() {
  if (inited) return; inited = true;
  const posterUrl = video.dataset.poster;
  posterLayer.style.backgroundImage = `url('${posterUrl}')`;
  const pi = new Image();
  pi.onload = pi.onerror = startBlobFetch;
  pi.src = posterUrl;
  setTimeout(startBlobFetch, 4000);
  loadStart = performance.now();
  kick();
}
function startBlobFetch() { if (started) return; started = true; loadHeroBlob().catch(failVideo); }

async function loadHeroBlob() {
  const ctrl = new AbortController();
  let watchdog = setTimeout(() => ctrl.abort(), 20000);
  const res = await fetch(video.dataset.src, { priority: 'low', signal: ctrl.signal });
  if (!res.ok) throw new Error('film ' + res.status);
  const total = Number(res.headers.get('Content-Length')) || Number(video.dataset.bytes) || 6000000;
  const reader = res.body.getReader();
  const chunks = [];
  let got = 0, lastRing = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    clearTimeout(watchdog);
    watchdog = setTimeout(() => ctrl.abort(), 20000);
    chunks.push(value);
    got += value.length;
    const now = performance.now();
    if (now - lastRing > 100) { lastRing = now; ring.style.setProperty('--ld', Math.round(126 * (1 - Math.min(1, got / total)))); }
  }
  clearTimeout(watchdog);
  ring.style.setProperty('--ld', 0);
  video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
  video.load();
  video.addEventListener('canplay', () => {
    requestSeek(heroProgress() * video.duration);
    stage.classList.add('video-ready');
    updateSign(heroProgress(), true);
    try { grade = createPaintGrade(gradeCanvas, video); } catch (e) { grade = null; }
    if (grade) {
      grade.resize();
      addEventListener('resize', () => { grade.resize(); drawGrade(true); }, { passive: true });
      drawGrade(true);
      stage.classList.add('graded');
    }
  }, { once: true });
}
function failVideo() { stage.classList.add('video-failed'); }

let scrubOn = false;
function enableScrub() {
  if (scrubOn) return; scrubOn = true;
  initHeroOnce();
  if (!signFrames.length) preloadSign();
  addEventListener('scroll', onScroll, { passive: true });
  bands.forEach((b) => { b.op = -1; b.k = -1; });
  updateCaptions(heroProgress());
  onScroll();
}
function disableScrub() {
  if (!scrubOn) return; scrubOn = false;
  removeEventListener('scroll', onScroll);
  if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
}
function applyHeroMode() { if (GATES.some((q) => matchMedia(q).matches)) disableScrub(); else enableScrub(); }
const MQLS = GATES.map((q) => matchMedia(q));
MQLS.forEach((m) => m.addEventListener('change', applyHeroMode));
addEventListener('resize', () => { onScroll(); if (stage.classList.contains('video-ready')) updateSign(shown, true); }, { passive: true });
applyHeroMode();
