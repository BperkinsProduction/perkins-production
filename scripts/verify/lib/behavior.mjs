// Interaction checks run inside one page load, after the visual pass.
// Each returns { id, label, status: 'pass' | 'fail' | 'skip', detail, data }.
// `data` is compared against the reference run, so keep it stable and small.
// Never submits the contact form and never visits /admin.
import { sleep } from './cdp.mjs';
import { centreOf, settle, visibleFn } from './pagejs.mjs';

const result = (id, label, status, detail, data) => ({ id, label, status, detail, data });

async function toTop(page) {
    await page.eval(`window.scrollTo({ top: 0, behavior: 'instant' })`);
    await page.eval(settle(3000));
}

async function navLinks(page, vp) {
    const id = 'nav-links', label = 'Nav links visible (desktop) / tucked away (phone)';
    await toTop(page);
    const r = await page.eval(`(() => { ${visibleFn}
        const links = [...document.querySelectorAll('.nav-links a')];
        return { total: links.length, visible: links.filter(__visible).length, hrefs: links.map(a => a.getAttribute('href')) };
    })()`);
    if (!r.total) return result(id, label, 'fail', 'no .nav-links a found');
    if (vp.mobile) {
        return r.visible === 0
            ? result(id, label, 'pass', `${r.total} links hidden behind the menu button`, r.hrefs)
            : result(id, label, 'fail', `${r.visible} of ${r.total} links already showing before the menu is opened`, r.hrefs);
    }
    return r.visible === r.total
        ? result(id, label, 'pass', `${r.total} links visible`, r.hrefs)
        : result(id, label, 'fail', `only ${r.visible} of ${r.total} links visible`, r.hrefs);
}

async function navDropdown(page, vp) {
    const id = 'nav-dropdown', label = 'Desktop nav dropdown opens';
    if (vp.mobile) return result(id, label, 'skip', 'desktop only');
    const has = await page.eval(`!!document.querySelector('.nav-dropdown-toggle')`);
    if (!has) return result(id, label, 'skip', 'the nav has no dropdown in its markup', 'absent');
    const c = await page.eval(centreOf('.nav-dropdown-toggle', false));
    if (!c || c.hidden) return result(id, label, 'fail', 'dropdown toggle is not visible', 'present');
    await page.click(c.x, c.y);
    await page.eval(settle(1500));
    const r = await page.eval(`(() => { ${visibleFn}
        const dd = document.querySelector('.nav-dropdown');
        const items = [...document.querySelectorAll('.nav-submenu a')];
        return { open: !!(dd && dd.classList.contains('open')), visible: items.filter(__visible).length, total: items.length };
    })()`);
    await page.click(5, Math.round(vp.height / 2)); // click away to close it again
    return r.open && r.visible > 0
        ? result(id, label, 'pass', `opened, ${r.visible} submenu links visible`, 'present')
        : result(id, label, 'fail', `open=${r.open}, ${r.visible}/${r.total} submenu links visible`, 'present');
}

async function hamburger(page, vp) {
    const id = 'hamburger', label = 'Phone hamburger opens the menu';
    if (!vp.mobile) return result(id, label, 'skip', 'phone only');
    await toTop(page);
    const c = await page.eval(centreOf('#hamburger', false));
    if (!c) return result(id, label, 'fail', '#hamburger not found');
    if (c.hidden) return result(id, label, 'fail', 'hamburger button is not displayed');
    if (!c.hitsTarget) return result(id, label, 'fail', `something covers the button (${c.hit})`);
    await page.click(c.x, c.y);
    await page.eval(settle(1500));
    const open = await page.eval(`(() => { ${visibleFn}
        const links = [...document.querySelectorAll('.nav-links a')];
        return { cls: document.getElementById('nav-links').classList.contains('open'),
                 aria: document.getElementById('hamburger').getAttribute('aria-expanded'),
                 visible: links.filter(__visible).length, total: links.length };
    })()`);
    // Close it again so later checks see the normal page
    const c2 = await page.eval(centreOf('#hamburger', false));
    if (c2 && !c2.hidden) await page.click(c2.x, c2.y);
    await page.eval(settle(1500));
    const closed = await page.eval(`!document.getElementById('nav-links').classList.contains('open')`);
    const ok = open.cls && open.aria === 'true' && open.visible === open.total && closed;
    return result(id, label, ok ? 'pass' : 'fail',
        `opened=${open.cls}, aria-expanded=${open.aria}, ${open.visible}/${open.total} links visible, closes again=${closed}`, ok ? 'works' : 'broken');
}

async function pricingTabs(page) {
    const id = 'pricing-tabs', label = 'Pricing tabs switch the visible panel';
    const tabs = await page.eval(`[...document.querySelectorAll('.pricing-tab')].map(t => ({ group: t.dataset.group, text: t.textContent.trim() }))`);
    if (!tabs.length) return result(id, label, 'fail', 'no .pricing-tab buttons found');
    const seen = {};
    const problems = [];
    for (const t of tabs) {
        const sel = `.pricing-tab[data-group="${t.group}"]`;
        const c = await page.eval(centreOf(sel));
        if (!c || c.hidden) { problems.push(`${t.text}: not visible`); continue; }
        await page.eval(settle(2000));
        const c2 = await page.eval(centreOf(sel, false));
        if (!c2.hitsTarget) { problems.push(`${t.text}: covered by ${c2.hit}`); continue; }
        await page.click(c2.x, c2.y);
        await page.eval(settle(2000));
        const s = await page.eval(`(() => {
            const active = [...document.querySelectorAll('.pricing-tab')].filter(x => x.classList.contains('active'));
            const cards = [...document.querySelectorAll('.pricing-card')].filter(x => !x.hidden && x.getClientRects().length);
            return { active: active.map(x => x.dataset.group), selected: document.querySelector(${JSON.stringify(sel)}).getAttribute('aria-selected'),
                     cards: cards.map(x => ((x.querySelector('h3') || {}).textContent || '').trim() + ' ' + ((x.querySelector('.price') || {}).textContent || '').trim()) };
        })()`);
        if (s.active.length !== 1 || s.active[0] !== t.group || s.selected !== 'true') problems.push(`${t.text}: tab did not become the active one`);
        if (!s.cards.length) problems.push(`${t.text}: no pricing cards visible`);
        seen[t.text] = s.cards;
    }
    const distinct = new Set(Object.values(seen).map(v => v.join('|'))).size;
    if (tabs.length > 1 && distinct < 2) problems.push('every tab shows the same cards');
    const summary = Object.entries(seen).map(([k, v]) => `${k}: ${v.length} cards`).join(', ');
    return result(id, label, problems.length ? 'fail' : 'pass', problems.length ? problems.join('; ') : summary, seen);
}

async function reveal(page) {
    const id = 'reveal', label = 'Reveal button unfolds the photo/video/3D group';
    const before = await page.eval(`(() => { const g = document.getElementById('photo-video-group'); return g ? { hidden: g.hidden, h: g.offsetHeight } : null; })()`);
    if (!before) return result(id, label, 'fail', '#photo-video-group not found');
    if (!before.hidden) return result(id, label, 'fail', 'group is already open before clicking');
    const c = await page.eval(centreOf('#reveal-photo'));
    if (!c || c.hidden) return result(id, label, 'fail', '#reveal-photo button not visible');
    await page.eval(settle(2000));
    const c2 = await page.eval(centreOf('#reveal-photo', false));
    if (!c2.hitsTarget) return result(id, label, 'fail', `button covered by ${c2.hit}`);
    await page.click(c2.x, c2.y);
    await sleep(900); // the button scrolls to the group over ~0.7s
    await page.eval(settle(3000));
    const after = await page.eval(`(() => {
        const g = document.getElementById('photo-video-group');
        const ids = [...g.querySelectorAll('section[id]')].filter(s => s.offsetHeight > 0).map(s => s.id);
        return { hidden: g.hidden, h: g.offsetHeight, aria: document.getElementById('reveal-photo').getAttribute('aria-expanded'), ids };
    })()`);
    const ok = !after.hidden && after.h > 200 && after.aria === 'true' && after.ids.length > 0;
    return result(id, label, ok ? 'pass' : 'fail',
        `opened=${!after.hidden}, height ${after.h}px, aria-expanded=${after.aria}, sections: ${after.ids.join(', ') || 'none'}`, after.ids);
}

function wheelLinks(fronts, vp) {
    const id = 'wheel-links', label = 'Front wheel card is a link with a real href';
    if (fronts === null) return result(id, label, 'skip', 'hero wheel not shown in this mode (classic hero instead)', 'n/a');
    if (!fronts.length) return result(id, label, 'fail', 'no wheel card was ever at the front');
    const bad = fronts.filter(f => !f.inCard || !f.href || f.href === '#' || /^javascript:/i.test(f.href) || f.anchorTarget === false
        || (!f.href.startsWith('#') && !/^https?:\/\/[^/]+\.[a-z]{2,}/i.test(f.href) && !f.href.startsWith('/')));
    const hrefs = [...new Set(fronts.map(f => `card ${f.i}: ${f.href}`))].sort();
    if (bad.length) return result(id, label, 'fail', `bad links: ${bad.map(f => `card ${f.i} -> ${f.href ?? 'nothing clickable'}`).join(', ')}`, hrefs);
    return result(id, label, 'pass', hrefs.join(', '), hrefs);
}

async function contactForm(page) {
    const id = 'contact-form', label = 'Contact form exists with its fields (not submitted)';
    const r = await page.eval(`(() => {
        const f = document.querySelector('#contact form');
        if (!f) return null;
        const fields = [...f.elements].map(e => [e.tagName.toLowerCase(), e.type, e.name, e.required ? 'required' : ''].filter(Boolean).join(':'));
        return { fields, submit: !!f.querySelector('button[type="submit"], input[type="submit"]'), handler: !!(f.getAttribute('onsubmit') || f.getAttribute('action')) };
    })()`);
    if (!r) return result(id, label, 'fail', 'no form inside #contact');
    const need = ['name', 'email', 'message'];
    const missing = need.filter(n => !r.fields.some(f => f.split(':')[2] === n));
    const ok = !missing.length && r.submit && r.handler;
    return result(id, label, ok ? 'pass' : 'fail',
        ok ? `fields: ${r.fields.filter(f => !f.startsWith('button')).map(f => f.split(':')[2]).join(', ')}` : `missing: ${[...missing, !r.submit && 'submit button', !r.handler && 'submit handler'].filter(Boolean).join(', ')}`, r.fields);
}

async function stats(page) {
    const id = 'stats', label = 'Stat strip ends on the real numbers';
    const r = await page.eval(`[...document.querySelectorAll('.stat-n[data-count]')].map(n => [n.getAttribute('data-count'), n.textContent.trim()])`);
    if (!r.length) return result(id, label, 'fail', 'no .stat-n[data-count] found');
    const bad = r.filter(([want, got]) => want !== got);
    return result(id, label, bad.length ? 'fail' : 'pass', bad.length ? `wrong: ${bad.map(([w, g]) => `${g} (want ${w})`).join(', ')}` : r.map(x => x[1]).join(' / '), r.map(x => x[0]));
}

async function staircase(page) {
    const id = 'staircase', label = 'Staircase lines have slid into place';
    const r = await page.eval(`[...document.querySelectorAll('.moat-l')].map(l => {
        const s = l.querySelector('span') || l;
        const t = getComputedStyle(s).transform;
        return { text: l.textContent.trim(), placed: t === 'none' || t === 'matrix(1, 0, 0, 1, 0, 0)', t };
    })`);
    if (!r.length) return result(id, label, 'fail', 'no .moat-l lines found');
    const bad = r.filter(x => !x.placed);
    return result(id, label, bad.length ? 'fail' : 'pass', bad.length ? `still hidden: ${bad.map(b => `"${b.text}" (${b.t})`).join(', ')}` : r.map(x => x.text).join(' / '), r.map(x => x.text));
}

async function heroMode(page, vp) {
    const id = 'hero-mode', label = vp.reduced ? 'Reduced motion shows the classic hero' : 'Wheel hero is active';
    const r = await page.eval(`(() => {
        const w = document.querySelector('.scrub-wrap'), c = document.querySelector('.classic-hero');
        const shown = e => !!(e && e.getClientRects().length && getComputedStyle(e).display !== 'none');
        return { scrub: document.body.classList.contains('scrub-mode'), wheel: shown(w), classic: shown(c) };
    })()`);
    const mode = r.wheel && !r.classic ? 'wheel' : r.classic && !r.wheel ? 'classic' : `wheel=${r.wheel}, classic=${r.classic}`;
    const want = vp.reduced ? 'classic' : 'wheel';
    return result(id, label, mode === want ? 'pass' : 'fail', `showing: ${mode}`, mode);
}

export async function runBehavior(page, vp, fronts) {
    const out = [];
    const run = async (id, fn) => {
        try { out.push(await fn()); }
        catch (e) { out.push(result(id, id, 'fail', `check crashed: ${e.message}`)); }
    };
    await run('hero-mode', () => heroMode(page, vp));
    await run('nav-links', () => navLinks(page, vp));
    await run('nav-dropdown', () => navDropdown(page, vp));
    await run('hamburger', () => hamburger(page, vp));
    out.push(wheelLinks(fronts, vp));
    await run('stats', () => stats(page));
    await run('staircase', () => staircase(page));
    await run('pricing-tabs', () => pricingTabs(page));
    await run('contact-form', () => contactForm(page));
    await run('reveal', () => reveal(page)); // last: it opens the group for the revealed-section shots
    return out;
}
