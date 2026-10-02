// Drives headless Chrome over the DevTools protocol using Node's built-in
// WebSocket, so the harness needs no puppeteer or playwright.
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import net from 'node:net';

const CHROME_PATHS = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
].filter(Boolean);

export const sleep = ms => new Promise(r => setTimeout(r, ms));

function portFree(port) {
    return new Promise(res => {
        const s = net.createServer().once('error', () => res(false)).once('listening', () => s.close(() => res(true)));
        s.listen(port, '127.0.0.1');
    });
}

export async function launchChrome(preferredPort = 9391) {
    const bin = CHROME_PATHS.find(p => existsSync(p));
    if (!bin) throw new Error('Google Chrome not found. Set CHROME_PATH to the Chrome binary.');
    let port = preferredPort;
    while (!(await portFree(port))) port++;
    const profile = mkdtempSync(join(tmpdir(), 'pp-verify-chrome-'));
    const proc = spawn(bin, [
        '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
        '--hide-scrollbars', '--no-first-run', '--no-default-browser-check', '--mute-audio',
        '--force-color-profile=srgb', '--disable-background-timer-throttling',
        '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows',
        'about:blank',
    ], { stdio: ['ignore', 'ignore', 'pipe'] });
    proc.stderr.on('data', () => {});

    let wsUrl;
    for (let i = 0; i < 80 && !wsUrl; i++) {
        try { wsUrl = (await (await fetch(`http://127.0.0.1:${port}/json/version`)).json()).webSocketDebuggerUrl; }
        catch { await sleep(250); }
    }
    if (!wsUrl) { proc.kill('SIGKILL'); throw new Error('Chrome did not start its debugging port'); }

    const browser = new Browser(wsUrl);
    await browser.ready;
    browser.close = async () => {
        try { browser.sock.close(); } catch {}
        proc.kill('SIGKILL');
        await sleep(300);
        rmSync(profile, { recursive: true, force: true });
    };
    return browser;
}

class Browser {
    constructor(wsUrl) {
        this.sock = new WebSocket(wsUrl);
        this.id = 0;
        this.pending = new Map();
        this.listeners = new Set();
        this.ready = new Promise((res, rej) => { this.sock.onopen = res; this.sock.onerror = rej; });
        this.sock.onmessage = e => {
            const m = JSON.parse(e.data);
            if (m.id && this.pending.has(m.id)) {
                const { res, rej, method } = this.pending.get(m.id);
                this.pending.delete(m.id);
                if (m.error) rej(new Error(`${method}: ${m.error.message}`)); else res(m.result);
            } else if (m.method) {
                for (const fn of this.listeners) fn(m.method, m.params, m.sessionId);
            }
        };
    }
    send(method, params = {}, sessionId) {
        return new Promise((res, rej) => {
            const id = ++this.id;
            this.pending.set(id, { res, rej, method });
            this.sock.send(JSON.stringify({ id, method, params, sessionId }));
        });
    }

    // Opens a fresh tab in its own browser context (clean cache, cookies, storage).
    async newPage(vp) {
        const { browserContextId } = await this.send('Target.createBrowserContext', { disposeOnDetach: true });
        const { targetId } = await this.send('Target.createTarget', { url: 'about:blank', browserContextId });
        const { sessionId } = await this.send('Target.attachToTarget', { targetId, flatten: true });
        const page = new Page(this, sessionId, targetId, browserContextId, vp);
        await page.init();
        return page;
    }
}

const PHONE_UA = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36';

class Page {
    constructor(browser, sessionId, targetId, contextId, vp) {
        Object.assign(this, { browser, sessionId, targetId, contextId, vp });
        this.console = [];     // console errors and uncaught exceptions
        this.requests = new Map(); // requestId -> { url, type, status, failed }
        this.waiters = [];
        this.onEvent = (method, p, sid) => {
            if (sid !== this.sessionId) return;
            if (method === 'Runtime.exceptionThrown') {
                const d = p.exceptionDetails;
                this.console.push({ kind: 'exception', text: d.exception?.description || d.text, url: d.url });
            } else if (method === 'Runtime.consoleAPICalled' && p.type === 'error') {
                this.console.push({ kind: 'console.error', text: p.args.map(a => a.value ?? a.description ?? '').join(' ') });
            } else if (method === 'Log.entryAdded' && p.entry.level === 'error' && p.entry.source !== 'network') {
                this.console.push({ kind: `log:${p.entry.source}`, text: p.entry.text, url: p.entry.url });
            } else if (method === 'Network.requestWillBeSent') {
                this.requests.set(p.requestId, { url: p.request.url, method: p.request.method, type: p.type, status: null, failed: null });
            } else if (method === 'Network.responseReceived') {
                const r = this.requests.get(p.requestId);
                if (r) r.status = p.response.status;
            } else if (method === 'Network.loadingFailed') {
                const r = this.requests.get(p.requestId);
                if (r && p.blockedReason) r.failed = 'blocked';
                else if (r && !p.canceled) r.failed = p.errorText;
            }
            this.waiters = this.waiters.filter(w => (w.method === method ? (w.resolve(p), false) : true));
        };
        browser.listeners.add(this.onEvent);
    }
    send(method, params) { return this.browser.send(method, params, this.sessionId); }
    waitFor(method, timeout = 30000) {
        return new Promise((resolve, reject) => {
            const w = { method, resolve };
            this.waiters.push(w);
            setTimeout(() => { this.waiters = this.waiters.filter(x => x !== w); reject(new Error(`timeout waiting for ${method}`)); }, timeout);
        });
    }
    async init() {
        const { vp } = this;
        await Promise.all(['Page.enable', 'Runtime.enable', 'Network.enable', 'Log.enable'].map(m => this.send(m)));
        if (this.browser.blockedUrls) {
            await this.send('Network.setBlockedURLs', { urls: this.browser.blockedUrls })
                .catch(() => this.send('Network.setBlockedURLs', { urlPatterns: this.browser.blockedUrls.map(urlPattern => ({ urlPattern, block: true })) }));
        }
        await this.send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: !!vp.mobile });
        if (vp.mobile) {
            await this.send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
            await this.send('Emulation.setUserAgentOverride', { userAgent: PHONE_UA, platform: 'Android' });
        }
        await this.send('Emulation.setEmulatedMedia', {
            features: [{ name: 'prefers-reduced-motion', value: vp.reduced ? 'reduce' : 'no-preference' }],
        });
    }
    async goto(url) {
        const loaded = this.waitFor('Page.loadEventFired', 45000);
        const r = await this.send('Page.navigate', { url });
        if (r.errorText) throw new Error(`navigation to ${url} failed: ${r.errorText}`);
        await loaded;
    }
    async eval(expression) {
        const r = await this.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
        if (r.exceptionDetails) throw new Error(`page script failed: ${r.exceptionDetails.exception?.description || r.exceptionDetails.text}`);
        return r.result.value;
    }
    async screenshot() {
        const { data } = await this.send('Page.captureScreenshot', { format: 'png' });
        return Buffer.from(data, 'base64');
    }
    // A real pointer click (desktop) or a real tap (phone) at viewport coordinates.
    async click(x, y) {
        if (this.vp.mobile) {
            await this.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
            await sleep(40);
            await this.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
        } else {
            await this.send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y });
            await this.send('Input.dispatchMouseEvent', { type: 'mousePressed', x, y, button: 'left', clickCount: 1 });
            await this.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x, y, button: 'left', clickCount: 1 });
        }
        await sleep(150);
    }
    async close() {
        this.browser.listeners.delete(this.onEvent);
        try { await this.browser.send('Target.closeTarget', { targetId: this.targetId }); } catch {}
        try { await this.browser.send('Target.disposeBrowserContext', { browserContextId: this.contextId }); } catch {}
    }
}
