import { clamp, reduce } from "./core.js";

/* ---------------------------------------------------------------- entrances and count-ups */
var io = new IntersectionObserver(function(es){
  es.forEach(function(e){ if (e.isIntersecting){ e.target.classList.add("in"); io.unobserve(e.target); if (e.target.querySelector("[data-count]")) countUp(e.target.querySelector("[data-count]")); } });
}, { rootMargin: "0px 0px -8% 0px" });
document.querySelectorAll("[data-reveal]").forEach(function(el){ io.observe(el); });
function countUp(el){
  if (reduce.matches) return;
  var to = +el.dataset.count, from = el.dataset.from ? +el.dataset.from : 0, dec = +(el.dataset.dec || 0), t0 = performance.now(), D = 1400;
  (function f(now){ var t = clamp((now - t0) / D, 0, 1), e = 1 - Math.pow(1 - t, 3); el.textContent = (from + (to - from) * e).toFixed(dec); if (t < 1) requestAnimationFrame(f); })(t0);
}

