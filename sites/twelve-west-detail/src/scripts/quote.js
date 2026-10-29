// Size switcher, quote builder and booking request preview.
// Every price comes from src/data/prices.js, the same file the page is built from.
import { sizes, defaultSize, packages, otherServices, addons, depositRate, money } from '../data/prices.js';
import { shop } from '../data/shop.js';

const SIZES = sizes.map((s) => s.name);
const state = { size: defaultSize, service: 'platinum', addons: {} };
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
      else { total += o.from; from = true; lines.push([o.name, 'from ' + money(o.from)]); if (o.deposit) deposit = 1; }
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
  if (deposit) deposit = Math.round(total * depositRate);
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
    d.innerHTML = '<b style="color:var(--white)">' + money(q.deposit) + ' deposit today</b> holds your day (' + depositRate * 100 + '%, non refundable). The rest is due at pickup.';
    d.classList.add('show');
  } else d.classList.remove('show');
  $('sendBtn').textContent = q.deposit ? 'Request and pay deposit' : 'Request this appointment';
  $('err').textContent = '';
}

function showBuilder() { $('result').classList.remove('show'); $('builder').style.display = ''; }

// Buttons elsewhere on the page that open the builder with a service picked.
document.addEventListener('click', (e) => {
  const a = e.target.closest('[data-pick]');
  if (!a) return;
  state.service = a.dataset.pick;
  renderServices(); renderAddons(); update(); showBuilder();
});

// Bookings start tomorrow and skip the days the shop is closed.
const iso = (d) => d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
$('fDate').min = iso(tomorrow);
const parseDay = (v) => { const p = v.split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); };

$('builder').addEventListener('submit', (e) => {
  e.preventDefault();
  const q = quote();
  const name = $('fName').value.trim(), phone = $('fPhone').value.trim(), car = $('fCar').value.trim(), dv = $('fDate').value;
  let err = '';
  if (!dv) err = 'Pick a preferred day.';
  else if (shop.closedDays.includes(parseDay(dv).getDay())) err = 'The shop is closed that day. Pick Monday through Saturday.';
  else if (dv < $('fDate').min) err = 'Pick a day from tomorrow on.';
  else if (!car) err = 'Add the year, make and model.';
  else if (!name) err = 'Add your name.';
  else if (phone.replace(/\D/g, '').length < 10) err = 'Add a mobile number so ' + shop.owner + ' can text you.';
  if (err) { $('err').textContent = err; return; }

  const day = parseDay(dv).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const first = name.split(' ')[0];
  const notes = $('fNotes').value.trim();
  $('rHead').textContent = 'Thanks ' + first + '. ' + shop.owner + ' will text you to confirm ' + day + '.';
  $('rLines').innerHTML = linesHTML(q);
  $('rLabel').textContent = totalLabel(q);
  $('rTotal').textContent = totalText(q);
  $('rNext').textContent = q.deposit ? 'On the real site you would pay the ' + money(q.deposit) + ' deposit by card right here, and your day is held.' : 'Nothing to pay now. You pay at pickup.';
  const extras = q.lines.slice(1).map((l) => l[0]).join(', ');
  $('rText').textContent = name + ', ' + prettyPhone(phone) + '\n' + car + ' (' + SIZES[state.size] + ')\n' + q.svcName + (extras ? '\n+ ' + extras : '') +
    '\n' + (q.call ? 'Needs your price' + (q.total ? ', add ons ' + money(q.total) : '') : totalLabel(q) + ': ' + money(q.total)) +
    (q.deposit ? '\nDeposit: ' + money(q.deposit) + ' (preview, not charged)' : '') +
    '\nWants ' + day + ', ' + $('fTime').value.toLowerCase() + (notes ? '\nNote: "' + notes + '"' : '');
  $('rReply').textContent = 'Got it ' + first + '! ' + parseDay(dv).toLocaleDateString('en-US', { weekday: 'long' }) + ' works. See you then.';
  $('builder').style.display = 'none';
  $('result').classList.add('show');
  $('quote').scrollIntoView({ behavior: 'smooth' });
});
$('againBtn').addEventListener('click', () => { showBuilder(); $('quote').scrollIntoView({ behavior: 'smooth' }); });

renderServices(); renderAddons(); update();
