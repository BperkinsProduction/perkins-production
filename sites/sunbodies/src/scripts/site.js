import { levels, planById, money, perDay, HOURS, hoursRows, special } from '../data/salon';

(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const smoothstep = (p, e0, e1) => { const t = clamp((p - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- text splitting (seeded, identical every load) ---------- */
  function rng(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
  function buildVisual(text, mode, seed, spread) {
    const r = rng(seed);
    const vis = document.createElement('span');
    vis.setAttribute('aria-hidden', 'true');
    const lines = text.split('|');
    const words = [];
    lines.forEach((ln, li) => {
      ln.split(' ').forEach((raw, wi, arr) => {
        const em = /^\*.*\*$/.test(raw);
        const word = raw.replace(/\*/g, '');
        const w = document.createElement('span');
        w.className = 'w' + (em ? ' em' : '');
        [...word].forEach(ch => { const c = document.createElement('span'); c.className = 'c'; c.textContent = ch; w.appendChild(c); });
        vis.appendChild(w);
        words.push(w);
        if (wi < arr.length - 1) vis.appendChild(document.createTextNode(' '));
      });
      if (li < lines.length - 1) vis.appendChild(document.createElement('br'));
    });
    const chars = $$('.c', vis);
    words.forEach((w, i) => {
      if (mode === 'drift') w.style.setProperty('--th', (i / words.length * 0.55).toFixed(3));
      if (mode === 'rise') w.style.setProperty('--th', (i / words.length * 0.5).toFixed(3));
    });
    if (mode === 'weave') {
      chars.forEach((c, i) => {
        c.style.setProperty('--th', (i / chars.length * (spread || 0.5) + r() * 0.06).toFixed(3));
        c.style.setProperty('--jy', ((i % 2 ? 1 : -1) * (14 + r() * 10)).toFixed(1) + 'px');
      });
    }
    return vis;
  }
  $$('[data-split]').forEach(el => {
    const raw = el.textContent.trim();
    const mode = el.dataset.split;
    const seed = +el.dataset.seed || 7;
    const spread = +el.dataset.spread || 0;
    const plain = raw.replace(/\|/g, ' ').replace(/\*/g, '');
    el.textContent = '';
    const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = plain;
    el.appendChild(sr);
    if (mode === 'blur') {
      const sharp = buildVisual(raw, mode, seed); sharp.classList.add('sharp');
      const soft = buildVisual(raw, mode, seed); soft.classList.add('soft');
      el.append(sharp, soft);
    } else {
      el.appendChild(buildVisual(raw, mode, seed, spread));
    }
  });

  /* ---------- the scrub hero ---------- */
  const scrub = $('#scrub'), stage = $('#stage'), video = $('#hero');
  const VIDEO_URL = stage.dataset.video, VIDEO_BYTES = +stage.dataset.bytes || 0;
  const POSTER_URL = stage.dataset.poster, ENDING_URL = stage.dataset.ending;
  const poster = $('#poster'), posterEnd = $('#posterEnd');
  const ring = $('#ring'), cue = $('#cue'), cueText = $('#cueText'), clockEl = $('#clock');
  const bands = $$('.band').map((el, i, arr) => ({
    el, a: +el.dataset.a, b: +el.dataset.b, ramp: el.dataset.ramp ? +el.dataset.ramp : null,
    first: +el.dataset.a === 0, last: i === arr.length - 1, op: -1, k: -1, on: null
  }));

  let target = 0, shown = 0, rafId = null, lastTick = 0, heroOnScreen = true;
  let loadK = 0, loadStart = 0, loadRaf = null;
  let videoReady = false, videoFailed = false;

  function heroProgress() {
    const r = scrub.getBoundingClientRect();
    const range = scrub.offsetHeight - innerHeight;
    return range > 0 ? clamp(-r.top / range, 0, 1) : 0;
  }

  function updateCaptions(p) {
    for (const band of bands) {
      const len = band.b - band.a;
      const f = Math.min(0.04, len / 4);
      let op = (band.first ? 1 : smoothstep(p, band.a, band.a + f)) * (band.last ? 1 : 1 - smoothstep(p, band.b - f, band.b));
      const ramp = band.ramp || Math.min(0.045, len * 0.35);
      let k = clamp((p - band.a) / ramp, 0, 1);
      if (band.first) k = Math.max(k, loadK);
      if (Math.abs(op - band.op) > 0.004 || (op === 0) !== (band.op === 0) || (op === 1 && band.op !== 1)) {
        band.op = op; band.el.style.opacity = op.toFixed(3);
      }
      if (Math.abs(k - band.k) > 0.008 || (k === 1 && band.k !== 1) || (k === 0 && band.k !== 0)) {
        band.k = k; band.el.style.setProperty('--k', k.toFixed(3));
      }
      const on = op > 0.02;
      if (on !== band.on) { band.on = on; band.el.classList.toggle('on', on); }
    }
    if (videoFailed || !videoReady) {
      if (!posterEnd._bg && (videoFailed || p > 0.05)) { posterEnd._bg = 1; posterEnd.style.backgroundImage = "url('" + ENDING_URL + "')"; }
      const e = smoothstep(p, 0.15, 0.95);
      if (Math.abs(e - (posterEnd._e ?? -1)) > 0.01 || (e === 1 && posterEnd._e !== 1)) { posterEnd._e = e; posterEnd.style.opacity = e.toFixed(3); }
    }
    const gone = p > 0.04;
    if (gone !== cue._gone) { cue._gone = gone; cue.classList.toggle('gone', gone); }
    updateClock(p, performance.now());
    if (scrubOn) flySet(p / FLY_END);
  }

  let lastClock = '', lastClockAt = 0;
  function updateClock(p, now) {
    if (now - lastClockAt < 100) return;
    const mins = Math.round(17 * 60 + 30 + p * 102);
    const h = Math.floor(mins / 60), m = mins % 60;
    const txt = (h > 12 ? h - 12 : h) + ':' + String(m).padStart(2, '0') + ' PM';
    if (txt === lastClock) return;
    lastClock = txt; lastClockAt = now; clockEl.textContent = txt;
  }

  let seekBusy = false, pendingTime = null;
  function requestSeek(t) {
    if (!videoReady || !video.duration) return;
    if (seekBusy) { pendingTime = t; return; }
    seekBusy = true;
    video.currentTime = t;
  }
  video.addEventListener('seeked', () => {
    seekBusy = false;
    if (pendingTime !== null) { const t = pendingTime; pendingTime = null; requestSeek(t); }
  });
  video.addEventListener('error', () => { seekBusy = false; pendingTime = null; failVideo(); });

  function tick(now) {
    const dt = Math.min(100, now - (lastTick || now));
    lastTick = now;
    const k = 0.16;
    shown += (target - shown) * (1 - Math.pow(1 - k, dt / 16.667));
    if (Math.abs(target - shown) < 0.0005) { shown = target; rafId = null; lastTick = 0; }
    else rafId = requestAnimationFrame(tick);
    requestSeek(shown * (video.duration || 0) * 0.999);
    updateCaptions(shown);
  }
  function onScroll() {
    target = heroProgress();
    if (rafId === null && heroOnScreen) rafId = requestAnimationFrame(tick);
  }
  new IntersectionObserver(es => { heroOnScreen = es[0].isIntersecting; if (heroOnScreen && scrubOn) onScroll(); }).observe(scrub);

  function loadRamp(now) {
    if (!loadStart) loadStart = now;
    const t = clamp((now - loadStart) / 1500, 0, 1);
    loadK = 1 - Math.pow(1 - t, 3);
    updateCaptions(shown);
    loadRaf = t < 1 ? requestAnimationFrame(loadRamp) : null;
  }

  function makeChevron() {
    const ns = 'http://www.w3.org/2000/svg';
    const s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('class', 'chev');
    const p = document.createElementNS(ns, 'path');
    p.setAttribute('d', 'M5 9l7 7 7-7'); p.setAttribute('fill', 'none'); p.setAttribute('stroke', '#FBEEDB'); p.setAttribute('stroke-width', '2'); p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
    s.appendChild(p); return s;
  }
  function settleCue(text) {
    if (ring.isConnected) ring.replaceWith(makeChevron());
    cueText.textContent = text;
  }
  function failVideo() {
    if (videoFailed) return;
    videoFailed = true;
    stage.classList.add('video-failed');
    video.removeAttribute('src');
    video.style.display = 'none';
    settleCue('Scroll to set the sun');
    updateCaptions(heroProgress());
  }

  async function loadHeroBlob() {
    const ctrl = new AbortController();
    let watchdog = setTimeout(() => ctrl.abort(), 20000);
    const res = await fetch(VIDEO_URL, { priority: 'low', signal: ctrl.signal });
    if (!res.ok || !res.body) throw new Error('video ' + res.status);
    const total = Number(res.headers.get('Content-Length')) || VIDEO_BYTES;
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
      const frac = Math.min(1, got / total);
      const now = performance.now();
      if (now - lastRing > 100 || frac === 1) { lastRing = now; ring.style.setProperty('--ld', Math.round(126 * (1 - frac))); }
    }
    clearTimeout(watchdog);
    ring.style.setProperty('--ld', 0);
    video.src = URL.createObjectURL(new Blob(chunks, { type: 'video/mp4' }));
    video.load();
    video.addEventListener('loadeddata', () => {
      videoReady = true;
      requestSeek(heroProgress() * video.duration * 0.999);
      stage.classList.add('video-ready');
      posterEnd.style.opacity = '0';
      settleCue('Scroll to set the sun');
    }, { once: true });
  }

  let heroInit = false;
  function initHeroOnce() {
    if (heroInit) return;
    heroInit = true;
    poster.style.backgroundImage = "url('" + POSTER_URL + "')";
    let started = false;
    const start = () => { if (started) return; started = true; loadHeroBlob().catch(failVideo); };
    const img = new Image();
    img.onload = start; img.onerror = start;
    img.src = POSTER_URL;
    setTimeout(start, 4000);
    loadRaf = requestAnimationFrame(loadRamp);
  }

  /* ---------- the logo: big in the sky, then home to the menu bar ---------- */
  const flyer = $('#flyer'), navEl = $('#nav'), navLogo = $('.nav .brand img');
  const LOGO_RATIO = 1750 / 588;
  const FLY_END = 0.065;
  const fly = { on: false, geo: null, t: -1, req: 0, intro: 1, shownIntro: -1, landed: null };
  const flyAllowed = () => !reduceMQ.matches && innerHeight >= 520;
  const flyNow = () => scrubOn ? heroProgress() / FLY_END : scrollY / (innerHeight * 0.42);
  function flyMeasure() {
    const vw = innerWidth, vh = innerHeight;
    const w0 = scrubOn ? Math.min(vw * 0.46, 760, vh * 0.27 * LOGO_RATIO) : Math.min(vw * 0.8, 440, vh * 0.2 * LOGO_RATIO);
    const r = navLogo.getBoundingClientRect();
    fly.geo = { w0, h0: w0 / LOGO_RATIO, sx: vw / 2, sy: vh * (scrubOn ? 0.385 : 0.24),
      tx: r.left + r.width / 2, ty: r.top + r.height / 2, ts: r.width / w0 };
    flyer.style.width = w0.toFixed(1) + 'px';
    flyer.style.height = (w0 / LOGO_RATIO).toFixed(1) + 'px';
    fly.t = -1;
  }
  function flySet(t) {
    if (!fly.on || !fly.geo) return;
    t = clamp(t, 0, 1);
    fly.req = t;
    const landed = t >= 1;
    if (landed !== fly.landed) { fly.landed = landed; flyer.classList.toggle('on', !landed); navEl.classList.toggle('flying', !landed); }
    if (landed) { fly.t = 1; return; }
    if (Math.abs(t - fly.t) < 0.0004 && fly.intro === fly.shownIntro) return;
    fly.t = t; fly.shownIntro = fly.intro;
    const g = fly.geo;
    const e = t * t * (3 - 2 * t);
    const s = Math.pow(g.ts, e);
    const w = g.w0 * s, h = g.h0 * s;
    const cx = g.sx + (g.tx - g.sx) * e;
    const cy = g.sy + (g.ty - g.sy) * e + (1 - fly.intro) * 22;
    flyer.style.transform = 'translate3d(' + (cx - w / 2).toFixed(2) + 'px,' + (cy - h / 2).toFixed(2) + 'px,0) scale(' + s.toFixed(4) + ')';
    flyer.style.setProperty('--mix', (scrubOn ? smoothstep(e, 0.72, 0.97) : 1).toFixed(3));
    flyer.style.opacity = fly.intro.toFixed(3);
  }
  function flyApply() {
    if (!flyAllowed()) {
      fly.on = false; fly.landed = null;
      flyer.classList.remove('on'); navEl.classList.remove('flying');
      return;
    }
    fly.on = true; fly.landed = null;
    flyMeasure();
    flySet(flyNow());
  }
  function flyIntro() {
    if (!fly.on || fly.req >= 1) return;
    fly.intro = 0;
    const t0 = performance.now();
    const step = now => {
      const k = clamp((now - t0) / 1100, 0, 1);
      fly.intro = 1 - Math.pow(1 - k, 3);
      flySet(fly.req);
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  let flyRaf = null, flyResize = null;
  addEventListener('scroll', () => {
    if (!fly.on) return;
    if (scrubOn) { if (!heroOnScreen) flySet(heroProgress() / FLY_END); return; }
    if (flyRaf) return;
    flyRaf = requestAnimationFrame(() => { flyRaf = null; flySet(flyNow()); });
  }, { passive: true });
  addEventListener('resize', () => { cancelAnimationFrame(flyResize); flyResize = requestAnimationFrame(flyApply); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(flyApply);

  const GATES = [
    '(max-width: 720px)',
    '(orientation: portrait) and (max-width: 1024px)',
    '(orientation: portrait) and (pointer: coarse)',
    '(orientation: landscape) and (pointer: coarse) and (max-height: 560px)',
    '(prefers-reduced-motion: reduce)'
  ];
  let scrubOn = false;
  function enableScrub() {
    if (scrubOn) return; scrubOn = true;
    initHeroOnce();
    addEventListener('scroll', onScroll, { passive: true });
    bands.forEach(b => { b.op = -1; b.k = -1; b.on = null; });
    unpinFinalStates();
    updateCaptions(heroProgress());
    onScroll();
  }
  function disableScrub() {
    if (!scrubOn) return; scrubOn = false;
    removeEventListener('scroll', onScroll);
    if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; }
  }
  function applyHeroMode() {
    if (GATES.some(q => matchMedia(q).matches)) disableScrub(); else enableScrub();
    flyApply();
  }
  const MQLS = GATES.map(q => matchMedia(q));
  MQLS.forEach(m => m.addEventListener('change', applyHeroMode));

  /* ---------- reduced motion, live in both directions ---------- */
  function pinToFinalStates() {
    document.body.classList.add('pinned');
    $$('.reveal,.stagger,.timeline,.rays').forEach(el => el.classList.add('in'));
    setDialInstant(true);
    flyApply();
  }
  function unpinFinalStates() {
    document.body.classList.remove('pinned');
    setDialInstant(false);
  }
  reduceMQ.addEventListener('change', e => { if (e.matches) pinToFinalStates(); else applyHeroMode(); });

  /* ---------- entrances ---------- */
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target;
      el.classList.add('in');
      $$('.hz', el).forEach(h => h.classList.add('in'));
      if (el.classList.contains('stagger')) {
        const n = el.children.length;
        setTimeout(() => el.classList.add('done'), 900 + n * 110);
      }
      io.unobserve(el);
    });
  }, { threshold: 0.18, rootMargin: '0px 0px -6% 0px' });
  $$('.reveal,.stagger,.timeline,.rays').forEach(el => io.observe(el));

  /* ---------- nav ---------- */
  const nav = $('#nav');
  let navSolid = null;
  function navState() {
    const solid = scrollY > innerHeight * 0.6;
    if (solid !== navSolid) { navSolid = solid; nav.classList.toggle('solid', solid); }
  }
  addEventListener('scroll', navState, { passive: true });
  navState();

  /* ---------- pause loops off-screen and on hidden tabs ---------- */
  document.addEventListener('visibilitychange', () => document.body.classList.toggle('paused', document.hidden));

  /* ---------- live open status (America/New_York) ---------- */
  const DAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const fmtH = h => h === 12 ? 'noon' : (h > 12 ? (h - 12) + ' pm' : h + ' am');
  function nowNY() {
    const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false }).formatToParts(new Date());
    const get = t => parts.find(p => p.type === t).value;
    const wd = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'));
    return { wd, h: (+get('hour')) % 24, m: +get('minute') };
  }
  function status() {
    const { wd, h, m } = nowNY();
    const t = h + m / 60;
    const [o, c] = HOURS[wd];
    if (t >= o && t < c) return { open: true, text: 'Open now, closes at ' + fmtH(c), short: 'Open now until ' + fmtH(c), wd };
    if (t < o) return { open: false, text: 'Closed, opens today at ' + fmtH(o), short: 'Opens today at ' + fmtH(o), wd };
    const nd = (wd + 1) % 7;
    return { open: false, text: 'Closed, opens tomorrow at ' + fmtH(HOURS[nd][0]), short: 'Opens tomorrow at ' + fmtH(HOURS[nd][0]), wd };
  }
  const rowsHTML = wd => [
    [...hoursRows[0], wd >= 1 && wd <= 5],
    [...hoursRows[1], wd === 6],
    [...hoursRows[2], wd === 0]
  ];
  let lastStatus = '';
  function paintStatus() {
    const s = status();
    const key = s.text;
    if (key === lastStatus) return;
    lastStatus = key;
    const navLive = $('#navLive');
    navLive.textContent = s.short; navLive.classList.toggle('open', s.open);
    $$('[data-status]').forEach(el => { el.textContent = s.text; el.classList.toggle('open', s.open); });
    $$('[data-hours]').forEach(box => {
      box.textContent = '';
      rowsHTML(s.wd).forEach(([d, hrs, today]) => {
        const row = document.createElement('div');
        const a = document.createElement('span'); a.textContent = d;
        const b = document.createElement('span'); b.textContent = hrs;
        if (today) { row.className = 'today'; a.textContent = d + ' (today)'; }
        row.append(a, b); box.appendChild(row);
      });
    });
  }
  paintStatus();
  setInterval(() => { if (!document.hidden) paintStatus(); }, 60000);

  /* ---------- the level finder: set your sun ---------- */
  const LEVELS = levels.map(L => {
    const price = planById[L.plan].price;
    return { id: L.lv, lv: L.lv, name: L.name, badge: L.badge, specs: L.specs, best: L.best,
      price: money(price), per: 'a month, about ' + perDay(price, 'words') + ' a day', ang: L.ang, label: L.label };
  });
  const CX = 250, CY = 252, R = 190;
  const dial = $('#dial'), sun = $('#dialSun'), stopsBox = $('#stops'), result = $('#result');
  const skies = $$('.sky', dial);
  let current = 0, dialInstant = false;
  function setDialInstant(v) { dialInstant = v; }
  const pos = ang => { const a = ang * Math.PI / 180; return { x: CX + R * Math.cos(a), y: CY - R * Math.sin(a) }; };
  const ticks = $('#ticks'), NS = 'http://www.w3.org/2000/svg';
  LEVELS.forEach((L, i) => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'stop'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', 'false');
    b.setAttribute('aria-label', L.lv); b.tabIndex = -1; b.dataset.i = i;
    if (L.label.startsWith('Level')) { const lw = document.createElement('span'); lw.className = 'lw'; lw.textContent = 'Level '; b.append(lw, L.label.slice(6)); } else b.textContent = L.label;
    b.addEventListener('click', () => { setLevel(i, true); b.focus(); });
    stopsBox.appendChild(b);
    if (L.ang > 0) {
      const p = pos(L.ang), t = document.createElementNS(NS, 'circle');
      t.setAttribute('class', 'tick'); t.setAttribute('r', '3.2'); t.setAttribute('cx', p.x.toFixed(1)); t.setAttribute('cy', p.y.toFixed(1));
      ticks.appendChild(t);
    }
  });
  const stopBtns = $$('.stop', stopsBox);
  stopsBox.addEventListener('keydown', e => {
    const k = e.key;
    if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp', 'Home', 'End'].includes(k)) return;
    e.preventDefault();
    let n = current;
    if (k === 'ArrowRight' || k === 'ArrowDown') n = Math.min(LEVELS.length - 1, current + 1);
    if (k === 'ArrowLeft' || k === 'ArrowUp') n = Math.max(0, current - 1);
    if (k === 'Home') n = 0; if (k === 'End') n = LEVELS.length - 1;
    setLevel(n, true); stopBtns[n].focus();
  });
  function placeSun(ang) {
    const p = pos(ang);
    sun.style.transform = 'translate(' + p.x.toFixed(1) + 'px,' + p.y.toFixed(1) + 'px)';
  }
  function renderResult(i) {
    const L = LEVELS[i];
    result.textContent = '';
    const top = document.createElement('div'); top.className = 'top';
    const lv = document.createElement('span'); lv.className = 'lv'; lv.textContent = L.lv; top.appendChild(lv);
    if (L.badge) { const bd = document.createElement('span'); bd.className = 'badge'; bd.textContent = L.badge; top.appendChild(bd); }
    const h = document.createElement('h3'); h.textContent = L.name;
    const specs = document.createElement('div'); specs.className = 'specs';
    L.specs.forEach(s => { const sp = document.createElement('span'); sp.textContent = s; specs.appendChild(sp); });
    const best = document.createElement('p'); best.className = 'best'; best.textContent = L.best;
    const pr = document.createElement('p'); pr.className = 'price';
    const b = document.createElement('b'); b.textContent = L.price;
    const s = document.createElement('span'); s.textContent = L.per; pr.append(b, s);
    const a = document.createElement('a'); a.className = 'btn btn-gold'; a.href = '#join'; a.dataset.level = L.id; a.textContent = 'Claim this level';
    result.append(top, h, specs, best, pr, a);
  }
  let swapT = null;
  function setLevel(i, animate) {
    const changed = i !== current;
    current = i;
    placeSun(LEVELS[i].ang);
    skies.forEach((s, n) => s.classList.toggle('on', n === i));
    stopBtns.forEach((b, n) => { b.setAttribute('aria-checked', n === i ? 'true' : 'false'); b.tabIndex = n === i ? 0 : -1; });
    if (animate) dial.classList.add('used');
    if (!animate || dialInstant || reduceMQ.matches) { clearTimeout(swapT); result.classList.remove('swap'); renderResult(i); return; }
    if (!changed && result.childElementCount) return;
    result.classList.add('swap');
    clearTimeout(swapT);
    swapT = setTimeout(() => { renderResult(i); result.classList.remove('swap'); }, 260);
  }
  let dragging = false;
  function angleFromEvent(e) {
    const r = dial.getBoundingClientRect();
    const scale = Math.max(r.width / 500, r.height / 330);
    const ox = (r.width - 500 * scale) / 2, oy = (r.height - 330 * scale) / 2;
    const x = (e.clientX - r.left - ox) / scale, y = (e.clientY - r.top - oy) / scale;
    let ang = Math.atan2(CY - y, x - CX) * 180 / Math.PI;
    if (ang < -90) ang = -14;
    return clamp(ang, -14, 90);
  }
  function nearest(ang) {
    let best = 0, d = 1e9;
    LEVELS.forEach((L, n) => { const dd = Math.abs(L.ang - ang); if (dd < d) { d = dd; best = n; } });
    return best;
  }
  function nearSun(e) {
    const r = sun.getBoundingClientRect();
    const cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    return Math.hypot(e.clientX - cx, e.clientY - cy) < Math.max(44, r.width * 0.9);
  }
  dial.addEventListener('pointerdown', e => {
    if (e.target.closest('.stop')) return;
    if (e.pointerType !== 'mouse' && !nearSun(e)) return;
    dragging = true; dial.setPointerCapture(e.pointerId); sun.classList.add('drag');
    dial.style.touchAction = 'none';
    placeSun(angleFromEvent(e));
  });
  dial.addEventListener('pointermove', e => { if (dragging) placeSun(angleFromEvent(e)); });
  const endDrag = e => {
    if (!dragging) return;
    dragging = false; sun.classList.remove('drag');
    dial.style.touchAction = '';
    setLevel(nearest(angleFromEvent(e)), true);
  };
  dial.addEventListener('pointerup', endDrag);
  dial.addEventListener('pointercancel', endDrag);

  const answers = {};
  $$('.opts').forEach(group => {
    const q = group.dataset.q;
    const opts = $$('.opt', group);
    opts.forEach(o => o.addEventListener('click', () => {
      opts.forEach(x => x.setAttribute('aria-checked', x === o ? 'true' : 'false'));
      answers[q] = +o.dataset.v;
      recommend();
    }));
  });
  const pick = $('#pick');
  function recommend() {
    const done = ['burn', 'goal', 'when'].every(k => k in answers);
    if (!done) {
      const left = ['burn', 'goal', 'when'].filter(k => !(k in answers)).length;
      pick.textContent = left === 1 ? 'One more answer and the sun sets itself.' : 'Answer all three and the sun sets itself.';
      return;
    }
    const { burn, goal, when } = answers;
    let i, why;
    if (when === 2) { i = 4; why = burn === 0 ? 'You burn easy and need color this weekend, so skip UV entirely.' : 'For color by this weekend, spray is the sure thing. Want more? Ask for the cocktail.'; }
    else if (burn === 0) { i = 0; why = 'You burn easy, so start low and short and build from there.'; }
    else {
      i = Math.min(3, burn + (goal >= 1 ? 1 : 0) + (goal === 2 && burn === 2 ? 1 : 0));
      why = ['', 'A little stronger than outdoor sun, with more color on your face.', 'Fast bronzing that gets you there in 10 to 12 minutes.', 'The superbed. The deepest color in the least time.'][i];
    }
    pick.textContent = '';
    const b = document.createElement('b'); b.textContent = 'Our pick: ' + LEVELS[i].lv + '. ';
    pick.append(b, document.createTextNode(why));
    setLevel(i, true);
  }

  /* level picks carry into the form */
  const levelSel = $('#level');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[data-level]');
    if (a) levelSel.value = a.dataset.level;
  });

  /* ---------- sunburst rays around the join headline ---------- */
  (function drawRays() {
    const svg = $('#rays'), ns = 'http://www.w3.org/2000/svg';
    for (let n = 0; n < 9; n++) {
      const a = (-20 - n * 17.5) * Math.PI / 180;
      const r1 = 16, r2 = n % 2 ? 34 : 46;
      const p = document.createElementNS(ns, 'path');
      p.setAttribute('d', 'M' + (r1 * Math.cos(a)).toFixed(1) + ' ' + (r1 * Math.sin(a)).toFixed(1) + ' L' + (r2 * Math.cos(a)).toFixed(1) + ' ' + (r2 * Math.sin(a)).toFixed(1));
      p.setAttribute('pathLength', '1');
      p.style.setProperty('--r', n);
      svg.appendChild(p);
    }
  })();

  /* ---------- join form (concept preview: JS-only success state) ---------- */
  const join = $('#join');
  const joinBg = new IntersectionObserver(es => {
    if (es[0].isIntersecting) { join.style.backgroundImage = "url('" + ENDING_URL + "')"; joinBg.disconnect(); }
  }, { rootMargin: '600px 0px' });
  joinBg.observe(join);
  const form = $('#form'), err = $('#err');
  form.addEventListener('submit', e => {
    e.preventDefault();
    const name = $('#fname').value.trim();
    const phone = $('#phone').value.replace(/\D/g, '');
    if (!name) { err.textContent = 'Add your first name so we know who to look for.'; $('#fname').focus(); return; }
    if (phone.length < 10) { err.textContent = 'Add a 10-digit mobile number so we can confirm your visit.'; $('#phone').focus(); return; }
    err.textContent = '';
    const salon = $('#salon').value;
    $('#doneMsg').textContent = 'Thanks, ' + name + '. Stop by ' + salon + ' and mention the ' + money(special.price) + ' rate. We’ll help you pick your level when you get there.';
    form.classList.add('sent');
    $('#thanks').focus();
  });

  /* ---------- start ---------- */
  current = -1;
  setLevel(0, false);
  if (reduceMQ.matches) pinToFinalStates();
  applyHeroMode();
  flyIntro();
})();
