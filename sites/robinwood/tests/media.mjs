// Check 11 (images and the before/after gallery) and check 12 (horizontal overflow).
import { run, result } from "./lib.mjs";

export async function imagesCheck(b) {
  // one image at a time so the small local server is not flooded; a failed image gets one re-request
  const m = await run(b, `
    const imgs = $$("img"); const bad = []; let retried = 0;
    const load = (img) => new Promise((res) => { if (img.complete && img.naturalWidth) return res(); const t = setTimeout(res, 15000);
      img.addEventListener("load", () => { clearTimeout(t); res(); }, { once: true }); img.addEventListener("error", () => { clearTimeout(t); res(); }, { once: true }); });
    for (const img of imgs) {
      img.loading = "eager"; await load(img);
      let ok = await img.decode().then(() => true, () => false);
      if (!ok || !img.naturalWidth) { retried++; const s = img.getAttribute("src"); img.src = ""; img.src = s; await load(img); ok = await img.decode().then(() => true, () => false); }
      if (!ok || !img.naturalWidth) bad.push((img.currentSrc || img.getAttribute("src") || "(no src)").split("/").pop());
    }
    const smiles = $(".smiles"), cases = smiles ? smiles.querySelectorAll(".ba").length : 0;
    const ba = smiles && smiles.querySelector(".ba"), inp = ba && ba.querySelector("input");
    let pos = null;
    if (inp) { inp.value = 23; inp.dispatchEvent(new Event("input", { bubbles: true })); pos = ba.style.getPropertyValue("--pos"); }
    return { n: imgs.length, bad, retried, cases, pos };`);
  return result("11 images", m.bad.length === 0 && m.cases === 8 && String(m.pos).trim() === "23",
    `${m.n} imgs decoded, ${m.bad.length} broken${m.bad.length ? " (" + m.bad.join(", ") + ")" : ""}${m.retried ? ", " + m.retried + " needed a re-request" : ""}; .smiles has ${m.cases} .ba cases; first slider set to 23 gives --pos ${m.pos}`);
}

// measured at the top and at several depths, since entrances and pinned scenes change the layout as you scroll
export async function overflowCheck(b, label) {
  const m = await run(b, `const H = document.documentElement.scrollHeight - innerHeight, rows = [];
    for (const f of [0, 0.2, 0.4, 0.6, 0.8, 1]) { go(H * f); await wait(250);
      rows.push(document.documentElement.scrollWidth - document.documentElement.clientWidth); }
    go(0); await frame();
    return { rows, max: Math.max(...rows), cw: document.documentElement.clientWidth };`);
  return result(`12 no overflow (${label})`, m.max === 0, `scrollWidth minus clientWidth at 0..100% depth: ${m.rows.join(", ")} (clientWidth ${m.cw})`);
}
