// Snippets evaluated inside the page. Each one is a self-contained expression.

export const injectCss = css => `(() => {
    const s = document.createElement('style');
    s.id = '__verify_freeze';
    s.textContent = ${JSON.stringify(css)};
    document.head.appendChild(s);
    return true;
})()`;

// Waits until the scroll engine, counters and staircase lines stop changing,
// then until every image in view has loaded and decoded and the fonts are ready.
export const settle = (maxMs = 6000) => `(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const frame = () => new Promise(r => requestAnimationFrame(() => r()));
    const watched = '#wheel, .wheel-card, .wheel-card img, .wheel-label, .sband, .stat-n, .moat-l, #scroll-progress, .reveal-group, .nav-links';
    const sig = () => {
        const parts = [scrollY, document.body.className];
        document.querySelectorAll(watched).forEach(e => parts.push(e.getAttribute('style') || '', e.className, e.matches('.stat-n') ? e.textContent : ''));
        return parts.join('|');
    };
    const t0 = performance.now();
    let last = sig(), stable = 0;
    while (performance.now() - t0 < ${maxMs}) {
        await frame(); await sleep(90);
        const s = sig();
        if (s === last) { if (++stable >= 4) break; } else { stable = 0; last = s; }
    }
    const inView = [...document.images].filter(i => {
        const r = i.getBoundingClientRect();
        return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
    });
    await Promise.race([
        Promise.all(inView.map(i => i.complete
            ? (i.decode ? i.decode().catch(() => {}) : null)
            : new Promise(r => { i.addEventListener('load', r, { once: true }); i.addEventListener('error', r, { once: true }); }))),
        sleep(8000),
    ]);
    await document.fonts.ready;
    await frame(); await frame();
    return Math.round(performance.now() - t0);
})()`;

// Scroll positions for every shot, computed from this site's own layout.
export const plan = (wheelPoints, sections) => `(() => {
    const max = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const nav = document.getElementById('navbar');
    const navH = nav ? nav.offsetHeight : 0;
    const clamp = y => Math.round(Math.min(max, Math.max(0, y)));
    const out = [{ name: 'top', y: 0 }];
    const wrap = document.querySelector('.scrub-wrap');
    const wrapVisible = wrap && wrap.offsetHeight > 0 && getComputedStyle(wrap).display !== 'none';
    for (const p of ${JSON.stringify(wheelPoints)}) {
        const name = 'wheel-' + Math.round(p * 100);
        if (!wrapVisible) { out.push({ name, y: null, missing: 'hero wheel not shown in this mode' }); continue; }
        const top = wrap.getBoundingClientRect().top + scrollY;
        out.push({ name, y: clamp(top + (wrap.offsetHeight - innerHeight) * p) });
    }
    for (const s of ${JSON.stringify(sections)}) {
        const el = document.querySelector(s.selector);
        if (!el || el.getClientRects().length === 0) { out.push({ name: s.name, y: null, missing: s.selector + ' not found or not displayed' }); continue; }
        out.push({ name: s.name, y: s.bottom ? max : clamp(el.getBoundingClientRect().top + scrollY - navH) });
    }
    return out;
})()`;

export const maskRects = selectors => `(() => {
    const rects = [];
    document.querySelectorAll(${JSON.stringify(selectors.join(','))}).forEach(el => {
        for (const r of el.getClientRects()) {
            const x0 = Math.max(0, Math.floor(r.left)), y0 = Math.max(0, Math.floor(r.top));
            const x1 = Math.min(innerWidth, Math.ceil(r.right)), y1 = Math.min(innerHeight, Math.ceil(r.bottom));
            if (x1 > x0 && y1 > y0) rects.push([x0, y0, x1 - x0, y1 - y0]);
        }
    });
    return rects;
})()`;

export const layout = selectors => `(() => {
    const out = { scrollHeight: document.documentElement.scrollHeight, items: {} };
    for (const s of ${JSON.stringify(selectors)}) {
        const el = document.querySelector(s);
        if (!el || el.getClientRects().length === 0) { out.items[s] = null; continue; }
        const r = el.getBoundingClientRect();
        out.items[s] = { top: Math.round(r.top + scrollY), height: Math.round(r.height) };
    }
    return out;
})()`;

// The wheel card(s) currently at the front, and what a click at their centre would hit.
export const frontCards = `(() => {
    return [...document.querySelectorAll('.wheel-card')].filter(c => {
        const cs = getComputedStyle(c);
        return cs.pointerEvents !== 'none' && +cs.opacity > 0.5 && c.getClientRects().length;
    }).map(c => {
        const r = c.getBoundingClientRect();
        const x = r.left + r.width / 2, y = r.top + r.height / 2;
        const hit = document.elementFromPoint(x, y);
        const a = hit && hit.closest('a');
        return { i: c.dataset.i, x: Math.round(x), y: Math.round(y), href: a ? a.getAttribute('href') : null, inCard: !!(hit && c.contains(hit)), anchorTarget: a && a.getAttribute('href')?.startsWith('#') ? !!document.querySelector(a.getAttribute('href')) : null };
    });
})()`;

// Head tags and visible text, captured right after load for a content comparison.
export const snapshot = `(() => {
    const meta = {};
    meta.title = document.title;
    document.querySelectorAll('meta[name], meta[property]').forEach(m => { meta['meta:' + (m.getAttribute('name') || m.getAttribute('property'))] = m.getAttribute('content'); });
    document.querySelectorAll('link[rel]').forEach(l => {
        const rel = l.getAttribute('rel');
        if (/^(canonical|icon|apple-touch-icon|manifest|alternate)$/.test(rel)) meta['link:' + rel + (l.sizes && l.sizes.value ? ':' + l.sizes.value : '') + (l.type ? ':' + l.type : '')] = l.getAttribute('href');
    });
    document.querySelectorAll('script[type="application/ld+json"]').forEach((s, i) => {
        try { meta['ld+json:' + i] = JSON.stringify(JSON.parse(s.textContent)); } catch { meta['ld+json:' + i] = 'INVALID JSON'; }
    });
    meta['html:lang'] = document.documentElement.lang;
    const text = document.body.innerText.split('\\n').map(s => s.replace(/\\s+/g, ' ').trim()).filter(Boolean);
    return { meta, text };
})()`;

// Element centre in viewport coordinates, after scrolling it into the middle of the screen.
export const centreOf = (selector, scroll = true) => `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return null;
    if (${scroll}) el.scrollIntoView({ block: 'center', behavior: 'instant' });
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return { hidden: true };
    const x = r.left + r.width / 2, y = r.top + r.height / 2;
    const hit = document.elementFromPoint(x, y);
    return { x: Math.round(x), y: Math.round(y), hitsTarget: !!(hit && (el === hit || el.contains(hit))), hit: hit ? hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + (hit.className && typeof hit.className === 'string' ? '.' + hit.className.trim().split(/\\s+/).join('.') : '') : null };
})()`;

// True when an element is rendered, on screen, and not transparent or hidden.
export const visibleFn = `function __visible(el) {
    if (!el) return false;
    const r = el.getBoundingClientRect();
    if (!r.width || !r.height) return false;
    if (r.right <= 0 || r.bottom <= 0 || r.left >= innerWidth || r.top >= innerHeight) return false;
    for (let e = el; e && e.nodeType === 1; e = e.parentElement) {
        const cs = getComputedStyle(e);
        if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity < 0.05) return false;
    }
    return true;
}`;
