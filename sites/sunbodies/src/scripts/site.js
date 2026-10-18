import { levels, planById, money, perDay, HOURS, hoursRows, special } from '../data/salon';

(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const reduceMQ = matchMedia('(prefers-reduced-motion: reduce)');

  /* ---------- reduced motion, live in both directions ---------- */
  function pinToFinalStates() {
    document.body.classList.add('pinned');
    $$('.reveal,.stagger,.timeline,.rays').forEach(el => el.classList.add('in'));
    setDialInstant(true);
  }
  function unpinFinalStates() {
    document.body.classList.remove('pinned');
    setDialInstant(false);
  }
  reduceMQ.addEventListener('change', e => { if (e.matches) pinToFinalStates(); else unpinFinalStates(); });

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

  /* ---------- nav: the small logo shows once the big hero logo is gone ---------- */
  const nav = $('#nav'), heroLogo = $('#heroLogo');
  if (heroLogo) {
    new IntersectionObserver(es => nav.classList.toggle('logo-in', !es[0].isIntersecting), { rootMargin: '-72px 0px 0px 0px' }).observe(heroLogo);
  } else {
    nav.classList.add('logo-in');
  }

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
  let dragAng = null;
  // Safari decides at touchstart whether a touch scrolls the page, so a touch that
  // lands on the sun has to cancel scrolling right there or the drag never starts.
  dial.addEventListener('touchstart', e => {
    if (e.touches.length === 1 && !e.target.closest('.stop') && nearSun(e.touches[0])) e.preventDefault();
  }, { passive: false });
  dial.addEventListener('touchmove', e => { if (dragging) e.preventDefault(); }, { passive: false });
  dial.addEventListener('pointerdown', e => {
    if (e.target.closest('.stop')) return;
    if (e.pointerType !== 'mouse' && !nearSun(e)) return;
    dragging = true; dial.setPointerCapture(e.pointerId); sun.classList.add('drag');
    dragAng = angleFromEvent(e);
    placeSun(dragAng);
  });
  dial.addEventListener('pointermove', e => { if (dragging) { dragAng = angleFromEvent(e); placeSun(dragAng); } });
  const endDrag = e => {
    if (!dragging) return;
    dragging = false; sun.classList.remove('drag');
    // A cancelled pointer reports no usable position, so settle where the sun last was.
    if (e.type !== 'pointercancel') dragAng = angleFromEvent(e);
    setLevel(nearest(dragAng), true);
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
})();
