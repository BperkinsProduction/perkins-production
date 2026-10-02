// Link and asset check: every same-origin URL the homepage references must load
// from the candidate, plus a list of important paths and the vercel.json routes.
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { IMPORTANT_PATHS, REDIRECT_SAMPLES, VERCEL_ONLY, PRODUCTION_HOST } from '../config.mjs';

const SKIP_SCHEME = /^(data:|mailto:|tel:|javascript:|blob:|about:)/i;

export const isLocalUrl = url => ['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname);

// vercel.json source patterns ("/:site([Ss]ports)/:page*") as regular expressions.
function sourceRegex(src) {
    let re = '', i = 0;
    while (i < src.length) {
        const m = /^:(\w+)(\(([^()]|\([^()]*\))*\))?([*+?])?/.exec(src.slice(i));
        if (m) {
            const group = m[2] ? m[2].slice(1, -1) : (m[4] === '*' || m[4] === '+' ? '.*' : '[^/]+');
            re += `(${group})${m[4] === '?' ? '?' : ''}`;
            i += m[0].length;
        } else {
            re += src[i].replace(/[.+?^${}()|[\]\\]/g, '\\$&');
            i++;
        }
    }
    return new RegExp(`^${re}$`);
}

export function loadVercelRoutes(repoRoot) {
    const file = join(repoRoot, 'vercel.json');
    if (!existsSync(file)) return { rewrites: [], redirects: [] };
    const cfg = JSON.parse(readFileSync(file, 'utf8'));
    const map = (list = []) => list.map(r => ({ source: r.source, destination: r.destination, re: sourceRegex(r.source) }));
    return { rewrites: map(cfg.rewrites), redirects: map(cfg.redirects) };
}

function routeFor(path, routes) {
    for (const r of routes.redirects) if (r.re.test(path)) return { kind: 'redirect', ...r };
    for (const r of routes.rewrites) if (r.re.test(path)) return { kind: 'rewrite', ...r };
    return null;
}

// Pulls every referenced URL out of an HTML or CSS document.
export function extractRefs(html) {
    const refs = [];
    const add = (raw, kind) => {
        const v = (raw || '').trim().replace(/&amp;/g, '&');
        if (!v || v.includes('${') || v.startsWith('%23')) return;
        refs.push({ raw: v, kind });
    };
    for (const m of html.matchAll(/\s(href|src|poster|srcset|data-src)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)) {
        const val = m[2] ?? m[3];
        if (m[1].toLowerCase() === 'srcset') val.split(',').forEach(part => add(part.trim().split(/\s+/)[0], 'srcset'));
        else add(val, m[1].toLowerCase());
    }
    for (const m of html.matchAll(/<meta[^>]+(?:property|name)\s*=\s*"(og:image|twitter:image)"[^>]*content\s*=\s*"([^"]+)"/gi)) add(m[2], 'meta');
    for (const m of html.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/gi)) add(m[2], 'url()');
    // Asset paths written as string literals in scripts, e.g. '/reel/clip.mp4'
    for (const m of html.matchAll(/['"`](\/[\w\-./]+\.(?:mp4|webm|jpe?g|png|svg|webp|gif|avif|json|glb|gltf|pdf|css|js|mjs|woff2?))['"`]/gi)) add(m[1], 'script');
    return refs;
}

async function status(url, method = 'HEAD', redirect = 'follow') {
    try {
        let r = await fetch(url, { method, redirect, signal: AbortSignal.timeout(20000) });
        if (method === 'HEAD' && (r.status === 405 || r.status === 501)) r = await fetch(url, { redirect, signal: AbortSignal.timeout(20000) });
        if (r.body) await r.body.cancel().catch(() => {});
        return { status: r.status, finalUrl: r.url, location: r.headers.get('location'), type: r.headers.get('content-type') };
    } catch (e) {
        return { status: 0, error: e.cause?.code || e.name || e.message };
    }
}

async function pool(items, n, fn) {
    const out = new Array(items.length);
    let next = 0;
    await Promise.all(Array.from({ length: n }, async () => {
        while (next < items.length) { const i = next++; out[i] = await fn(items[i]); }
    }));
    return out;
}

// html: the candidate homepage source. cand: { url, local }.
export async function checkLinks(html, cand, routes) {
    const origin = new URL(cand.url).origin;
    const ids = new Set([...html.matchAll(/\sid\s*=\s*"([^"]+)"/g)].map(m => m[1]));
    const refs = extractRefs(html);

    const anchors = [], external = new Set(), skipped = [], targets = new Map();
    const queue = (path, ref) => {
        if (!targets.has(path)) targets.set(path, { path, kinds: new Set(), raws: new Set() });
        targets.get(path).kinds.add(ref.kind); targets.get(path).raws.add(ref.raw);
    };

    for (const ref of refs) {
        if (SKIP_SCHEME.test(ref.raw)) continue;
        if (ref.raw.startsWith('#')) {
            if (ref.raw.length > 1 && ref.kind === 'href') anchors.push({ ref: ref.raw, ok: ids.has(decodeURIComponent(ref.raw.slice(1))) });
            continue;
        }
        let u;
        try { u = new URL(ref.raw, origin + '/'); } catch { continue; }
        if (u.hostname === PRODUCTION_HOST || u.hostname === PRODUCTION_HOST.replace(/^www\./, '')) u = new URL(u.pathname + u.search, origin);
        if (u.origin !== origin) { external.add(u.origin); continue; }
        queue(u.pathname + u.search, ref);
    }

    // Stylesheets on our own origin can reference more assets.
    for (const t of [...targets.values()].filter(t => /\.css(\?|$)/.test(t.path))) {
        try {
            const css = await (await fetch(origin + t.path)).text();
            for (const ref of extractRefs(css).filter(r => r.kind === 'url()' && !SKIP_SCHEME.test(r.raw) && !r.raw.startsWith('#'))) {
                const u = new URL(ref.raw, origin + t.path);
                if (u.origin === origin) queue(u.pathname + u.search, { raw: ref.raw, kind: `css:${t.path}` });
            }
        } catch {}
    }

    const toFetch = [];
    for (const t of targets.values()) {
        const pathOnly = t.path.split('?')[0];
        if (cand.local && VERCEL_ONLY.some(re => re.test(pathOnly))) { skipped.push({ path: t.path, why: 'Vercel-only (functions/analytics), not served locally' }); continue; }
        const route = routeFor(pathOnly, routes);
        if (cand.local && route) { skipped.push({ path: t.path, why: `vercel.json ${route.kind} to ${route.destination}` }); continue; }
        toFetch.push(t);
    }
    const results = await pool(toFetch, cand.local ? 8 : 3, async t => ({ ...t, kinds: [...t.kinds], raws: [...t.raws], ...(await status(origin + t.path)) }));
    return {
        checked: results,
        failures: results.filter(r => r.status !== 200),
        skipped,
        anchors,
        external: [...external].sort(),
    };
}

// Important paths, redirect samples and vercel.json destinations for one site.
export async function checkPaths(site, routes) {
    const origin = new URL(site.url).origin;
    const paths = [];
    for (const p of IMPORTANT_PATHS) {
        const route = routeFor(p, routes);
        if (site.local && route) {
            const dest = route.destination.startsWith('/') ? await status(origin + route.destination, 'HEAD') : null;
            paths.push({ path: p, skipped: `vercel.json ${route.kind}, Vercel only`, dest: route.destination, destStatus: dest?.status ?? null });
        } else {
            // /admin is only ever HEAD-requested, never opened or logged into.
            const r = await status(origin + p, 'HEAD');
            paths.push({ path: p, status: r.status, error: r.error });
        }
    }
    const redirects = [];
    for (const s of REDIRECT_SAMPLES) {
        if (site.local) { redirects.push({ ...s, skipped: 'redirects only run on Vercel' }); continue; }
        const r = await status(origin + s.path, 'HEAD', 'manual');
        let loc = null;
        try { loc = r.location ? new URL(r.location, origin + s.path).pathname : null; } catch {}
        redirects.push({ ...s, status: r.status, location: loc, ok: r.status >= 300 && r.status < 400 && loc === s.to });
    }
    return { paths, redirects };
}

// Every local destination named in vercel.json must exist in the build.
export async function checkRouteDestinations(site, routes) {
    const origin = new URL(site.url).origin;
    const dests = [...new Set([...routes.redirects, ...routes.rewrites].map(r => r.destination).filter(d => d.startsWith('/') && !d.includes(':')))];
    return Promise.all(dests.map(async d => ({ path: d, ...(await status(origin + d, 'HEAD')) })));
}
