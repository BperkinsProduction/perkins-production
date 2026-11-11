// Size switcher, quote builder, scheduling and the deposit checkout preview.
// Every price comes from src/data/prices.js, the same file the page is built from.
import { sizes, defaultSize, packages, otherServices, addons, depositRate, money } from '../data/prices.js';
import { shop } from '../data/shop.js';
import { findSize, onlyMake } from '../data/vehicles.js';

const SIZES = sizes.map((s) => s.name);
const state = { size: defaultSize, service: 'platinum', addons: {}, day: '', slot: '' };
const $ = (id) => document.getElementById(id);

// Package cards are built into the page; switching size only changes their prices.
function updatePackageCards() {
  document.querySelectorAll('[data-pkg]').forEach((card) => {
    const prices = card.dataset.prices.split(',');
    card.querySelector('[data-price]').textContent = prices[state.size];
    card.querySelector('[data-per]').textContent = SIZES[state.size] + ' vehicle';
  });
}

function setSize(i) {
  state.size = i;
  document.querySelectorAll('.size').forEach((b) => b.setAttribute('aria-pressed', String(+b.dataset.size === i)));
  const r = document.querySelector('input[name=qsize][value="' + i + '"]');
  if (r) r.checked = true;
  updatePackageCards();
  renderServices();
  update();
}
document.querySelectorAll('.size').forEach((b) => b.addEventListener('click', () => setSize(+b.dataset.size)));

// Type your car: the size is picked for them, every finder on the page agrees, and the
// car carries into the booking form so they do not type it twice.
const finders = [...document.querySelectorAll('[data-finder]')];
let carTyped = false;
function runFinder(text, from) {
  const hit = findSize(text);
  finders.forEach((f) => {
    if (f !== from) f.value = text;
    const out = f.parentElement.querySelector('.finder-out');
    out.classList.toggle('hit', !!hit);
    if (!text.trim()) out.textContent = '';
    else if (hit) out.innerHTML = 'That is ' + (/^[AEIOUX]/.test(SIZES[hit.size]) ? 'an' : 'a') + ' <b>' + SIZES[hit.size] + '</b>. Every price is set for ' + SIZES[hit.size] + '.';
    else if (text.trim().length < 3) out.textContent = '';
    else out.textContent = onlyMake(text) ? 'Add the model too, like Camry, Tahoe or F-150.' : 'Not on our list yet. Pick the closest size, and ' + shop.owner + ' confirms it when he sees it.';
  });
  if (hit && hit.size !== state.size) setSize(hit.size);
  if (!carTyped) $('fCar').value = text;
}
finders.forEach((f) => f.addEventListener('input', () => runFinder(f.value, f)));

$('qSizes').innerHTML = sizes.map((s, i) =>
  '<label class="choice"><input type="radio" name="qsize" value="' + i + '"' + (i === state.size ? ' checked' : '') + '><span><b>' + s.name + '</b><small>' + s.examples + '</small></span></label>'
).join('');
$('qSizes').addEventListener('change', (e) => setSize(+e.target.value));

function choice(id, name, sub) {
  return '<label class="choice"><input type="radio" name="qservice" value="' + id + '"' + (state.service === id ? ' checked' : '') + '><span><b>' + name + '</b><small>' + sub + '</small></span></label>';
}

function renderServices() {
  let html = '<div class="group-name">Detail packages</div><div class="choices">' +
    packages.map((p) => choice(p.id, p.name.replace('The ', ''), money(p.prices[state.size]))).join('') + '</div>';
  const groups = {};
  otherServices.forEach((o) => { (groups[o.group] = groups[o.group] || []).push(o); });
  Object.keys(groups).forEach((g) => {
    html += '<div class="group-name">' + g + '</div><div class="choices">' +
      groups[g].map((o) => choice(o.id, o.name, o.call ? o.sub + ', priced by ' + shop.owner : 'from ' + money(o.from))).join('') + '</div>';
  });
  $('qServices').innerHTML = html;
}
$('qServices').addEventListener('change', (e) => { state.service = e.target.value; renderAddons(); update(); });

function renderAddons() {
  $('qAddons').innerHTML = addons.map((a) => {
    const incl = a.included && a.included.includes(state.service);
    if (incl) delete state.addons[a.id];
    const on = !!state.addons[a.id];
    const pr = incl ? 'Included' : a.call ? 'Priced by ' + shop.owner : (a.from ? 'from ' : '') + money(a.price) + (a.unit ? ' ' + a.unit : '');
    let qty = '';
    if (a.qty && !incl) {
      qty = '<select data-qty="' + a.id + '" aria-label="How many">' + a.qty.map((q) =>
        '<option value="' + q + '"' + ((state.addons[a.id] || 1) === q ? ' selected' : '') + '>' + q + (a.qtyLabel ? ' ' + a.qtyLabel : '') + '</option>'
      ).join('') + '</select>';
    }
    return '<label class="addon' + (on ? ' on' : '') + (incl ? ' incl' : '') + '"><input type="checkbox" data-addon="' + a.id + '"' + (on ? ' checked' : '') + (incl ? ' disabled' : '') + '>' +
      '<span class="nm">' + a.name + '<small>' + pr + '</small></span>' + qty + '</label>';
  }).join('');
}
$('qAddons').addEventListener('change', (e) => {
  const t = e.target;
  if (t.dataset.addon) {
    if (t.checked) {
      const sel = document.querySelector('[data-qty="' + t.dataset.addon + '"]');
      state.addons[t.dataset.addon] = sel ? +sel.value : 1;
    } else delete state.addons[t.dataset.addon];
    t.closest('.addon').classList.toggle('on', t.checked);
  } else if (t.dataset.qty) {
    state.addons[t.dataset.qty] = +t.value;
    document.querySelector('[data-addon="' + t.dataset.qty + '"]').checked = true;
    t.closest('.addon').classList.add('on');
  }
  update();
});

function quote() {
  const lines = [];
  let total = 0, from = false, call = false, deposit = 0, svcName = '';
  const pkg = packages.find((p) => p.id === state.service);
  if (pkg) {
    svcName = pkg.name;
    total += pkg.prices[state.size];
    lines.push([pkg.name + ' (' + SIZES[state.size] + ')', money(pkg.prices[state.size])]);
  } else {
    const o = otherServices.find((x) => x.id === state.service);
    if (o) {
      svcName = o.name;
      if (o.call) { call = true; lines.push([o.name, shop.owner + ' prices it']); }
      else { total += o.from; from = true; lines.push([o.name, 'from ' + money(o.from)]); }
    }
  }
  addons.forEach((a) => {
    const q = state.addons[a.id];
    if (!q) return;
    if (a.call) { call = true; lines.push([a.name, shop.owner + ' prices it']); return; }
    const amt = a.price * q;
    total += amt;
    if (a.from) from = true;
    lines.push([a.name + (q > 1 || a.qty ? ' x' + q : ''), (a.from ? 'from ' : '') + money(amt)]);
  });
  // Half down on everything with a price. Jobs Chad prices by text are a request first.
  if (!call && total) deposit = Math.round(total * depositRate);
  return { lines, total, from, call, deposit, svcName };
}

const linesHTML = (q) => q.lines.length
  ? q.lines.map((l) => '<div class="row"><span>' + l[0] + '</span><span>' + l[1] + '</span></div>').join('')
  : '<p class="empty">Pick a service to see your price.</p>';
const totalLabel = (q) => q.call ? (q.total ? 'Plus ' + shop.owner + '\'s price' : 'Price') : q.from ? 'Estimated from' : 'Total';
const totalText = (q) => q.total ? money(q.total) : (q.call ? 'By text' : '$0');
function prettyPhone(p) {
  const d = p.replace(/\D/g, '').slice(-10);
  return d.length === 10 ? '(' + d.slice(0, 3) + ') ' + d.slice(3, 6) + '-' + d.slice(6) : p;
}

function update() {
  const q = quote();
  $('sumLines').innerHTML = linesHTML(q);
  $('sumLabel').textContent = totalLabel(q);
  $('sumTotal').textContent = totalText(q);
  const d = $('sumDeposit');
  if (q.deposit) {
    d.innerHTML = '<b style="color:var(--white)">' + money(q.deposit) + ' due today</b> holds your day (' + depositRate * 100 + '% down). ' + money(q.total - q.deposit) + (q.from ? ' or so' : '') + ' at pickup.';
    d.classList.add('show');
  } else if (q.call) {
    d.innerHTML = shop.owner + ' texts you a price first. Nothing to pay until you say yes.';
    d.classList.add('show');
  } else d.classList.remove('show');
  $('sendBtn').textContent = q.deposit ? 'Book and pay ' + money(q.deposit) : 'Send request';
  $('err').textContent = '';
  renderSlots();
}

function showBuilder() { $('result').classList.remove('show'); $('checkout').hidden = true; $('builder').style.display = ''; }

// Buttons elsewhere on the page that open the builder with a service picked.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-pick]');
  if (!a) return;
  state.service = a.dataset.pick;
  renderServices(); renderAddons(); update(); showBuilder();
});

// Scheduling: the next two weeks, closed days greyed out, drop-off times per day.
// In the demo some times show as booked so the calendar looks like a real week.
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const parseDay = (v) => { const p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };
const days = [];
for (let i = 1; i <= shop.schedule.daysAhead; i++) { const d = new Date(); d.setHours(12, 0, 0, 0); d.setDate(d.getDate() + i); days.push(d); }
const demoBooked = (day, slot) => { let h = 7; for (const ch of day + slot) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h % 4 === 0; };

function renderDays() {
  $('qDays').innerHTML = days.map((d) => {
    const v = iso(d), closed = shop.closedDays.includes(d.getDay());
    return '<button type="button" role="radio" class="day" data-day="' + v + '" aria-checked="' + (state.day === v) + '"' + (closed ? ' disabled' : '') + '>' +
      '<small>' + d.toLocaleDateString('en-US', { weekday: 'short' }) + '</small><b>' + d.getDate() + '</b><small>' + (closed ? 'Closed' : d.toLocaleDateString('en-US', { month: 'short' })) + '</small></button>';
  }).join('');
}
function slotsFor(day) {
  const full = shop.schedule.fullDay.includes(state.service);
  return (full ? shop.schedule.slots.slice(0, 1) : shop.schedule.slots).map((t) => ({ t, booked: demoBooked(day, t) }));
}
function renderSlots() {
  if (!state.day) { $('qSlots').innerHTML = ''; $('slotNote').textContent = 'Pick a day to see open drop off times.'; return; }
  const list = slotsFor(state.day);
  if (state.slot && !list.some((s) => s.t === state.slot && !s.booked)) state.slot = '';
  $('qSlots').innerHTML = list.map((s) => '<button type="button" role="radio" class="slot" data-slot="' + s.t + '" aria-checked="' + (state.slot === s.t) + '"' + (s.booked ? ' disabled' : '') + '>' + s.t + (s.booked ? '<small>Booked</small>' : '') + '</button>').join('');
  const full = shop.schedule.fullDay.includes(state.service);
  $('slotNote').textContent = list.every((s) => s.booked) ? 'That day is full. Try another day.' : full ? 'This one takes the whole day, so drop off is first thing in the morning.' : 'Drop off at your time. ' + shop.owner + ' texts you when it is ready.';
}
$('qDays').addEventListener('click', (e) => {
  const b = e.target.closest('.day'); if (!b || b.disabled) return;
  state.day = b.dataset.day; state.slot = '';
  $('qDays').querySelectorAll('.day').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  renderSlots(); $('err').textContent = '';
});
$('qSlots').addEventListener('click', (e) => {
  const b = e.target.closest('.slot'); if (!b || b.disabled) return;
  state.slot = b.dataset.slot;
  $('qSlots').querySelectorAll('.slot').forEach((x) => x.setAttribute('aria-checked', String(x === b)));
  $('err').textContent = '';
});

$('fCar').addEventListener('input', () => { carTyped = true; });

// Photos with the booking. In the demo they stay on this device; on the real site they go
// to Chad with the booking.
const MAX_SHOTS = 4;
let shots = [];
function renderShots() {
  const add = $('shots').querySelector('.shot-add');
  $('shots').querySelectorAll('.shot').forEach((el) => el.remove());
  shots.forEach((sh, i) => {
    const el = document.createElement('div');
    el.className = 'shot';
    el.innerHTML = '<img alt="Your photo ' + (i + 1) + '"><button type="button" aria-label="Remove photo ' + (i + 1) + '">&times;</button>';
    el.querySelector('img').src = sh.url;
    el.querySelector('button').addEventListener('click', () => { URL.revokeObjectURL(sh.url); shots.splice(i, 1); renderShots(); });
    $('shots').insertBefore(el, add);
  });
  add.hidden = shots.length >= MAX_SHOTS;
}
$('fPhotos').addEventListener('change', (e) => {
  [...e.target.files].filter((f) => f.type.startsWith('image/')).slice(0, MAX_SHOTS - shots.length)
    .forEach((f) => shots.push({ url: URL.createObjectURL(f) }));
  e.target.value = '';
  renderShots();
});

let pending = null;
$('builder').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = quote();
  const name = $('fName').value.trim(), phone = $('fPhone').value.trim(), car = $('fCar').value.trim();
  let err = '';
  if (!state.day) err = 'Pick a day.';
  else if (!state.slot) err = 'Pick a drop off time.';
  else if (!car) err = 'Add the year, make and model.';
  else if (!name) err = 'Add your name.';
  else if (phone.replace(/\D/g, '').length < 10) err = 'Add a mobile number so ' + shop.owner + ' can text you.';
  if (err) { $('err').textContent = err; return; }
  pending = { q, name, phone, car, notes: $('fNotes').value.trim() };
  if (q.deposit) {
    const when = parseDay(state.day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    $('coHead').textContent = q.svcName + ', ' + when + ' at ' + state.slot;
    $('coLines').innerHTML = linesHTML(q);
    $('coNow').textContent = money(q.deposit);
    $('coLater').textContent = money(q.total - q.deposit);
    $('coLaterLabel').textContent = q.from ? 'Due at pickup, about' : 'Due at pickup';
    $('payBtn').textContent = 'Pay ' + money(q.deposit) + ' deposit';
    $('builder').style.display = 'none';
    $('checkout').hidden = false;
    $('quote').scrollIntoView({ behavior: 'smooth' });
  } else finish(false);
});
$('coBack').addEventListener('click', () => { $('checkout').hidden = true; $('builder').style.display = ''; });
$('payBtn').addEventListener('click', () => finish(true));

// The texts the customer gets without Chad typing any of them.
function renderTexts(paid, q, first, day) {
  const dayName = parseDay(state.day).toLocaleDateString('en-US', { weekday: 'long' });
  const left = money(q.total - q.deposit) + (q.from ? ' or so' : '');
  const items = paid ? [
    ['Right away', 'Twelve West Detail: You are booked, ' + first + '. ' + day + ', drop off ' + state.slot + '. ' + money(q.deposit) + ' deposit received. 12 W Frederick St, Unit B, Walkersville.'],
    ['Day before, 5 PM', 'Reminder: ' + q.svcName + ' tomorrow, drop off ' + state.slot + '. Need to move it? Tap to pick a new time.'],
    ['When it is done', 'Your car is ready, ' + first + '! ' + left + ' left to pay. Pay here or at pickup.'],
    ['8 weeks later', 'Hey ' + first + ', it has been about 8 weeks. Time to keep that shine up? Book your next one in a tap.'],
  ] : [
    ['Right away', 'Twelve West Detail: Got your request, ' + first + '. ' + shop.owner + ' will text your price for ' + day + ' shortly.'],
    ['After ' + shop.owner + ' prices it', 'Your price is ready. Tap to see it and hold ' + day + ' with ' + depositRate * 100 + '% down.'],
    ['Day before, 5 PM', 'Reminder: you are booked for tomorrow, drop off ' + state.slot + '. Need to move it? Tap to pick a new time.'],
    ['8 weeks later', 'Hey ' + first + ', it has been about 8 weeks. Time to keep that shine up? Book your next one in a tap.'],
  ];
  $('rTexts').innerHTML = '';
  items.forEach(([when, text]) => {
    const li = document.createElement('li');
    li.innerHTML = '<span class="when"></span><div class="bubble"></div>';
    li.querySelector('.when').textContent = when;
    li.querySelector('.bubble').textContent = text;
    $('rTexts').appendChild(li);
  });
}

function finish(paid) {
  const { q, name, phone, car, notes } = pending;
  const day = parseDay(state.day).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const first = name.split(' ')[0];
  $('rHead').textContent = paid ? 'You are booked, ' + first + '. ' + day + ' at ' + state.slot + '.' : 'Thanks ' + first + '. ' + shop.owner + ' will text you a price for ' + day + '.';
  $('rLines').innerHTML = linesHTML(q);
  $('rLabel').textContent = totalLabel(q);
  $('rTotal').textContent = totalText(q);
  $('rNext').textContent = paid ? money(q.deposit) + ' deposit paid (preview, nothing was charged). ' + money(q.total - q.deposit) + (q.from ? ' or so' : '') + ' is due at pickup.' : 'Nothing to pay yet. Once ' + shop.owner + ' prices it, you can pay the deposit from his text.';
  const extras = q.lines.slice(1).map((l) => l[0]).join(', ');
  $('rText').textContent = (paid ? 'BOOKED and ' + money(q.deposit) + ' deposit paid (preview)\n' : 'Price request\n') +
    name + ', ' + prettyPhone(phone) + '\n' + car + ' (' + SIZES[state.size] + ')\n' + q.svcName + (extras ? '\n+ ' + extras : '') +
    '\n' + (q.call ? 'Needs your price' + (q.total ? ', add ons ' + money(q.total) : '') : totalLabel(q) + ': ' + money(q.total) + ', ' + money(q.total - q.deposit) + ' at pickup') +
    '\n' + day + ', drop off ' + state.slot + (notes ? '\nNote: "' + notes + '"' : '') +
    (shots.length ? '\n' + shots.length + (shots.length > 1 ? ' photos' : ' photo') + ' attached' : '');
  if (shots.length) {
    const pics = document.createElement('div');
    pics.className = 'pics';
    shots.forEach((sh) => { const im = document.createElement('img'); im.src = sh.url; im.alt = ''; pics.appendChild(im); });
    $('rText').appendChild(pics);
  }
  renderTexts(paid, q, first, day);
  $('rReply').textContent = paid ? 'Thanks ' + first + '! See you ' + parseDay(state.day).toLocaleDateString('en-US', { weekday: 'long' }) + ' at ' + state.slot + '.' : 'Hey ' + first + ', I can do that for you. Sending your price now.';
  $('builder').style.display = 'none';
  $('checkout').hidden = true;
  $('result').classList.add('show');
  $('quote').scrollIntoView({ behavior: 'smooth' });
}
$('againBtn').addEventListener('click', () => { showBuilder(); $('quote').scrollIntoView({ behavior: 'smooth' }); });

renderDays(); renderServices(); renderAddons(); update();
