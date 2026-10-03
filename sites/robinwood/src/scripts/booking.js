import { DOCS, HOURS } from "../data/booking.js";
/* ---------------------------------------------------------------- booking walkthrough (a concept: nothing is sent) */
var form = document.getElementById("booker"), panes = [].slice.call(form.querySelectorAll(".pane")), prog = [].slice.call(form.querySelectorAll(".progress li"));
var next = document.getElementById("next"), backBtn = document.getElementById("back"), stepI = 0;
var S = { office: null, doc: null, day: null, time: null };
var docBox = document.getElementById("o-doc"), dayBox = document.getElementById("o-day"), timeBox = document.getElementById("o-time");
DOCS.forEach(function(d){ var b = document.createElement("button"); b.type = "button"; b.className = "opt"; b.dataset.v = d[0]; b.setAttribute("aria-pressed", "false"); b.innerHTML = "<b>" + d[0] + "</b><span>" + d[1] + "</span>"; docBox.appendChild(b); });
function pick(box, key, v, then){ box.querySelectorAll(".opt").forEach(function(o){ o.setAttribute("aria-pressed", o.dataset.v === v ? "true" : "false"); }); S[key] = v; if (then) then(); validate(); }
function fmtH(h, m){ var ap = h >= 12 ? "pm" : "am", hh = h % 12 || 12; return hh + ":" + (m ? "30" : "00") + " " + ap; }
function buildDays(){
  dayBox.innerHTML = ""; var d = new Date(); d.setHours(12, 0, 0, 0); var n = 0; S.day = null; S.time = null; timeBox.innerHTML = "";
  while (n < 10){ d.setDate(d.getDate() + 1); var w = d.getDay(); if (w === 0 || w === 6) continue; n++;
    var b = document.createElement("button"); b.type = "button"; b.className = "opt day"; b.dataset.v = d.toDateString(); b.dataset.w = w; b.setAttribute("aria-pressed", "false");
    b.innerHTML = "<span>" + d.toLocaleDateString("en-US", { weekday: "short" }) + "</span><b>" + d.getDate() + "</b><span>" + d.toLocaleDateString("en-US", { month: "short" }) + "</span>";
    dayBox.appendChild(b); }
}
function buildTimes(w){
  timeBox.innerHTML = ""; S.time = null; var h = HOURS[S.office][w === 5 ? "f" : "mt"];
  for (var t = h[0] * 2; t < h[1] * 2 - 1; t++){ var hh = Math.floor(t / 2), m = t % 2; if (hh === 12) continue;
    var b = document.createElement("button"); b.type = "button"; b.className = "opt time"; b.dataset.v = fmtH(hh, m); b.setAttribute("aria-pressed", "false"); b.textContent = fmtH(hh, m); timeBox.appendChild(b); }
}
document.getElementById("o-office").addEventListener("click", function(e){ var o = e.target.closest(".opt"); if (o) pick(this, "office", o.dataset.v, buildDays); });
docBox.addEventListener("click", function(e){ var o = e.target.closest(".opt"); if (o) pick(docBox, "doc", o.dataset.v); });
dayBox.addEventListener("click", function(e){ var o = e.target.closest(".opt"); if (o){ pick(dayBox, "day", o.dataset.v); buildTimes(+o.dataset.w); validate(); } });
timeBox.addEventListener("click", function(e){ var o = e.target.closest(".opt"); if (o) pick(timeBox, "time", o.dataset.v); });
form.addEventListener("input", validate);
function summary(){ var o = S.office ? S.office[0].toUpperCase() + S.office.slice(1) : ""; return o + " office, " + S.doc + ", " + (S.day ? new Date(S.day).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) : "") + " at " + S.time + "."; }
function validate(){
  var ok = [!!S.office, !!S.doc, !!(S.day && S.time), form.n.value.trim().length > 1 && form.p.value.replace(/\D/g, "").length >= 10][stepI];
  next.disabled = !ok;
}
function go(i){
  stepI = i; panes.forEach(function(p, j){ p.classList.toggle("cur", j === i); });
  prog.forEach(function(li, j){ li.classList.toggle("cur", j === i); li.classList.toggle("done", j < i); });
  backBtn.hidden = i === 0 || i === 4; next.hidden = i === 4; next.textContent = i === 3 ? "Request this time" : "Continue";
  if (i === 3) document.getElementById("sum").textContent = summary();
  if (i === 4){ document.getElementById("sum2").textContent = form.n.value.trim() + ", " + summary(); document.getElementById("done").focus(); }
  validate();
}
next.addEventListener("click", function(){ if (!next.disabled) go(stepI + 1); });
backBtn.addEventListener("click", function(){ go(stepI - 1); });
form.addEventListener("submit", function(e){ e.preventDefault(); if (stepI === 3 && !next.disabled) go(4); });
document.querySelectorAll("[data-office]").forEach(function(a){
  a.addEventListener("click", function(){ if (stepI < 4){ go(0); var b = form.querySelector('#o-office [data-v="' + a.dataset.office + '"]'); pick(document.getElementById("o-office"), "office", a.dataset.office, buildDays); } });
});
