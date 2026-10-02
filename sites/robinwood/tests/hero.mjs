// Checks 1 to 3: the scroll-driven hero, flick settling, and the reduced-motion live toggle.
import { session, run, sleep, result, DESKTOP } from "./lib.mjs";

const PS = [0, 0.225, 0.395, 0.565, 0.74, 1];

// scroll the hero to progress p and report bands and video time once the scrub has come to rest
const atProgress = (p) => `
  const h = $("#hero"), v = $("#heroVideo"), span = h.offsetHeight - innerHeight;
  go(docTop(h) + span * ${p});
  const sig = () => $$(".band").map((x) => x.style.opacity).join() + "|" + v.currentTime.toFixed(3) + "|" + v.seeking;
  const rested = await settle(sig, 5000, 15);
  const ops = $$(".band").map((x) => +getComputedStyle(x).opacity);
  const want = ${p} * (v.duration - 0.05);
  return { rested, ops, full: ops.map((o, i) => (o >= 0.999 ? i + 1 : 0)).filter(Boolean), t: v.currentTime, want, seeking: v.seeking };`;

export async function heroChecks() {
  const out = [];
  const b = await session("hero", DESKTOP);
  try {
    await sleep(2500); // the hero video arrives by blob fetch
    const init = await run(b, `await until(() => $("#stage").classList.contains("ready"), 10000);
      return { scrub: document.documentElement.classList.contains("scrub"), ready: $("#stage").classList.contains("ready"), dur: $("#heroVideo").duration };`);
    const rows = [];
    let ok = init.scrub && init.ready;
    for (let i = 0; i < PS.length; i++) {
      const m = await run(b, atProgress(PS[i]));
      const good = m.full.length === 1 && m.full[0] === i + 1 && Math.abs(m.t - m.want) <= 0.05;
      ok = ok && good;
      rows.push(`p=${PS[i]} band ${m.full.join("+") || "none"} t=${m.t.toFixed(3)}/${m.want.toFixed(3)}${good ? "" : " BAD"}`);
    }
    out.push(result("1 scroll hero", ok, `scrub=${init.scrub} ready=${init.ready} dur=${init.dur?.toFixed(2)}; ${rows.join("; ")}`));

    // 2. flick: four quick 240px scrolls 40 ms apart from p=0.3
    await run(b, atProgress(0.3));
    const f = await run(b, `
      const h = $("#hero"), v = $("#heroVideo"), span = h.offsetHeight - innerHeight;
      for (let i = 0; i < 4; i++) { go(scrollY + 240); if (i < 3) await wait(40); }
      const t0 = performance.now();
      const p = Math.min(1, Math.max(0, -h.getBoundingClientRect().top / span)), want = p * (v.duration - 0.05);
      let hit = null;
      while (performance.now() - t0 < 2000) { if (!v.seeking && Math.abs(v.currentTime - want) <= 0.05) { hit = performance.now() - t0; break; } await new Promise((r) => requestAnimationFrame(r)); }
      return { p, want, t: v.currentTime, ms: hit };`);
    out.push(result("2 flick settle", f.ms != null && f.ms <= 600,
      `to p=${f.p.toFixed(3)} target ${f.want.toFixed(3)}s, reached in ${f.ms == null ? "over 2000" : Math.round(f.ms)} ms (limit 600), t=${f.t.toFixed(3)}`));

    // 3. reduced motion live toggle
    await run(b, `go(0);`);
    await b.media([{ name: "prefers-reduced-motion", value: "reduce" }]);
    const rm = await run(b, `await until(() => !document.documentElement.classList.contains("scrub"), 2000); await frame();
      return { scrub: document.documentElement.classList.contains("scrub"), staticDisplay: getComputedStyle($(".hero-static")).display };`);
    await b.media([{ name: "prefers-reduced-motion", value: "no-preference" }]);
    const back = await run(b, `await until(() => document.documentElement.classList.contains("scrub"), 2000); await frame();
      return { scrub: document.documentElement.classList.contains("scrub"), staticDisplay: getComputedStyle($(".hero-static")).display };`);
    out.push(result("3 reduced motion toggle", !rm.scrub && rm.staticDisplay !== "none" && back.scrub,
      `reduce: scrub=${rm.scrub} .hero-static display=${rm.staticDisplay}; back: scrub=${back.scrub} .hero-static display=${back.staticDisplay}`));
  } catch (e) {
    out.push(result("hero checks crashed", false, String(e && e.stack || e)));
  } finally { await b.close(); }
  return out;
}
