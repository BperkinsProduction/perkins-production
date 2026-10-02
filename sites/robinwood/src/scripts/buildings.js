import { clamp, reduce } from "./core.js";

/* ---------------------------------------------------------------- the buildings part out of the mist */
var bsec = document.getElementById("buildings"), bcards = [].slice.call(bsec.querySelectorAll(".bldg")), lastR = [-1, -1, -1];
function partBuildings(){
  var vals = bcards.map(function(c){
    var r = reduce.matches ? 1 : clamp((innerHeight * 0.98 - c.getBoundingClientRect().top) / (innerHeight * 0.62), 0, 1);
    return r * r * (3 - 2 * r);
  });
  vals.push(Math.min.apply(null, vals));
  vals.forEach(function(v, i){
    if (Math.abs(v - lastR[i]) > 0.003){ lastR[i] = v; (i < bcards.length ? bcards[i] : bsec).style.setProperty("--r", v.toFixed(3)); }
  });
}
addEventListener("scroll", partBuildings, { passive: true }); addEventListener("resize", partBuildings); partBuildings();

