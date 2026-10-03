import { clamp, reduce } from "./core.js";

/* ---------------------------------------------------------------- inside Robinwood: the rows drift with scroll */
var ppl = document.getElementById("people"), lastPpl = -9;
function drift(){
  if (reduce.matches) return;
  var r = ppl.getBoundingClientRect(); if (r.bottom < -100 || r.top > innerHeight + 100) return;
  var v = clamp(((innerHeight - r.top) / (innerHeight + r.height)) * 2 - 1, -1, 1);
  if (Math.abs(v - lastPpl) > 0.003){ lastPpl = v; ppl.style.setProperty("--p", v.toFixed(3)); }
}
addEventListener("scroll", drift, { passive: true }); addEventListener("resize", drift); drift();

