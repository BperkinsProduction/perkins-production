// Minimal Chrome DevTools driver: opens the page in a real top-level headless Chrome tab
// (animation frames run normally there, unlike inside iframes under --virtual-time-budget).
import { spawn } from "node:child_process";
import { writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const CH = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const URL_DEFAULT = process.env.URL || "http://127.0.0.1:8771/concepts/robinwood/";

export async function open({ width = 1440, height = 900, mobile = false, reduced = false, url = URL_DEFAULT } = {}) {
  const port = 9300 + Math.floor(Math.random() * 600);
  const dir = mkdtempSync(join(tmpdir(), "cdp-"));
  const proc = spawn(CH, ["--headless=new", "--no-sandbox", "--hide-scrollbars", "--mute-audio", `--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, `--window-size=${width},${height}`, "about:blank"], { stdio: "ignore" });
  let tabs;
  for (let i = 0; i < 80; i++) { try { tabs = await (await fetch(`http://127.0.0.1:${port}/json`)).json(); if (tabs.length) break; } catch {} await sleep(150); }
  const tab = tabs.find((t) => t.type === "page");
  const ws = new WebSocket(tab.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener("open", r, { once: true }));
  let id = 0; const wait = new Map(); const logs = [];
  ws.addEventListener("message", (m) => {
    const d = JSON.parse(m.data);
    if (d.id && wait.has(d.id)) { wait.get(d.id)(d); wait.delete(d.id); }
    if (d.method === "Runtime.exceptionThrown") logs.push("EXC " + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    if (d.method === "Runtime.consoleAPICalled" && (d.params.type === "error" || d.params.type === "warning")) logs.push(d.params.type + " " + d.params.args.map((a) => a.value ?? a.description).join(" "));
    if (d.method === "Log.entryAdded" && d.params.entry.level === "error") logs.push("LOG " + d.params.entry.text + " " + (d.params.entry.url || ""));
  });
  const send = (method, params = {}) => new Promise((r) => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send("Runtime.enable"); await send("Log.enable"); await send("Page.enable");
  await send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: 1, mobile });
  if (mobile) await send("Emulation.setTouchEmulationEnabled", { enabled: true, maxTouchPoints: 5 });
  if (reduced) await send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-motion", value: "reduce" }] });
  await send("Page.navigate", { url });
  await sleep(2500);
  return {
    logs, send,
    // Runs an async function body in the page and returns its JSON result. Use scrollTo({behavior:"instant"}):
    // the page sets scroll-behavior:smooth, and a later instant scroll cancels a smooth one mid-way.
    async js(expr) { const r = await send("Runtime.evaluate", { expression: `(async()=>{${expr}})()`, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) return { ERROR: r.result.exceptionDetails.exception?.description }; return r.result?.result?.value; },
    async shot(path) { const r = await send("Page.captureScreenshot", { format: "jpeg", quality: 82 }); writeFileSync(path, Buffer.from(r.result.data, "base64")); },
    async media(features) { await send("Emulation.setEmulatedMedia", { features }); },
    async close() { ws.close(); proc.kill(); },
  };
}
