// Check 6: the flight along the Pike (desktop) and the map fallback (phone).
import { run, result } from "./lib.mjs";

const at = (p) => `
  const fl = $("#flight"), v = $("#flightVideo"), span = fl.offsetHeight - innerHeight;
  go(docTop(fl) + span * ${p});
  const sig = () => $("#fmile").textContent + "|" + v.currentTime.toFixed(3) + "|" + v.seeking + "|" + $$(".fl").map((l) => l.style.opacity).join();
  const rested = await settle(sig, 5000, 15);
  const op = (k) => +getComputedStyle($('.fl[data-k="' + k + '"]')).opacity;
  return { rested, t: v.currentTime, want: ${p} * (v.duration - 0.05), mile: $("#fmile").textContent, hag: op("hagerstown"), mid: op("middletown") };`;

export async function flightDesktop(b) {
  // elements inside section.road report offsetTop relative to it, so docTop() uses the bounding rect
  const ready = await run(b, `const fl = $("#flight"); go(docTop(fl) - innerHeight); await wait(200); go(docTop(fl));
    const ok = await until(() => $("#fstage").classList.contains("ready"), 15000, 50);
    return { ok, display: getComputedStyle(fl).display, dur: $("#flightVideo").duration };`);
  const rows = [];
  let ok = ready.ok && ready.display !== "none";
  const ms = {};
  for (const p of [0, 0.55, 1]) {
    const m = await run(b, at(p));
    ms[p] = m;
    const good = Math.abs(m.t - m.want) <= 0.05;
    ok = ok && good;
    rows.push(`p=${p} t=${m.t.toFixed(3)}/${m.want.toFixed(3)} mile ${m.mile}${good ? "" : " BAD"}`);
  }
  const ends = ms[0].mile === "0.0" && ms[1].mile === "18.2" && ms[0].hag > 0.5 && ms[1].mid > 0.5;
  ok = ok && ends;
  return result("6 flight (desktop)", ok,
    `ready=${ready.ok} dur=${ready.dur?.toFixed(2)}; ${rows.join("; ")}; Hagerstown label at start ${ms[0].hag}, Middletown at end ${ms[1].mid}`);
}

export async function flightPhone(b) {
  const m = await run(b, `return { flight: getComputedStyle($("#flight")).display, map: getComputedStyle($("#map")).display };`);
  return result("6 flight (phone)", m.flight === "none" && m.map !== "none", `#flight display=${m.flight}, #map display=${m.map}`);
}
