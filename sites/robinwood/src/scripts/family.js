import { clamp, reduce } from "./core.js";

/* ---------------------------------------------------------------- family parallax */
var fam = document.getElementById("family"), lastPar = -9;
function par(){ if (reduce.matches) return; var r = fam.getBoundingClientRect(); if (r.bottom < 0 || r.top > innerHeight) return; var v = clamp((innerHeight - r.top) / (innerHeight + r.height), 0, 1); if (Math.abs(v - lastPar) > 0.004){ lastPar = v; fam.style.setProperty("--par", v.toFixed(3)); } }
addEventListener("scroll", par, { passive: true });

