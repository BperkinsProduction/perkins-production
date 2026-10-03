import { clamp, root, smooth } from "./core.js";

/* ---------------------------------------------------------------- the scroll-driven hero */
var hero = document.getElementById("hero"), stage = document.getElementById("stage"), video = document.getElementById("heroVideo");
var bands = [].map.call(document.querySelectorAll(".band"), function(el){
  return { el: el, a: +el.dataset.a, b: +el.dataset.b, op: -1, k: -1 };
});
var b4 = document.querySelector(".e-words .big"); if (b4) b4.style.setProperty("--n", b4.querySelectorAll(".w").length);
var mqs = window.__HERO_GATES.map(function(q){ return matchMedia(q); });
function gated(){ return mqs.some(function(m){ return m.matches; }); }

var K = 0.16, target = 0, shown = 0, running = false, last = 0;
var ready = false, dur = 0, seekBusy = false, pending = null, lastSeek = -1, seekStart = 0, loading = false, failed = false;
var lastFade = -1, lastCue = -1;

function progress(){
  var r = hero.getBoundingClientRect(), span = hero.offsetHeight - innerHeight;
  return span > 0 ? clamp(-r.top / span, 0, 1) : 0;
}
function seek(t){
  if (seekBusy){ pending = t; if (performance.now() - seekStart > 600){ seekBusy = false; } else return; }
  seekBusy = true; seekStart = performance.now(); lastSeek = t;
  try { video.currentTime = t; } catch(e){ seekBusy = false; }
}
video.addEventListener("seeked", function(){
  seekBusy = false;
  if (pending !== null){ var t = pending; pending = null; if (Math.abs(t - lastSeek) > 0.001) seek(t); }
});
video.addEventListener("error", function(){ seekBusy = false; pending = null; toStatic(true); });

function render(p){
  for (var i = 0; i < bands.length; i++){
    var B = bands[i], fin = B.a === 0 ? 1 : smooth(B.a, B.a + 0.035, p), fout = B.b >= 1 ? 1 : 1 - smooth(B.b - 0.035, B.b, p);
    var op = fin * fout, k = B.a === 0 ? 1 : smooth(B.a, B.a + (B.b - B.a) * 0.5, p);
    if (Math.abs(op - B.op) > 0.002){ B.op = op; B.el.style.opacity = op.toFixed(3); B.el.classList.toggle("on", op > 0.01); }
    if (Math.abs(k - B.k) > 0.002){ B.k = k; B.el.style.setProperty("--k", k.toFixed(3)); }
  }
  var cue = 1 - smooth(0.01, 0.06, p);
  if (Math.abs(cue - lastCue) > 0.01){ lastCue = cue; stage.style.setProperty("--cue", cue.toFixed(2)); }
  var fade = smooth(0.94, 1, p);
  if (Math.abs(fade - lastFade) > 0.01){ lastFade = fade; stage.style.setProperty("--fade", fade.toFixed(2)); }
  if (ready){
    var t = p * Math.max(0, dur - 0.05);
    if (Math.abs(t - lastSeek) > 1 / 48) seek(t);
  }
}
function tick(now){
  var dt = Math.min(64, now - last); last = now;
  shown += (target - shown) * (1 - Math.pow(1 - K, dt / 16.667));
  if (Math.abs(target - shown) < 0.0004){ shown = target; running = false; }
  render(shown);
  if (running) requestAnimationFrame(tick);
}
function kick(){ if (!running){ running = true; last = performance.now(); requestAnimationFrame(tick); } }
function onScroll(){ if (!root.classList.contains("scrub")) return; target = progress(); kick(); }

function loadVideo(){
  if (loading || ready || failed) return; loading = true;
  fetch("assets/hero-scrub.mp4").then(function(r){ if (!r.ok) throw new Error("http " + r.status); return r.blob(); })
  .then(function(b){
    video.src = URL.createObjectURL(b);
    video.addEventListener("loadeddata", function(){
      dur = video.duration || 6.58; ready = true; stage.classList.add("ready");
      video.pause(); lastSeek = -1; render(shown);
    }, { once: true });
    video.load();
  }).catch(function(){ toStatic(true); });
}
function toStatic(fail){
  if (fail) failed = true;
  root.classList.remove("scrub"); running = false;
  try { video.pause(); } catch(e){}
}
function toScrub(){
  if (failed) return;
  root.classList.add("scrub"); loadVideo(); target = shown = progress(); render(shown);
}
function evaluate(){ if (gated()) toStatic(false); else toScrub(); }
mqs.forEach(function(m){ (m.addEventListener ? m.addEventListener("change", evaluate) : m.addListener(evaluate)); });
addEventListener("scroll", onScroll, { passive: true });
addEventListener("resize", onScroll);
evaluate();


export { hero, mqs };
