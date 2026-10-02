// Screenshots two builds top to bottom with motion turned off and saves PNGs for a pixel diff.
import { open } from "./cdp.mjs";
import { writeFileSync } from "node:fs";
const [A, B, w, h, mobile, out] = [process.argv[2], process.argv[3], +process.argv[4], +process.argv[5], process.argv[6] === "m", process.argv[7]];
async function run(url, tag) {
  const b = await open({ width: w, height: h, mobile, reduced: true, url });
  await b.js(`document.querySelectorAll("img").forEach(i=>i.loading="eager"); await Promise.all([...document.images].map(i=>i.decode().catch(()=>0))); await new Promise(r=>setTimeout(r,2500))`);
  const total = await b.js(`return document.documentElement.scrollHeight`);
  let n = 0;
  for (let y = 0; y < total; y += Math.round(h * 0.9)) {
    await b.js(`scrollTo({top:${y},behavior:"instant"}); await new Promise(r=>setTimeout(r,700))`);
    const r = await b.send("Page.captureScreenshot", { format: "png" });
    writeFileSync(`${out}/${tag}-${String(n).padStart(3, "0")}.png`, Buffer.from(r.result.data, "base64")); n++;
  }
  const logs = b.logs; await b.close(); return { n, total, logs };
}
const ra = await run(A, "a"), rb = await run(B, "b");
console.log(JSON.stringify({ original: ra, astro: rb }));
