import { clamp, reduce } from "./core.js";

/* ---------------------------------------------------------------- South Mountain's contours: background, dividers, map ring */
var drawers = [];
fetch("assets/contours.svg").then(function(r){ return r.text(); }).then(function(txt){
  var doc = new DOMParser().parseFromString(txt, "image/svg+xml"), src = doc.documentElement;
  var paths = [].slice.call(src.querySelectorAll("path"));
  function make(kind){
    var ns = "http://www.w3.org/2000/svg", svg = document.createElementNS(ns, "svg"), g = document.createElementNS(ns, "g");
    svg.setAttribute("fill", "none"); svg.setAttribute("stroke", "currentColor"); svg.setAttribute("stroke-linejoin", "round");
    if (kind === "divider"){ svg.setAttribute("viewBox", "0 205 905 150"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice"); g.setAttribute("transform", "translate(0,581) rotate(-90)"); }
    else if (kind === "ring"){ svg.setAttribute("viewBox", "0 0 905 581"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice"); g.setAttribute("transform", "translate(0,581) rotate(-90)"); }
    else { svg.setAttribute("viewBox", "0 0 581 905"); svg.setAttribute("preserveAspectRatio", "xMidYMid slice"); }
    paths.forEach(function(p, i){
      if (kind === "divider" && i % 2) return;
      var c = p.cloneNode(); c.setAttribute("vector-effect", "non-scaling-stroke"); c.setAttribute("stroke-width", kind === "env" ? "1" : "1.2");
      if (kind !== "env") c.setAttribute("pathLength", "1");
      g.appendChild(c);
    });
    svg.appendChild(g); return svg;
  }
  document.querySelectorAll("[data-contour]").forEach(function(host){
    host.appendChild(make(host.dataset.contour));
    if (host.dataset.contour !== "env") drawers.push(host);
  });
  drawLines();
}).catch(function(){});
function drawLines(){
  for (var i = 0; i < drawers.length; i++){
    var h = drawers[i], r = h.getBoundingClientRect();
    if (r.bottom < -200 || r.top > innerHeight + 200) continue;
    var p = reduce.matches ? 1 : clamp((innerHeight - r.top) / (innerHeight * 0.75), 0, 1);
    var v = p.toFixed(3); if (h.__d !== v){ h.__d = v; h.style.setProperty("--draw", v); }
  }
}
addEventListener("scroll", drawLines, { passive: true });

