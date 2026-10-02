// One page load of one site at one viewport: visual captures, then behavior
// checks, then captures of the sections the reveal button unfolds.
import { sleep } from './cdp.mjs';
import { injectCss, settle, plan, maskRects, layout, frontCards, snapshot } from './pagejs.mjs';
import { isBlank } from './diff.mjs';
import { runBehavior } from './behavior.mjs';
import { FREEZE_CSS, MASK_SELECTORS, WHEEL_POINTS, SECTIONS, REVEALED_SECTIONS, LAYOUT_SELECTORS } from '../config.mjs';

async function capture(page, step) {
    await page.eval(`window.scrollTo({ top: ${step.y}, left: 0, behavior: 'instant' })`);
    await page.eval(settle());
    // The wheel sizes its screenshot pan from image heights at the moment it renders,
    // so a late-loading image leaves a different pan. A resize event makes it re-measure.
    await page.eval(`dispatchEvent(new Event('resize'))`);
    await page.eval(settle());
    let png = await page.screenshot();
    if (await isBlank(png)) { // a fresh renderer occasionally hands back an empty frame
        await sleep(1500);
        await page.eval(settle());
        png = await page.screenshot();
    }
    return {
        name: step.name,
        y: await page.eval('Math.round(scrollY)'),
        png,
        masks: await page.eval(maskRects(MASK_SELECTORS)),
    };
}

export async function runSite(browser, site, vp, log) {
    const page = await browser.newPage(vp);
    try {
        await page.goto(site.url + '/');
        const loadedAt = Date.now();
        const snap = await page.eval(snapshot);
        await page.eval(injectCss(FREEZE_CSS));
        await sleep(Math.max(0, 2500 - (Date.now() - loadedAt))); // let the hero's load ramp finish
        await page.eval(settle());

        const lay = await page.eval(layout(LAYOUT_SELECTORS));
        const steps = await page.eval(plan(WHEEL_POINTS, SECTIONS));
        const shots = [];
        let fronts = null;
        for (const step of steps) {
            if (step.y === null) { shots.push({ name: step.name, missing: step.missing }); continue; }
            shots.push(await capture(page, step));
            if (step.name.startsWith('wheel-')) (fronts ||= []).push(...(await page.eval(frontCards)));
            log('.');
        }

        const behavior = await runBehavior(page, vp, fronts);
        log('.');

        // Sections inside the reveal group. Open it directly if the button check could not.
        await page.eval(`(() => { const g = document.getElementById('photo-video-group'); if (g && g.hidden && window.revealPhotoVideo) window.revealPhotoVideo(); })()`);
        if (!vp.mobile) await page.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 0, y: 0 });
        await page.eval(settle());
        const revealSteps = await page.eval(plan([], REVEALED_SECTIONS));
        for (const step of revealSteps.filter(s => s.name !== 'top')) {
            if (step.y === null) { shots.push({ name: step.name, missing: step.missing }); continue; }
            shots.push(await capture(page, step));
            log('.');
        }

        await sleep(500);
        return { shots, layout: lay, behavior, snap, console: page.console, requests: [...page.requests.values()] };
    } finally {
        await page.close();
    }
}
