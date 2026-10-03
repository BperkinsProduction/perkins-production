import { reduce } from "./core.js";

/* ---------------------------------------------------------------- the breath */
var hold = document.getElementById("hold"), visit = document.getElementById("visit"), steps = [].slice.call(document.querySelectorAll("#steps .step"));
var holdLabel = document.getElementById("hold-label"), breath = 0, holding = false, done = false, bRun = false, bLast = 0, lastB = -1;
function setBreath(v){
  breath = v; if (Math.abs(v - lastB) > 0.003){ lastB = v; visit.style.setProperty("--breath", v.toFixed(3)); }
  steps.forEach(function(s, i){ if (v >= (i + 1) / 4 - 0.02) s.classList.add("seen"); else if (!done) s.classList.remove("seen"); });
}
function finish(){
  done = true; holding = false; setBreath(1); hold.setAttribute("data-done", ""); holdLabel.textContent = "That's the whole visit.";
  document.getElementById("showall").hidden = true;
}
function bTick(now){
  var dt = Math.min(64, now - bLast) / 1000; bLast = now;
  if (done){ bRun = false; return; }
  if (holding) breath = Math.min(1, breath + dt / 4); else breath = Math.max(0, breath - dt / 2.4);
  setBreath(breath);
  if (breath >= 1){ finish(); bRun = false; return; }
  if (holding || breath > 0) requestAnimationFrame(bTick); else bRun = false;
}
function startHold(e){ if (done) return; if (e && e.type === "pointerdown"){ try { hold.setPointerCapture(e.pointerId); } catch(x){} } holding = true; if (!bRun){ bRun = true; bLast = performance.now(); requestAnimationFrame(bTick); } }
function endHold(){ holding = false; }
hold.addEventListener("pointerdown", function(e){ e.preventDefault(); startHold(e); });
["pointerup","pointercancel","pointerleave","lostpointercapture"].forEach(function(t){ hold.addEventListener(t, endHold); });
hold.addEventListener("keydown", function(e){ if ((e.key === " " || e.key === "Enter") && !e.repeat){ e.preventDefault(); startHold(); } });
hold.addEventListener("keyup", function(e){ if (e.key === " " || e.key === "Enter") endHold(); });
hold.addEventListener("contextmenu", function(e){ e.preventDefault(); });
document.getElementById("showall").addEventListener("click", finish);
function breathMotion(){ if (reduce.matches) finish(); }
reduce.addEventListener ? reduce.addEventListener("change", breathMotion) : reduce.addListener(breathMotion);
breathMotion();

