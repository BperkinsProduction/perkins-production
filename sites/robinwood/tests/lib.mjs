// Shared helpers for the browser checks. Built on cdp.mjs (open, js).
import { open, sleep, URL_DEFAULT } from "./cdp.mjs";

export { sleep, URL_DEFAULT };
export const DESKTOP = { width: 1440, height: 900, mobile: false };
export const PHONE = { width: 390, height: 844, mobile: true };

// Every session's console output lands here so run-all can judge check 13.
export const allLogs = [];
export const loadRetries = [];

// The local python http.server has a tiny listen backlog, so a page load sometimes gets
// net::ERR_CONNECTION_RESET on a few of its many parallel requests. That is the test server,
// not the page. When it happens during the initial load we navigate again (up to 4 tries).
const isReset = (l) => /ERR_CONNECTION_RESET|ERR_CONNECTION_REFUSED|ERR_EMPTY_RESPONSE/.test(l);

export async function session(label, opts = {}) {
  const b = await open(opts);
  const url = opts.url || URL_DEFAULT;
  await b.send("Emulation.setFocusEmulationEnabled", { enabled: true });
  for (let attempt = 1; attempt <= 4; attempt++) {
    if (!b.logs.some(isReset)) break;
    loadRetries.push(`${label}: attempt ${attempt} had ${b.logs.filter(isReset).length} reset request(s)`);
    b.logs.length = 0;
    await b.send("Page.navigate", { url });
    await sleep(2500);
  }
  b.label = label;
  const close = b.close.bind(b);
  b.close = async () => { for (const l of b.logs) allLogs.push(`[${label}] ${l}`); await close(); };
  return b;
}

// Page-side helpers prepended to every evaluated body.
export const PRE = `
const $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const frame = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
const docTop = (el) => el.getBoundingClientRect().top + scrollY;
const go = (top) => scrollTo({ top, behavior: "instant" });
async function until(f, ms = 4000, step = 16) { const t0 = performance.now(); while (performance.now() - t0 < ms) { const v = f(); if (v) return v; await wait(step); } return f(); }
// waits until sig() returns the same string for n consecutive polls (the animation has come to rest)
async function settle(sig, ms = 5000, n = 12) { const t0 = performance.now(); let last = null, same = 0; while (performance.now() - t0 < ms) { const s = sig(); if (s === last) { if (++same >= n) return true; } else { same = 0; last = s; } await wait(16); } return false; }
`;
export const run = (b, body) => b.js(PRE + body);

// A real mouse click at the element's center, after scrolling it to the middle of the viewport.
// Returns what elementFromPoint saw so a covered target is reported, not silently clicked.
export async function click(b, sel) {
  const at = await run(b, `const el = $(${JSON.stringify(sel)}); if (!el) return { missing: true };
    el.scrollIntoView({ block: "center", behavior: "instant" }); await frame();
    const r = el.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, hit = document.elementFromPoint(x, y);
    return { x, y, hits: !!hit && (hit === el || el.contains(hit)), hit: hit ? hit.tagName + "." + hit.className : null };`);
  if (!at || at.missing) return { ok: false, why: "missing " + sel };
  for (const type of ["mouseMoved", "mousePressed", "mouseReleased"])
    await b.send("Input.dispatchMouseEvent", { type, x: at.x, y: at.y, button: "left", clickCount: type === "mouseMoved" ? 0 : 1 });
  return { ok: at.hits, why: at.hits ? "" : `covered by ${at.hit}` };
}

export async function key(b, type, k = " ") {
  const code = k === " " ? "Space" : k, vk = k === " " ? 32 : 13;
  await b.send("Input.dispatchKeyEvent", { type, key: k, code, windowsVirtualKeyCode: vk, nativeVirtualKeyCode: vk, ...(type === "keyDown" ? { text: k } : {}) });
}

export async function type(b, sel, text) {
  const c = await click(b, sel);
  await run(b, `$(${JSON.stringify(sel)}).focus();`);
  await b.send("Input.insertText", { text });
  return c;
}

export const result = (name, pass, detail) => ({ name, pass: !!pass, detail });
export const r2 = (n) => (n == null || Number.isNaN(n) ? n : Math.round(n * 1000) / 1000);
