#!/usr/bin/env node
// Verifies that a candidate build of perkinsproduction.com looks and behaves like
// the reference (normally the live site). See README.md, "Verifying a build".
//
//   npm run verify -- --ref https://www.perkinsproduction.com --cand dist
import { existsSync, statSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, sleep } from './lib/cdp.mjs';
import { serveFolder } from './lib/server.mjs';
import { runSite } from './lib/site.mjs';
import { compare } from './lib/diff.mjs';
import { checkLinks, checkPaths, checkRouteDestinations, loadVercelRoutes, isLocalUrl } from './lib/links.mjs';
import { writeReport } from './lib/report.mjs';
import * as C from './config.mjs';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

const HELP = `Usage: npm run verify -- [options]

  --ref <url|folder>    Reference site (default ${C.DEFAULT_REF})
  --cand <url|folder>   Candidate site or build folder (default ${C.DEFAULT_CAND}); a folder is served on a free port
  --out <folder>        Where to write the report (default verify-report)
  --only <names>        Comma-separated viewports: ${C.VIEWPORTS.map(v => v.name).join(', ')}
  --threshold <pct>     Fail a shot above this % of differing pixels (default ${C.FAIL_PERCENT})
  --keep-shots          Also save every raw reference and candidate screenshot
  --chrome-port <n>     Chrome debugging port (default 9391)
`;

function parseArgs(argv) {
    const o = { ref: C.DEFAULT_REF, cand: C.DEFAULT_CAND, out: 'verify-report', only: null, threshold: C.FAIL_PERCENT, keepShots: false, chromePort: 9391 };
    for (let i = 0; i < argv.length; i++) {
        const a = argv[i], next = () => { if (i + 1 >= argv.length) throw new Error(`${a} needs a value`); return argv[++i]; };
        if (a === '--ref') o.ref = next();
        else if (a === '--cand') o.cand = next();
        else if (a === '--out') o.out = next();
        else if (a === '--only') o.only = next().split(',');
        else if (a === '--threshold') o.threshold = parseFloat(next());
        else if (a === '--keep-shots') o.keepShots = true;
        else if (a === '--chrome-port') o.chromePort = parseInt(next(), 10);
        else if (a === '-h' || a === '--help') { console.log(HELP); process.exit(0); }
        else throw new Error(`unknown option ${a}\n\n${HELP}`);
    }
    return o;
}

// A URL is used as-is; a folder is served by the built-in static server.
async function openTarget(arg, role) {
    if (/^https?:\/\//i.test(arg)) {
        const url = arg.replace(/\/+$/, '');
        return { url, label: url, local: isLocalUrl(url), close: () => {} };
    }
    const folder = resolve(arg);
    if (!existsSync(folder) || !statSync(folder).isDirectory()) {
        throw new Error(`${role} "${arg}" is not a URL or a folder${arg === 'dist' ? '. Run "npm run build" first.' : ''}`);
    }
    const srv = await serveFolder(folder);
    return { url: srv.url, label: `${arg} (served at ${srv.url})`, local: true, folder, close: srv.close };
}

const norm = (s, site) => String(s).split(new URL(site.url).origin).join('');
const fmt = n => (Math.round(n * 1000) / 1000).toString();

function compareBehavior(vp, refChecks, candChecks, rows) {
    const refById = Object.fromEntries(refChecks.map(c => [c.id, c]));
    for (const c of candChecks) {
        const r = refById[c.id];
        let status = c.status, detail = c.detail;
        if (c.status === 'fail' && r?.status === 'fail') { status = 'warn'; detail = `${c.detail} (also fails on reference)`; }
        else if (c.status === 'skip' && r?.status === 'pass') { status = 'fail'; detail = `works on reference but not checked here: ${c.detail}`; }
        else if (c.status === 'pass' && r && r.status === 'pass' && JSON.stringify(c.data) !== JSON.stringify(r.data)) {
            status = 'fail'; detail = `differs from reference. Candidate: ${JSON.stringify(c.data)}. Reference: ${JSON.stringify(r.data)}`;
        }
        rows.push({ category: 'Behavior', viewport: vp.name, name: c.label, ref: r ? `${r.status}: ${r.detail}` : 'n/a', cand: detail, status });
    }
}

function classifyRequests(result, site) {
    const origin = new URL(site.url).origin;
    const out = { failed: [], vercelOnly: [], blocked: [], thirdParty: [], posts: [] };
    for (const r of result.requests) {
        let u;
        try { u = new URL(r.url); } catch { continue; }
        if (!/^https?:$/.test(u.protocol)) continue;
        const bad = r.failed || (r.status && r.status >= 400);
        if (r.failed === 'blocked' || r.failed === 'net::ERR_BLOCKED_BY_CLIENT') { out.blocked.push(u.pathname); continue; }
        if (r.method === 'POST' && (u.hostname.includes('formsubmit') || u.pathname.startsWith('/api/'))) out.posts.push(r.url);
        if (u.origin !== origin) { if (bad) out.thirdParty.push(`${r.status || r.failed} ${r.url}`); continue; }
        if (site.local && C.VERCEL_ONLY.some(re => re.test(u.pathname))) { out.vercelOnly.push(`${u.pathname} (${r.status || r.failed || 'no response'})`); continue; }
        if (bad) out.failed.push(`${r.status || r.failed} ${u.pathname}`);
    }
    for (const k of Object.keys(out)) out[k] = [...new Set(out[k])];
    return out;
}

async function main() {
    const opts = parseArgs(process.argv.slice(2));
    const started = new Date();
    const outDir = resolve(opts.out);
    const log = s => process.stdout.write(s);

    const ref = await openTarget(opts.ref, 'reference');
    const cand = await openTarget(opts.cand, 'candidate');
    rmSync(outDir, { recursive: true, force: true });
    mkdirSync(join(outDir, 'images'), { recursive: true });
    const routes = loadVercelRoutes(REPO);
    const viewports = C.VIEWPORTS.filter(v => !opts.only || opts.only.includes(v.name));
    const rows = [];
    const notes = [];
    let browser;
    console.log(`Reference: ${ref.label}\nCandidate: ${cand.label}`);

    try {
        browser = await launchChrome(opts.chromePort);
        // Analytics beacons are blocked so test runs never count as visits on the live site.
        browser.blockedUrls = ['*/_vercel/insights/*', '*/_vercel/speed-insights/*'];

        // Warm-up: the first capture in a fresh Chrome is sometimes blank.
        const warm = await browser.newPage(viewports[0]);
        await warm.goto(cand.url + '/').catch(() => {});
        await sleep(1500);
        await warm.close();

        let refSnap = null, candSnap = null;
        for (const vp of viewports) {
            log(`\n[${vp.name}] reference `);
            const R = await runSite(browser, ref, vp, log);
            log(' candidate ');
            const K = await runSite(browser, cand, vp, log);
            log(' comparing');
            if (!refSnap) { refSnap = R.snap; candSnap = K.snap; }

            // Visual
            const names = [...new Set([...R.shots, ...K.shots].map(s => s.name))];
            for (const name of names) {
                const a = R.shots.find(s => s.name === name), b = K.shots.find(s => s.name === name);
                const row = { category: 'Visual', viewport: vp.name, name };
                if (!a?.png && !b?.png) { rows.push({ ...row, status: 'skip', detail: a?.missing || b?.missing }); continue; }
                if (!a?.png || !b?.png) { rows.push({ ...row, status: 'fail', detail: `missing on ${b?.png ? 'reference' : 'candidate'}: ${(a?.missing || b?.missing)}` }); continue; }
                const masks = [...a.masks, ...b.masks];
                const d = await compare(a.png, b.png, masks, { tolerance: C.PIXEL_TOLERANCE });
                const status = d.percent > opts.threshold || d.sizeMismatch ? 'fail' : 'pass';
                Object.assign(row, { percent: fmt(d.percent), masked: fmt(d.maskedPercent), scroll: `${a.y} / ${b.y}`, status,
                    detail: [status === 'fail' && `${fmt(d.percent)}% of pixels differ`, d.sizeMismatch && 'screenshot sizes differ', a.y !== b.y && 'scroll positions differ (layout shift above this point)'].filter(Boolean).join('; ') });
                const base = join(outDir, 'images', `${vp.name}-${name}`);
                if (d.percent > C.IMAGE_PERCENT || status === 'fail') {
                    const { diffPng, sideBySide } = await d.render();
                    writeFileSync(row.sbs = `${base}-side-by-side.jpg`, sideBySide);
                    writeFileSync(row.diff = `${base}-diff.png`, diffPng);
                }
                if (opts.keepShots) { writeFileSync(`${base}-ref.png`, a.png); writeFileSync(`${base}-cand.png`, b.png); }
                rows.push(row);
            }

            // Layout: section positions and page height
            const lr = R.layout, lk = K.layout;
            const drift = [];
            if (Math.abs(lr.scrollHeight - lk.scrollHeight) > C.LAYOUT_TOLERANCE_PX) drift.push(`page height ${lr.scrollHeight} vs ${lk.scrollHeight}`);
            for (const s of C.LAYOUT_SELECTORS) {
                const x = lr.items[s], y = lk.items[s];
                if (!x && !y) continue;
                if (!x || !y) { drift.push(`${s} ${x ? 'missing on candidate' : 'only on candidate'}`); continue; }
                if (Math.abs(x.top - y.top) > C.LAYOUT_TOLERANCE_PX || Math.abs(x.height - y.height) > C.LAYOUT_TOLERANCE_PX) drift.push(`${s} top ${x.top}/${y.top}, height ${x.height}/${y.height}`);
            }
            rows.push({ category: 'Layout', viewport: vp.name, name: 'Section positions and page height match', ref: `page ${lr.scrollHeight}px`, cand: drift.length ? drift.join('; ') : `page ${lk.scrollHeight}px, ${Object.values(lk.items).filter(Boolean).length} sections within ${C.LAYOUT_TOLERANCE_PX}px`, status: drift.length ? 'fail' : 'pass' });

            // Behavior
            compareBehavior(vp, R.behavior, K.behavior, rows);

            // Console and network
            const ce = K.console.map(e => `${e.kind}: ${norm(e.text, cand)}`), re = R.console.map(e => `${e.kind}: ${norm(e.text, ref)}`);
            const newErrors = ce.filter(e => !re.includes(e));
            rows.push({ category: 'Console and network', viewport: vp.name, name: 'No console errors or uncaught exceptions', ref: re.length ? re.join(' / ') : 'none', cand: ce.length ? ce.join(' / ') : 'none',
                status: newErrors.length ? 'fail' : ce.length ? 'warn' : 'pass' });
            const nr = classifyRequests(R, ref), nk = classifyRequests(K, cand);
            rows.push({ category: 'Console and network', viewport: vp.name, name: 'No failed same-origin requests', ref: nr.failed.join(', ') || 'none', cand: nk.failed.join(', ') || 'none',
                status: nk.failed.some(f => !nr.failed.includes(f)) ? 'fail' : nk.failed.length ? 'warn' : 'pass' });
            if (nk.vercelOnly.length) rows.push({ category: 'Console and network', viewport: vp.name, name: 'Vercel-only requests (ignored on localhost)', ref: '', cand: nk.vercelOnly.join(', '), status: 'skip' });
            rows.push({ category: 'Console and network', viewport: vp.name, name: 'Third-party request failures', ref: nr.thirdParty.join(', ') || 'none', cand: nk.thirdParty.join(', ') || 'none', status: nk.thirdParty.length ? 'warn' : 'pass' });
            const posts = [...nr.posts, ...nk.posts];
            rows.push({ category: 'Console and network', viewport: vp.name, name: 'Nothing was submitted (no form or API POST)', ref: nr.posts.join(', ') || 'none', cand: nk.posts.join(', ') || 'none', status: posts.length ? 'fail' : 'pass' });
        }

        // Content: head tags and visible text, from the first viewport's fresh load
        if (refSnap) {
            const keys = [...new Set([...Object.keys(refSnap.meta), ...Object.keys(candSnap.meta)])].sort();
            const diffs = keys.filter(k => refSnap.meta[k] !== candSnap.meta[k]).map(k => `${k}: "${refSnap.meta[k] ?? '(missing)'}" vs "${candSnap.meta[k] ?? '(missing)'}"`);
            rows.push({ category: 'Content', viewport: viewports[0].name, name: 'Title, meta, canonical, icons and structured data match', ref: `${Object.keys(refSnap.meta).length} tags`, cand: diffs.length ? diffs.join('; ') : `${keys.length} tags identical`, status: diffs.length ? 'fail' : 'pass' });
            const onlyRef = refSnap.text.filter(t => !candSnap.text.includes(t)), onlyCand = candSnap.text.filter(t => !refSnap.text.includes(t));
            rows.push({ category: 'Content', viewport: viewports[0].name, name: 'Visible text matches', ref: `${refSnap.text.length} lines`, cand: onlyRef.length || onlyCand.length ? `missing: ${onlyRef.slice(0, 8).map(t => `"${t}"`).join(', ') || 'none'}; extra: ${onlyCand.slice(0, 8).map(t => `"${t}"`).join(', ') || 'none'}` : `${candSnap.text.length} lines identical`, status: onlyRef.length || onlyCand.length ? 'fail' : 'pass' });
        }
    } finally {
        if (browser) await browser.close();
    }

    // Links and assets on the candidate homepage
    log('\n[links] ');
    const html = cand.folder ? readFileSync(join(cand.folder, 'index.html'), 'utf8') : await (await fetch(cand.url + '/')).text();
    const links = await checkLinks(html, cand, routes);
    const badAnchors = links.anchors.filter(a => !a.ok);
    rows.push({ category: 'Links and assets', name: 'Every same-origin href/src/srcset/poster/url() loads', ref: '', cand: links.failures.length ? links.failures.map(f => `${f.status || f.error} ${f.path}`).join(', ') : `${links.checked.length} URLs answered 200`, status: links.failures.length ? 'fail' : 'pass' });
    rows.push({ category: 'Links and assets', name: 'In-page #anchors point at real ids', ref: '', cand: badAnchors.length ? badAnchors.map(a => a.ref).join(', ') : `${links.anchors.length} anchors ok`, status: badAnchors.length ? 'fail' : 'pass' });
    if (links.skipped.length) rows.push({ category: 'Links and assets', name: 'Skipped (only work on Vercel)', ref: '', cand: links.skipped.map(s => s.path).join(', '), status: 'skip' });

    // Important paths, redirects and vercel.json destinations
    log('[paths] ');
    const pr = await checkPaths(ref, routes), pk = await checkPaths(cand, routes);
    pk.paths.forEach((p, i) => {
        const r = pr.paths[i];
        const refTxt = r.skipped ? `skipped (${r.skipped})` : String(r.status || r.error);
        if (p.skipped) {
            const ok = p.destStatus === 200;
            rows.push({ category: 'Paths and routes', name: p.path, ref: refTxt, cand: `skipped (${p.skipped}); destination ${p.dest} answered ${p.destStatus}`, status: ok ? 'skip' : 'fail' });
        } else {
            rows.push({ category: 'Paths and routes', name: p.path, ref: refTxt, cand: String(p.status || p.error), status: p.status === 200 ? 'pass' : 'fail' });
        }
    });
    pk.redirects.forEach((p, i) => {
        const r = pr.redirects[i];
        const refTxt = r.skipped ? 'skipped' : `${r.status} to ${r.location}`;
        rows.push({ category: 'Paths and routes', name: `redirect ${p.path}`, ref: refTxt, cand: p.skipped ? `skipped (${p.skipped})` : `${p.status} to ${p.location}`, status: p.skipped ? 'skip' : p.ok ? 'pass' : 'fail' });
    });
    for (const d of await checkRouteDestinations(cand, routes)) {
        rows.push({ category: 'Paths and routes', name: `vercel.json destination ${d.path} exists`, ref: '', cand: String(d.status || d.error), status: d.status === 200 ? 'pass' : 'fail' });
    }

    notes.push(`Shots fail above ${opts.threshold}% differing pixels (a pixel differs when a colour channel moves more than ${C.PIXEL_TOLERANCE}/255). Images are written above ${C.IMAGE_PERCENT}%.`);
    notes.push(`Masked in both shots before comparing (purple in diff images): ${C.MASK_SELECTORS.join(', ')}. Hidden in both: cursor glow, hero particles, hero photo reel. Background glows and all CSS animations are frozen.`);
    notes.push('Behavior checks run on both sites. A candidate failure that also happens on the reference is a warning, not a failure.');
    notes.push('Vercel analytics requests are blocked in the test browser so runs never count as visits. The contact form is never submitted and /admin is only ever HEAD-requested.');
    if (cand.local) notes.push('The candidate is served locally, so /api/*, /_vercel/*, and vercel.json rewrites and redirects are reported as skipped. Run against a Vercel preview URL to cover them.');

    const { failed, counts } = writeReport({ outDir, ref, cand, started, rows, links, notes });
    ref.close(); cand.close();
    console.log(`\n\n${failed ? 'FAIL' : 'PASS'}: ${counts.pass} passed, ${counts.fail} failed, ${counts.warn} warnings, ${counts.skip} skipped`);
    for (const r of rows.filter(r => r.status === 'fail')) console.log(`  FAIL ${r.category} / ${r.viewport || 'all'} / ${r.name}: ${String(r.detail || r.cand).slice(0, 200)}`);
    console.log(`\nReport: ${join(outDir, 'report.md')}`);
    process.exit(failed ? 1 : 0);
}

main().catch(e => { console.error(`\nverify could not run: ${process.env.VERIFY_DEBUG ? e.stack : e.message}`); process.exit(2); });
